# Progress

A running status check on the Phonebanker service. Updated as features land or
gaps appear. Two questions only: **what works** and **what doesn't (yet)**.

Last updated: 2026-05-30

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

---

## What the service cannot do yet

**The phonebanker join flow.**
The `/session/{id}` URL does not yet resolve to a usable screen. There is
no member-search gate, no participant registration, no resolution of
`participantId = member.recordId`. Route exists; UI does not.

**Reading from a real Members table.**
`GET /api/views` is mock-only. There is no `/api/sessions/:id/members` (or
equivalent) that fetches the Members view referenced by the Session
record. The phonebanker side has no real data to operate on.

**Contact assignment and locking.**
The "claim next unassigned contact" loop is unwritten. `server/session/
assignment.ts` is a placeholder Map and a timeout constant — no mutex,
no Airtable read-then-write on the `Assigned phonebanker` field, no
30-minute timeout queue.

**Outcome logging.**
No writes to a `Phone Logs` table. The four route stubs
(`/:id/join`, `/:id/next`, `/:id/log`, `/:id/skip`) all return 501.

**Cross-tab and multi-device sync.**
Polling is unimplemented. No participant registry, no in-memory mirror
of assignments.

**Session lifecycle in app.**
`status` defaults to `'active'` on create but nothing reads it. There is
no "this session has ended" page; an expired/ended status will not be
honoured by the join route until that route exists.

**Tests.**
No vitest coverage on the session route's Airtable write; no Playwright
coverage of any concurrent-session scenario (those are mandatory per the
feature cheatsheet for anything touching assignment, which doesn't exist
yet to be tested).

---

**Phonebanker foundation (Segment 0) — the contract and shell.**
The nine-route API surface is reconciled to [tech-stack.md](../docs/tech/tech-stack.md);
all phonebanker schemas exist (`joinSchema`, `sessionStateSchema`, `assignmentSchema`,
`ClaimResult`, `outcomeSchema`, tightened `SessionStatus`). The `phonebankerStore`
and `Phonebanker` router shell are in place with seven screen placeholders behind a
step machine, mounted at `/session/:id`. Server routes return schema-valid mocks so
the screens can be built against real HTTP. `npm run lint` is clean. The unused
`appStore` was removed.

---

## What's next

The work is cut into three segments that build against the Segment 0 contract.
Read **[segment-0-foundation.md](segment-0-foundation.md)** first — it carries the
contract, the resolved decisions, the screen→step map, and a per-segment kickoff
guide. Sequence: **A (server truth) → B1 (entry screens) → B2 (call loop)**, each
in a fresh session.
