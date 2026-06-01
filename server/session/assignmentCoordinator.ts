import { Mutex } from 'async-mutex';
import { isClaimLive } from './assignment.js';
import { ParticipantNotRegisteredError } from './errors.js';
import type { Session } from '../../src/session/sessionSchema.js';
import type { Contact, ClaimResult } from '../../src/contact/contactSchema.js';
import type { Assignment } from '../../src/assignment/assignmentSchema.js';
import type { SessionStateResponse } from '../../src/session/sessionStateSchema.js';
import type { JoinResponse, MemberSearchResponse } from '../../src/session/joinSchema.js';
import type { Outcome, LogOutcome } from '../../src/contact/outcomeSchema.js';

// What the coordinator knows about a single contact's lock. `assignedPhonebanker`
// is the holder's member recordId (null when free); `claimedAt` feeds lazy expiry.
export type AssignmentMirror = {
  assignedPhonebanker: string | null;
  claimedAt: string | null;
};

// A logged outcome, as read back on hydration to rebuild the burn-down count.
export type LoggedContact = { contactId: string; outcome: Outcome };

// The coordinator's whole dependency on the outside world. Injected so the
// concurrency, idempotency, skip and timeout guarantees can be exercised against
// an in-memory fake; the Airtable-backed implementation lives in
// airtableCoordinatorDeps.ts. `now` is a dependency so expiry is deterministic.
export type CoordinatorDeps = {
  now: () => number;
  readSession: (sessionId: string) => Promise<Session>;
  listBatchContacts: (
    batch: string,
  ) => Promise<Array<{ contact: Contact; assignment: AssignmentMirror }>>;
  readContactAssignment: (contactId: string) => Promise<AssignmentMirror>;
  writeContactAssignment: (
    contactId: string,
    entry: { assignedPhonebanker: string; claimedAt: string },
  ) => Promise<void>;
  clearContactAssignment: (contactId: string) => Promise<void>;
  writePhoneLog: (log: {
    sessionId: string;
    contactId: string;
    phonebankerId: string;
    outcome: Outcome;
    messageSent?: boolean;
  }) => Promise<void>;
  listLoggedContacts: (sessionId: string) => Promise<LoggedContact[]>;
};

// The per-session state held in process memory, keyed by sessionId. Never evicted
// during the process lifetime — restart is the eviction mechanism, and every
// field is rebuilt by hydrate() on first touch, so nothing here is load-bearing.
type SessionState = {
  session: Session;
  mutex: Mutex;
  participants: Set<string>; // joined member recordIds
  directory: Map<string, Contact>; // contactId → contact, in view order
  mirror: Map<string, AssignmentMirror>; // contactId → current lock
  completed: Set<string>; // contactIds with a terminal (non-skip) log
};

const MIN_SEARCH_LENGTH = 6;
const MAX_SEARCH_RESULTS = 5;

// Lowercase, diacritic-stripped, trimmed — the comparison form for member search.
function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function createAssignmentCoordinator(deps: CoordinatorDeps) {
  const sessions = new Map<string, SessionState>();
  // De-duplicates concurrent first-touches so two requests can't both hydrate the
  // same session and clobber each other's participant registry.
  const hydrating = new Map<string, Promise<SessionState>>();

  async function buildState(sessionId: string): Promise<SessionState> {

    const session = await deps.readSession(sessionId); // throws SessionNotFoundError
    const contacts = await deps.listBatchContacts(session.phonebankBatch);
    const directory = new Map<string, Contact>();
    const mirror = new Map<string, AssignmentMirror>();
    for (const { contact, assignment } of contacts) {
      directory.set(contact.id, contact);
      mirror.set(contact.id, assignment);
    }
    const completed = new Set<string>();
    for (const { contactId, outcome } of await deps.listLoggedContacts(sessionId)) {
      if (outcome !== 'skipped') completed.add(contactId);
    }
    return { session, mutex: new Mutex(), participants: new Set(), directory, mirror, completed };
  }

  async function hydrate(sessionId: string): Promise<SessionState> {
    const existing = sessions.get(sessionId);
    if (existing) return existing;
    const inFlight = hydrating.get(sessionId);
    if (inFlight) return inFlight;

    const build = (async () => {
      try {
        const state = await buildState(sessionId);
        sessions.set(sessionId, state);
        return state;
      } finally {
        hydrating.delete(sessionId);
      }
    })();
    hydrating.set(sessionId, build);
    return build;
  }

  function requireParticipant(state: SessionState, participantId: string): void {
    if (!state.participants.has(participantId)) throw new ParticipantNotRegisteredError();
  }

  // The contactId this participant currently, validly holds — or null. Drives both
  // claim idempotency (return the same contact) and the polling 'assigned' state.
  function liveClaimFor(state: SessionState, participantId: string): string | null {
    for (const [contactId, lock] of state.mirror) {
      if (
        lock.assignedPhonebanker === participantId &&
        !state.completed.has(contactId) &&
        isClaimLive(lock.claimedAt, deps.now())
      ) {
        return contactId;
      }
    }
    return null;
  }

  // GET /:id — a light read for the SessionEnded gate; deliberately does not load
  // the directory, so an ended session is cheap to detect.
  async function getSession(sessionId: string): Promise<Session> {
    const existing = sessions.get(sessionId);
    return existing ? existing.session : deps.readSession(sessionId);
  }

  async function searchMembers(sessionId: string, query: string): Promise<MemberSearchResponse> {
    const state = await hydrate(sessionId);
    const needle = normalise(query);

    // The GDPR / anti-enumeration floor: short queries return nothing server-side.
    if (needle.length < MIN_SEARCH_LENGTH) return { matches: [], truncated: false };

    const hits = [...state.directory.values()].filter((c) => normalise(c.name).includes(needle));
    hits.sort((a, b) => {
      const aLeads = normalise(a.name).startsWith(needle) ? 0 : 1;
      const bLeads = normalise(b.name).startsWith(needle) ? 0 : 1;
      return aLeads !== bLeads ? aLeads - bLeads : a.name.localeCompare(b.name);
    });
    return {
      matches: hits.slice(0, MAX_SEARCH_RESULTS).map((c) => ({ id: c.id, name: c.name })),
      truncated: hits.length > MAX_SEARCH_RESULTS,
    };
  }

  async function joinSession(sessionId: string, memberId: string): Promise<JoinResponse> {
    const state = await hydrate(sessionId);
    const member = state.directory.get(memberId);
    // Not in the view = not a recognised member for this session: fails the gate.
    if (!member) throw new ParticipantNotRegisteredError('member is not in this session');
    state.participants.add(memberId);
    return { participantId: memberId, displayName: member.name };
  }

  async function getState(
    sessionId: string,
    participantId: string,
  ): Promise<SessionStateResponse> {
    const state = await hydrate(sessionId);
    requireParticipant(state, participantId);

    const progress = { total: state.directory.size, called: state.completed.size };
    const held = liveClaimFor(state, participantId);
    if (held) {
      const assignment: Assignment = {
        contact: state.directory.get(held)!,
        claimedAt: state.mirror.get(held)!.claimedAt!,
        sessionId,
        participantId,
      };
      return { progress, claim: { kind: 'assigned', assignment } };
    }
    if (state.completed.size >= state.directory.size) {
      return { progress, claim: { kind: 'exhausted' } };
    }
    return { progress, claim: { kind: 'idle' } };
  }

  // The double-call defence. Serialised per session by the mutex; inside it, each
  // candidate is re-validated against Airtable before the claim is written, so two
  // participants can never walk away holding the same contact.
  async function claimNextUnassignedContact(
    sessionId: string,
    participantId: string,
  ): Promise<ClaimResult> {
    const state = await hydrate(sessionId);
    requireParticipant(state, participantId);

    return state.mutex.runExclusive(async () => {
      const held = liveClaimFor(state, participantId);
      if (held) return { kind: 'claimed', contact: state.directory.get(held)! };

      for (const contact of state.directory.values()) {
        if (state.completed.has(contact.id)) continue;
        const lock = state.mirror.get(contact.id);
        if (lock?.assignedPhonebanker && isClaimLive(lock.claimedAt, deps.now())) continue;

        // Re-read against Airtable: the mirror may be stale relative to another
        // session sharing the base, or a write we haven't observed yet.
        const fresh = await deps.readContactAssignment(contact.id);
        if (fresh.assignedPhonebanker && isClaimLive(fresh.claimedAt, deps.now())) {
          state.mirror.set(contact.id, fresh);
          continue;
        }

        const claimedAt = new Date(deps.now()).toISOString();
        await deps.writeContactAssignment(contact.id, { assignedPhonebanker: participantId, claimedAt });
        state.mirror.set(contact.id, { assignedPhonebanker: participantId, claimedAt });
        return { kind: 'claimed', contact };
      }
      return { kind: 'list-exhausted' };
    });
  }

  async function recordOutcome(
    sessionId: string,
    participantId: string,
    log: { contactId: string; outcome: LogOutcome; messageSent?: boolean },
  ): Promise<void> {
    const state = await hydrate(sessionId);
    requireParticipant(state, participantId);
    await state.mutex.runExclusive(async () => {
      await deps.writePhoneLog({ sessionId, phonebankerId: participantId, ...log });
      await deps.clearContactAssignment(log.contactId);
      state.mirror.set(log.contactId, { assignedPhonebanker: null, claimedAt: null });
      state.completed.add(log.contactId); // a terminal outcome — counts toward burn-down
    });
  }

  // Skip: log the Skipped outcome for the audit trail, then return the contact to
  // the pool. Deliberately not marked completed — someone still needs to call them.
  async function releaseContact(
    sessionId: string,
    participantId: string,
    contactId: string,
  ): Promise<void> {
    const state = await hydrate(sessionId);
    requireParticipant(state, participantId);
    await state.mutex.runExclusive(async () => {
      await deps.writePhoneLog({ sessionId, contactId, phonebankerId: participantId, outcome: 'skipped' });
      await deps.clearContactAssignment(contactId);
      state.mirror.set(contactId, { assignedPhonebanker: null, claimedAt: null });
    });
  }

  return {
    getSession,
    searchMembers,
    joinSession,
    getState,
    claimNextUnassignedContact,
    recordOutcome,
    releaseContact,
  };
}

export type AssignmentCoordinator = ReturnType<typeof createAssignmentCoordinator>;
