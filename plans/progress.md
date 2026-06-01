# Progress

A running status check on the Phonebanker service. Updated as features land or
gaps appear. Two questions only: **what works** and **what doesn't (yet)**.

Last updated: 2026-06-01 (conformance follow-up — C1, M1, M6, N1–N3 landed)

---

## What the service can do now

**Organiser session setup (end-to-end, writes to Airtable).**
The organiser identifies themselves, enters the batch tag for tonight's call
list, writes the call script in markdown, writes the SMS/voicemail message with
template variable insertion, reviews the whole session, and submits. A real
record is created in the Airtable `Phonebank Sessions` table with
`Created by`, `phonebankBatch`, `callScript`, `smsMessage`, and
`status='active'`. The organiser receives a shareable join URL of the form
`/session/{airtableRecordId}`.

**Batch validation for session setup.**
`POST /api/batches/count` returns how many Members carry a typed batch tag,
backed by the live base. The organiser confirms a non-zero count before
creating the session — zero means a typo or an untagged batch.

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
- `POST /api/sessions/:id/members/search` searches the whole membership
  with a 6-character minimum, top-5 cap, and diacritic-normalised
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
The Vitest suite covers concurrent claims, idempotency, list exhaustion,
skip/release, 30-minute timeout, burn-down, participant gates, search
bounds, and schema validation. An env-gated Playwright HTTP concurrency
test exists for a pre-seeded Airtable session. As of the 2026-06-01 follow-up the
suite is green again — `npm run lint`, `tsc`, and all 10 Vitest cases pass — so
the double-call proof is re-armed (C1 resolved).

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

**Automated e2e concurrency in CI.**
The Playwright concurrency spec is present, but it requires
`E2E_SESSION_ID` and `E2E_MEMBER_IDS` pointing at a pre-seeded Airtable
session. No CI-safe test base is wired yet.

---

## Known shortcomings (to pick up separately)

Logged from the 2026-06-01 conformance review — full detail, doc/code refs,
and severity triage live in [conformance-review.md](conformance-review.md).
Listed worst-first.

**Resolved in the 2026-06-01 follow-up**
- ✅ **Build green again** — the test fake gained `listAllMembers`; lint, `tsc`,
  and 10/10 Vitest pass, re-arming the double-call proof. (C1)
- ✅ **Search scope documented** — membership-wide search confirmed intended; the
  security and data docs now describe the join gate as union-wide, not batch-scoped,
  with the enumeration threat row reconciled to the larger pool. (M1)
- ✅ **Outcome-button semantics** — added positive/neutral/caution Button variants
  bound to green/slate/red tokens, each with an icon; the card now matches the
  Figma severity coding and honours "no colour-only meaning". (M6)
- ✅ **Docs re-baselined onto batches** — views→batches terminology swept from the
  tech docs and this file; route table lists `POST /api/batches/count`; stale
  `sessionId` comment in `schema.ts` corrected. (N1–N3)

**Still open — Major**
- **Contact payload over-exposes PII**: the full Member record (~12 fields incl.
  free-text notes, membership number) is shipped to the browser though the card
  renders four. Project `fields[]` to the documented set. (M2)
- **Members data model doc has drifted** from the live base (the data-and-airtable
  table has since been rewritten to match; verify it's complete). (M3)
- **Debug logging of PII** — `console.log` of member-name search fragments left
  in the coordinator. Remove. (M4)
- **Phonebanker flow is not mobile-first** — zero `@media` in the app; container
  is a desktop `max-width` cap with no gutter (card runs edge-to-edge at 401px).
  Establish the mobile base; reframe the cap as the desktop adjustment. (M5)

**Still open — Minor / doc-stale**
- Contact-card visual gaps vs. the hi-fi Figma (header, phone treatment, script
  container); `/next` rate limiting unimplemented. (N4–N5)

**Build-time reference question.** The contact card has drifted from the Figma on
most axes, suggesting it was built from the wireframe + data model and never
reconciled to the hi-fi design. Decide which artifact is authoritative before
fixing the visual items one by one.

---

**Phonebanker foundation (Segment 0) — the contract and shell.**
The nine-route API surface is reconciled to [tech-stack.md](../docs/tech/tech-stack.md);
all phonebanker schemas exist; the `phonebankerStore` and `Phonebanker` router
shell are in place; the unused `appStore` was removed. Segments A, B1, and B2
have replaced all route mocks and screen placeholders with full implementations.

---

## What's next

Segments A, B1, and B2 are functionally in place. The 2026-06-01 conformance
review surfaced shortcomings that come before new feature work; C1, M1, M6, and
N1–N3 have since landed (see above and [conformance-review.md](conformance-review.md)).
Remaining order: the two live privacy fixes (M2, M4) → verify the M3 data-model
doc rewrite is complete → mobile-first pass (M5) → contact-card visual fidelity
and `/next` rate limiting (N4, N5). Automated e2e CI for the concurrency tests
remains after that.
