# Plan — Phonebanker Join + Call Tracking

The next phase of the service: a volunteer opens a join link, identifies
themselves against the Members table, is handed contacts one at a time, and
logs an outcome per call. Outcomes write back to Airtable. Two volunteers on
the same session must never see the same contact.

This is the entire phonebanker-facing surface. It is also where most of the
load-bearing complexity of the app lives — the lock semantics, the GDPR
posture, the polling model. The organiser flow was a wizard; this is a
coordinator.

Source docs to keep open while building:
[data-and-airtable.md](../docs/tech/data-and-airtable.md),
[users-and-journeys.md](../docs/design/users-and-journeys.md) (Journey 2),
[wireframes-contact-card.md](../docs/design/wireframes-contact-card.md),
[security-and-trust.md](../docs/tech/security-and-trust.md),
[feature-cheatsheet.md](../docs/feature-cheatsheet.md) (sections: Volunteer-facing,
Outcome capture, Member data display, Session state, Multi-device, Join flow).

---

## Scope of this phase

In: join via member search → assigned contact card → outcome log → next
contact → celebration when the list is empty. Skip is a first-class outcome.
The 30-minute claim timeout. Airtable writes for Phone Logs. Server-side
mutex for assignment.

Out: organiser live dashboard, real-time websockets (polling only), full
outcome form, in-app SMS/calling, phonebanker accounts.

---

## Frontend file layout

Mirror the `src/organiser/` shape — co-located by domain, action-oriented
names, no shared abstractions until earned. Single-task screens stacked
behind a small store.

```
src/phonebanker/
  Phonebanker.tsx              # Top-level route component; reads step + renders one screen
  Phonebanker.css
  phonebankerStore.ts          # Zustand: step, participantId, currentContact, lastOutcome
  steps/
    Join/
      Join.tsx                 # Member search; 6-char min, 2s debounce, top-5 results
      Join.css
    Searching/                 # Optional — may inline into Join. Decide after first build.
    AssignedContact/
      AssignedContact.tsx      # The contact card; phone tel: link, script, outcome buttons
      AssignedContact.css
      OutcomeButtons.tsx       # Stacked full-width buttons; thumb zone
    NoAnswerFollowUp/
      NoAnswerFollowUp.tsx     # "Did you send the message?" Yes/No micro-flow
      NoAnswerFollowUp.css
    Done/
      Done.tsx                 # Celebration screen; list complete
      Done.css
    SessionEnded/
      SessionEnded.tsx         # Honest copy when status != 'active' or link expired
```

The join route already exists at [src/routes/session.$sessionId.tsx](../src/routes/session.$sessionId.tsx) — that file
mounts `<Phonebanker sessionId={...} />` and the rest is store-driven, same
shape as `Organiser`.

A new domain folder is also needed for the assigned-contact payload — the
shape the server hands back when a phonebanker claims:

```
src/assignment/
  assignmentSchema.ts          # Zod: { contact: Contact, claimedAt: string, sessionId, participantId }
```

Existing pieces to lean on: `src/contact/contactSchema.ts` already defines
the Contact shape; `src/shared/api/apiFetch.ts` already does the
Zod-validated fetch.

---

## Server file layout

```
server/session/
  sessionRoutes.ts             # Already exists. Fill in the four 501 stubs.
  assignment.ts                # Already exists as stub. This is where the mutex lives.
  airtableMembers.ts           # NEW. Read Members from the session's view.
  airtablePhoneLog.ts          # NEW. Write Phone Logs.
server/contact/
  mockContacts.ts              # Already exists. Will become a fallback for local dev.
```

Routes to implement (all stubs today):

```
POST   /api/sessions/:id/join         body: { name }            → { participantId, displayName }
GET    /api/sessions/:id/next         (uses participantId)      → { assignment } | { done: true }
POST   /api/sessions/:id/log          body: { outcome, ... }    → { ok: true }
POST   /api/sessions/:id/skip         body: { contactId }       → { ok: true }
GET    /api/sessions/:id              (already stubbed)         → { script, message, viewName, status }
```

The participant identity comes from the body on `/join` (the typed name) and
the bounded search resolves it to a Member recordId. After that, every
subsequent call carries the participantId — likely as a header or a cookie
set by `/join`. Pick one and stick with it; this is a real design decision,
not a detail. (See _Open questions_.)

---

## Key design points — the load-bearing decisions

**Identity is `participantId = member.recordId`, set at join.**
There are no device tokens, no name strings carried forward. The same
volunteer on two tabs or two devices is one participant. `claimNextContact`
is idempotent on participantId — both tabs see the same assigned contact;
either can log it. See [data-and-airtable.md § Multi-device](../docs/tech/data-and-airtable.md).

**Member search is bounded by GDPR posture, not by ergonomics.**
6-char minimum, 2-second debounce, top-5 returned, alphabetised within
rank (prefix > substring-on-word-boundary > substring-anywhere). Zero
results uses **two distinct messages** — see
[feature-cheatsheet.md § Join flow](../docs/feature-cheatsheet.md). Don't compress them.

**Assignment is mutex-guarded read-then-write against Airtable.**
The lock field lives on the Member record (`Assigned phonebanker`,
`Claimed at`). The per-session async mutex serialises claim operations.
Without it, two volunteers polling simultaneously can both read
`Assigned phonebanker = null`, both write their own recordId, and only
the last write wins — silently. `async-mutex` is the package called out
in the docs; not yet installed.

**Airtable is the source of truth; the in-memory mirror is a read cache.**
Polling reads (~5–10s) hit the mirror. Writes always validate against
Airtable inside the mutex; the mirror is updated *after* the Airtable
write succeeds. Never write to the mirror first and reconcile — that's
how silent corruption begins.

**The 30-minute timeout is durable across server restarts.**
Rebuilt by reading `Claimed at` from Airtable on `SessionState` hydration.
No in-memory state is load-bearing for timeout correctness. This means
the timeout queue is reconstructable, but the rehydration code must
actually exist — easy to forget until the first deploy.

**Outcomes are idempotent per (session, contact).**
Repeat taps must not double-log. The server checks for an existing Phone
Log on that pair before writing. Optimistic UI on the client (counter
advances on tap; quiet recovery on failure) — see
[feature-cheatsheet.md § Outcome capture](../docs/feature-cheatsheet.md).

**One contact per screen, ever.**
No list view, no search across contacts, no scrollback to previously-called
contacts. The card disappears on outcome log. Phonebanker can only see
the contact they are assigned to. GDPR floor — see
[security-and-trust.md](../docs/tech/security-and-trust.md).

**Don't trust `status='active'` is in memory.**
The Session record's status lives in Airtable; the join route must read
it (cache for the session lifetime) and reject join when ended/expired
with the honest "this session has ended" copy. The lifecycle UI for an
organiser to end the session is out of scope for this phase — they
flip it manually in Airtable for now.

---

## Open questions to resolve before coding

**Participant identity carrier between requests.**
After `/join` resolves participantId, how does the client send it on
every subsequent call? Options: cookie set by the server, `Authorization`
bearer-style header, or query param. Cookie is closest to "no auth, no
device tokens" feel; header is simplest to test. Pick one.

**Polling cadence.**
The docs say "~5–10s" — converge on a number before writing the client.
Faster reads improve perceived liveness; slower reads reduce Airtable
quota burn. There is no per-base rate limit known to be tight here, but
"every 2 seconds" across N volunteers ≠ "every 10 seconds".

**How `GET /api/sessions/:id/next` distinguishes "your already-assigned
contact" from "claim a new one".**
Idempotency demands both behaviours from one endpoint, or it demands
two. Two endpoints is honest about the difference (`GET /current`,
`POST /claim`). One endpoint reads cleaner from the client. Decide.

**Where does the script + message come from?**
On every contact card render, or once per session join + cached in the
phonebanker store? The session record is small; one fetch on join is the
obvious play.

---

## Sequencing

A reasonable order to build, each step independently shippable enough to
verify in dev:

1. `GET /api/sessions/:id` returning real session data from Airtable.
   Honour `status` on the join route — render `SessionEnded` for anything
   not `'active'`. Cheapest win, isolates the lifecycle gate.

2. Read Members via the session's view → power member search. Implement
   `POST /api/sessions/:id/join` end-to-end. Land the `Join` screen.

3. Stand up `assignment.ts` for real: mutex, in-memory mirror, the
   read-then-write claim. Wire `GET /api/sessions/:id/next`. Render
   `AssignedContact` with mocked outcome buttons.

4. Outcome logging: `POST /api/sessions/:id/log`, `POST /api/sessions/:id/skip`,
   the Phone Log write, the assignment release. Land the
   `NoAnswerFollowUp` micro-flow inside `AssignedContact`.

5. Polling, multi-device idempotency, the 30-minute timeout queue with
   hydration on first touch.

6. `Done` screen when the view is exhausted. Empty-state copy.

Tests join the work at step 3 onwards — anything earlier than the mutex
is too thin to be worth Playwright; from step 3 onwards, the
concurrent-session scenarios are mandatory.

---

## What we're deliberately *not* doing

- Real-time sync (websockets). Polling only.
- Phonebanker accounts, magic links, persistent identity across sessions.
- The full structured outcome form. Four outcomes only.
- An organiser-facing dashboard. Organisers read Phone Logs in Airtable.
- A `Session Assignments` join table. Lock stays on the Member record.
  We accept the "non-overlapping views for concurrent sessions" constraint
  named in [data-and-airtable.md](../docs/tech/data-and-airtable.md).
