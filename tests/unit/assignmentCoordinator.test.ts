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
      return logs.filter((l) => l.outcome !== 'skipped');
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

describe('assignment coordinator — skip returns the contact to the pool', () => {
  it('lets another participant claim a released contact and logs the skip', async () => {
    const { deps, contactIds, logs } = createFakeAirtable(2);
    const coord = createAssignmentCoordinator(deps);
    const [v1, v2] = contactIds;
    await joinAll(coord, [v1, v2]);

    const claimed = await coord.claimNextUnassignedContact(SESSION, v1);
    const released = claimedId(claimed)!;
    await coord.releaseContact(SESSION, v1, released);

    const reclaimed = await coord.claimNextUnassignedContact(SESSION, v2);
    expect(claimedId(reclaimed)).toBe(released);
    expect(logs).toContainEqual({ contactId: released, outcome: 'skipped' });
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

  it('enforces the 6-character minimum and top-5 bound on member search', async () => {
    const { deps } = createFakeAirtable(10);
    const coord = createAssignmentCoordinator(deps);

    const tooShort = await coord.searchMembers(SESSION, 'Mem');
    expect(tooShort.matches).toHaveLength(0);

    const broad = await coord.searchMembers(SESSION, 'Member');
    expect(broad.matches.length).toBeLessThanOrEqual(5);
    expect(broad.truncated).toBe(true);
  });
});
