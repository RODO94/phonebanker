# Progress

A running status check on the Phonebanker service. Updated as features land or
gaps appear. Two questions only: **what works** and **what doesn't (yet)**.

Last updated: 2026-05-30 (Segments A, B1, B2 — complete)

---

## What the service can do now

**Organiser session setup (end-to-end, writes to Airtable).**
The organiser identifies themselves, picks an Airtable view of Members,
writes the call script in markdown, writes the SMS/voicemail message with
template variable insertion, reviews the whole session, and submits. A real
record is created in the Airtable `Phonebank Sessions` table with
`Created by`, `viewId`, `viewName`, `callScript`, `smsMessage`, and
`status='active'`. The organiser receives a shareable join URL of the form
`/session/{airtableRecordId}`.

**View listing for session setup.**
`GET /api/views` returns a mocked list of Airtable views the organiser
selects from. Mock data only — not yet fetched from the live base.

**Design system foundation.**
Typography + colour tokens established; `Button`, `Textarea`, and the
in-flow single-line input pattern match the Figma reference. Geist Mono
is the default UI font; Geist is reserved for display + subtitle roles.

**Env-driven Airtable wiring.**
Server reads `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` from `.env` via
the native `--env-file` flag. The Sessions table is targeted by ID
(`tblGtfTz6ybQVm2I0`) so renames don't break the write.

**Phonebanker server truth (Segment A).**
All seven Segment A routes are live and backed by the real assignment
coordinator:

- `GET /api/sessions/:id` reads the session from Airtable.
- `POST /api/sessions/:id/members/search` searches the session's member
  view with a 6-character minimum, top-5 cap, and diacritic-normalised
  matching.
- `POST /api/sessions/:id/join` registers the selected member as the
  participant and returns their `participantId`.
- `GET /api/sessions/:id/state` returns the polling envelope: current
  claim state plus burn-down progress.
- `POST /api/sessions/:id/next` claims the next available contact,
  serialised by a per-session `async-mutex` and re-checked against
  Airtable before writing the lock.
- `POST /api/sessions/:id/log` writes a phone log, clears the assignment,
  and marks the contact completed.
- `POST /api/sessions/:id/skip` writes a skipped log, clears the
  assignment, and returns the contact to the pool.

`X-Participant-Id` is the final participant identity header for authed
phonebanker calls. It remains non-persistent by design and is rebuilt by
re-joining after refresh.

**Assignment coordinator and Airtable adapter.**
The coordinator is dependency-injected and testable against an in-memory
fake. The Airtable adapter owns paginated contact reads, session reads,
assignment lock writes, lock clears, and `Phone Logs` writes. Raw Airtable
Member records are mapped through `ContactSchema` so field drift fails at
the boundary.

**Concurrency, idempotency, and timeout behaviour.**
The claim loop is idempotent per participant, prevents duplicate claims
under concurrent requests, supports skip/release back to the pool, counts
terminal outcomes into burn-down, and lazily expires live claims after 30
minutes without a background timer.

**Tests.**
`npm run lint` is clean. `npx vitest run --reporter=verbose` passes 10/10
unit tests, covering concurrent claims, idempotency, list exhaustion,
skip/release, 30-minute timeout, burn-down, participant gates, search
bounds, and schema validation. An env-gated Playwright HTTP concurrency
test exists for a pre-seeded Airtable session.

**Phonebanker entry screens (Segment B1).**
The Join screen implements debounced member search (6-char floor, top-5
results), join with participant registration, session-status gate, and
claim-state-driven step transitions. AlreadyJoined shows a resumption
interstitial for two-device/tab-crash scenarios. SessionEnded provides
honest copy and a link back to the organiser flow.

**Phonebanker call-loop screens (Segment B2).**
AssignedContact renders the full contact card (name, tel: link,
collapsible summary, call script via `marked`, copy-SMS button,
burn-down counter, outcome buttons). NoAnswerFollowUp captures
message-sent flagging. WantsRemoved confirms the flag with
organiser-expectation copy. Done shows a celebration with stats.
All screens include 10-second polling, optimistic transitions, and
error recovery with retry.

---

## What the service cannot do yet

**View listing for session setup.**
`GET /api/views` is still mock-only. The organiser view picker does not
yet fetch live Airtable views.

**Automated e2e concurrency in CI.**
The Playwright concurrency spec is present, but it requires
`E2E_SESSION_ID` and `E2E_MEMBER_IDS` pointing at a pre-seeded Airtable
session. No CI-safe test base is wired yet.

---

**Phonebanker foundation (Segment 0) — the contract and shell.**
The nine-route API surface is reconciled to [tech-stack.md](../docs/tech/tech-stack.md);
all phonebanker schemas exist; the `phonebankerStore` and `Phonebanker` router
shell are in place; the unused `appStore` was removed. Segments A, B1, and B2
have replaced all route mocks and screen placeholders with full implementations.

---

## What's next

Segments A, B1, and B2 are complete. All seven phonebanker screens and
all server routes are live. The remaining work is an automated e2e CI path
for the concurrency tests.
