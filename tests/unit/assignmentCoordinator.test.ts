import { describe, it, expect } from 'vitest';
import {
  createAssignmentCoordinator,
  type CoordinatorDeps,
  type AssignmentMirror,
} from '../../server/session/assignmentCoordinator';
import { ASSIGNMENT_TIMEOUT_MS } from '../../server/session/assignment';
import type { Contact, ClaimResult } from '@/contact/contactSchema';
import type { Outcome } from '@/contact/outcomeSchema';

// An in-memory stand-in for Airtable. Reads and writes are async with a small
// delay so that, without the per-session mutex, concurrent claims would race the
// read-then-write — which is exactly the failure the coordinator must prevent.
//
// The all-members pool (search + join) is deliberately wider than the call batch:
// a volunteer need not be in tonight's batch to phonebank. So the batch contacts
// below are every member who is also callable, plus a couple of extra members who
// can join and search but are not in the claim pool.
function createFakeAirtable(contactCount: number, ioDelayMs = 1) {
  const contacts: Contact[] = Array.from({ length: contactCount }, (_, i) => ({
    id: `rec${i + 1}`,
    name: `Member ${String(i + 1).padStart(2, '0')}`,
    phoneNumber: `07700 9000${String(i + 1).padStart(2, '0')}`,
  }));

  // Members beyond the batch: they can identify themselves and join, but never
  // appear as a claimable contact.
  const nonBatchMembers = [
    { id: 'recVolA', name: 'Volunteer Alpha' },
    { id: 'recVolB', name: 'Volunteer Bravo' },
  ];
  const allMembers = [
    ...contacts.map((c) => ({ id: c.id, name: c.name })),
    ...nonBatchMembers,
  ];

  const locks = new Map<string, AssignmentMirror>(
    contacts.map((c) => [c.id, { assignedPhonebanker: null, claimedAt: null }]),
  );
  const logs: Array<{ contactId: string; outcome: Outcome }> = [];
  const clock = { value: Date.parse('2026-05-30T19:00:00.000Z') };
  const io = () => new Promise((resolve) => setTimeout(resolve, ioDelayMs));

  const deps: CoordinatorDeps = {
    now: () => clock.value,
    async readSession(id) {
      await io();
      return {
        id,
        organiserName: 'Organiser',
        phonebankBatch: '31-05-2026',
        callScript: '',
        smsMessage: '',
        status: 'active',
      };
    },
    async listAllMembers() {
      await io();
      return allMembers.map((m) => ({ ...m }));
    },
    async listBatchContacts() {
      await io();
      return contacts.map((contact) => ({ contact, assignment: { ...locks.get(contact.id)! } }));
    },
    async readContactAssignment(id) {
      await io();
      return { ...locks.get(id)! };
    },
    async writeContactAssignment(id, entry) {
      await io();
      locks.set(id, { ...entry });
    },
    async clearContactAssignment(id) {
      await io();
      locks.set(id, { assignedPhonebanker: null, claimedAt: null });
    },
    async writePhoneLog(log) {
      await io();
      logs.push({ contactId: log.contactId, outcome: log.outcome });
    },
    async listLoggedContacts() {
      await io();
      return logs.map((l) => ({ ...l }));
    },
  };

  return { deps, clock, locks, logs, contactIds: contacts.map((c) => c.id) };
}

const SESSION = 'recSession1';
const claimedId = (r: ClaimResult) => (r.kind === 'claimed' ? r.contact.id : undefined);

async function joinAll(coord: ReturnType<typeof createAssignmentCoordinator>, ids: string[]) {
  for (const id of ids) await coord.joinSession(SESSION, id);
}

describe('assignment coordinator — double-call defence', () => {
  it('never hands the same contact to two participants under concurrent claims', async () => {
    const { deps, contactIds } = createFakeAirtable(5);
    const coord = createAssignmentCoordinator(deps);
    await joinAll(coord, contactIds); // all five members are also volunteers

    const results = await Promise.all(
      contactIds.map((p) => coord.claimNextUnassignedContact(SESSION, p)),
    );

    const claimed = results.map(claimedId).filter(Boolean);
    expect(claimed).toHaveLength(5);
    expect(new Set(claimed).size).toBe(5); // all distinct
  });
});

describe('assignment coordinator — idempotency', () => {
  it('returns the same contact to a participant who claims again', async () => {
    const { deps, contactIds } = createFakeAirtable(5);
    const coord = createAssignmentCoordinator(deps);
    await coord.joinSession(SESSION, contactIds[0]);

    const first = await coord.claimNextUnassignedContact(SESSION, contactIds[0]);
    const second = await coord.claimNextUnassignedContact(SESSION, contactIds[0]);

    expect(first.kind).toBe('claimed');
    expect(second).toEqual(first);
  });
});

describe('assignment coordinator — list exhaustion', () => {
  it('returns list-exhausted once every contact has a terminal outcome', async () => {
    const { deps, contactIds } = createFakeAirtable(1);
    const coord = createAssignmentCoordinator(deps);
    await coord.joinSession(SESSION, contactIds[0]);

    const claim = await coord.claimNextUnassignedContact(SESSION, contactIds[0]);
    await coord.recordOutcome(SESSION, contactIds[0], {
      contactId: claimedId(claim)!,
      outcome: 'had-conversation',
    });

    const exhausted = await coord.claimNextUnassignedContact(SESSION, contactIds[0]);
    expect(exhausted.kind).toBe('list-exhausted');
  });
});

describe('assignment coordinator — skip removes the contact from the pool', () => {
  it('logs the skip and never offers that contact again this session', async () => {
    const { deps, contactIds, logs } = createFakeAirtable(2);
    const coord = createAssignmentCoordinator(deps);
    const [v1, v2] = contactIds;
    await joinAll(coord, [v1, v2]);

    const claimed = await coord.claimNextUnassignedContact(SESSION, v1);
    const skipped = claimedId(claimed)!;
    await coord.releaseContact(SESSION, v1, skipped);
    expect(logs).toContainEqual({ contactId: skipped, outcome: 'skipped' });

    // The other contact is still up for grabs — just not the skipped one.
    const next = await coord.claimNextUnassignedContact(SESSION, v2);
    expect(claimedId(next)).toBeDefined();
    expect(claimedId(next)).not.toBe(skipped);

    // Nothing left: the skipped contact is terminal, not reclaimable.
    const exhausted = await coord.claimNextUnassignedContact(SESSION, v1);
    expect(exhausted.kind).toBe('list-exhausted');
  });
});

describe('assignment coordinator — survives a restart', () => {
  it('does not re-offer a contact already logged (completed or skipped) before the restart', async () => {
    // A redeploy tears down the coordinator's in-memory state and rebuilds it from
    // deps.listLoggedContacts on the next hydrate — this models that by handing the
    // same fake Airtable (same `logs`) to a brand-new coordinator instance.
    const { deps, contactIds } = createFakeAirtable(3);
    const coord1 = createAssignmentCoordinator(deps);
    const [v1, v2, v3] = contactIds;
    await joinAll(coord1, [v1, v2, v3]);

    const first = await coord1.claimNextUnassignedContact(SESSION, v1);
    await coord1.recordOutcome(SESSION, v1, { contactId: claimedId(first)!, outcome: 'had-conversation' });

    const second = await coord1.claimNextUnassignedContact(SESSION, v2);
    await coord1.releaseContact(SESSION, v2, claimedId(second)!);

    const coord2 = createAssignmentCoordinator(deps); // "redeploy"
    await joinAll(coord2, [v1, v2, v3]);

    const third = await coord2.claimNextUnassignedContact(SESSION, v3);
    expect(claimedId(third)).not.toBe(claimedId(first));
    expect(claimedId(third)).not.toBe(claimedId(second));

    const exhausted = await coord2.claimNextUnassignedContact(SESSION, v1);
    expect(exhausted.kind).toBe('list-exhausted');
  });
});

describe('assignment coordinator — 30-minute timeout', () => {
  it('returns a timed-out claim to the pool for another participant', async () => {
    const { deps, clock, contactIds } = createFakeAirtable(2);
    const coord = createAssignmentCoordinator(deps);
    const [v1, v2] = contactIds;
    await joinAll(coord, [v1, v2]);

    const claimed = await coord.claimNextUnassignedContact(SESSION, v1);
    const lapsed = claimedId(claimed)!;

    clock.value += ASSIGNMENT_TIMEOUT_MS + 1; // v1's claim lapses

    const state = await coord.getState(SESSION, v1);
    expect(state.claim.kind).toBe('idle'); // v1 no longer holds it

    const reclaimed = await coord.claimNextUnassignedContact(SESSION, v2);
    expect(claimedId(reclaimed)).toBe(lapsed);
  });
});

describe('assignment coordinator — burn-down', () => {
  it('counts logged outcomes and reaches exhausted', async () => {
    const { deps, contactIds } = createFakeAirtable(3);
    const coord = createAssignmentCoordinator(deps);
    await coord.joinSession(SESSION, contactIds[0]);

    for (let i = 0; i < contactIds.length; i++) {
      const claim = await coord.claimNextUnassignedContact(SESSION, contactIds[0]);
      expect(claim.kind).toBe('claimed');
      const state = await coord.getState(SESSION, contactIds[0]);
      expect(state.progress).toEqual({ total: 3, called: i });
      await coord.recordOutcome(SESSION, contactIds[0], {
        contactId: claimedId(claim)!,
        outcome: 'had-conversation',
      });
    }

    const finalState = await coord.getState(SESSION, contactIds[0]);
    expect(finalState.progress).toEqual({ total: 3, called: 3 });
    expect(finalState.claim.kind).toBe('exhausted');
  });
});

describe('assignment coordinator — gates', () => {
  it('rejects state reads from an unregistered participant', async () => {
    const { deps } = createFakeAirtable(2);
    const coord = createAssignmentCoordinator(deps);
    await expect(coord.getState(SESSION, 'stranger')).rejects.toThrow();
  });

  it('enforces the 4-character minimum and top-5 bound on member search', async () => {
    const { deps } = createFakeAirtable(10);
    const coord = createAssignmentCoordinator(deps);

    const tooShort = await coord.searchMembers(SESSION, 'Mem');
    expect(tooShort.matches).toHaveLength(0);

    const broad = await coord.searchMembers(SESSION, 'Memb');
    expect(broad.matches.length).toBeLessThanOrEqual(5);
    expect(broad.truncated).toBe(true);
  });
});

describe('assignment coordinator — fuzzy member search', () => {
  // A minimal fake that only exposes the members the coordinator needs for search.
  function fakeDepsForSearch(names: string[]): CoordinatorDeps {
    const members = names.map((name, i) => ({ id: `rec${i}`, name }));
    return {
      now: () => Date.now(),
      readSession: async () => ({
        id: SESSION,
        organiserName: 'O',
        phonebankBatch: 'x',
        callScript: '',
        smsMessage: '',
        status: 'active',
      }),
      listAllMembers: async () => members.map((m) => ({ ...m })),
      listBatchContacts: async () => [],
      readContactAssignment: async () => ({ assignedPhonebanker: null, claimedAt: null }),
      writeContactAssignment: async () => {},
      clearContactAssignment: async () => {},
      writePhoneLog: async () => {},
      listLoggedContacts: async () => [],
    };
  }

  it('matches members with extra whitespace in the stored name', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['salla  tanskanen ']));
    const result = await coord.searchMembers(SESSION, 'salla tansk');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('salla  tanskanen ');
  });

  it('matches an email-as-name record by the local part', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['sj2812@gmail.com ']));
    const result = await coord.searchMembers(SESSION, 'sj2812');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('sj2812@gmail.com ');
  });

  it('matches underscore-separated tokens with space-separated query', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['sandra_tan476@hotmail.com ']));
    const result = await coord.searchMembers(SESSION, 'sandra tan');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('sandra_tan476@hotmail.com ');
  });

  it('matches query tokens in any order', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['samira larouci']));
    const result = await coord.searchMembers(SESSION, 'larouci samira');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('samira larouci');
  });

  it('rejects when one query token is absent', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['sam winter']));
    const result = await coord.searchMembers(SESSION, 'sam summer');
    expect(result.matches).toHaveLength(0);
  });

  it('returns nothing when query matches only a stripped email domain', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['strifeles@gmail.com ']));
    // "gmail" is stripped with the email, so only "strifeles" remains searchable.
    // Searching for "gmailc" (6+ chars) should find nothing.
    const result = await coord.searchMembers(SESSION, 'gmailc');
    expect(result.matches).toHaveLength(0);
  });

  it('scores prefix matches higher than substring matches', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch([
      'samantha chchch',
      'sam charlton',
    ]));
    const result = await coord.searchMembers(SESSION, 'sam ch');
    expect(result.matches).toHaveLength(2);
    // 'sam charlton': 'sam' prefix-matches first token 'sam' (0), 'ch' prefix-matches 'charlton' (1) → score 1
    // 'samantha chchch': 'sam' substring-matches 'samantha' (2), 'ch' prefix-matches 'chchch' (1) → score 2
    expect(result.matches[0].name).toBe('sam charlton');
    expect(result.matches[1].name).toBe('samantha chchch');
  });

  it('handles duplicate tokens in the stored name', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['soulinake@gmail.com soulinake@gmail.com']));
    const result = await coord.searchMembers(SESSION, 'soulinak');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('soulinake@gmail.com soulinake@gmail.com');
  });

  it('matches diacritics-insensitive as before', async () => {
    const coord = createAssignmentCoordinator(fakeDepsForSearch(['seán ó briain']));
    // 'sean bria' tokenizes to ['sean', 'bria'] — both prefix-match the stored tokens
    const result = await coord.searchMembers(SESSION, 'sean bria');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe('seán ó briain');
  });
});
