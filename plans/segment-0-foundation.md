# Segment 0 — Foundation (the contract every other segment builds on)

This is the handoff artifact for the phonebanker phase. It exists so Segments A,
B1, and B2 can each be built in a **fresh Claude Code session** without re-reading
the whole design corpus or re-deriving decisions. Read this first; then read only
the cheatsheet sections named for your segment.

Status: **landed.** Schemas, the store/router shell, the seven screen placeholders,
and schema-valid stub routes are in place and type-check (`npm run lint` clean).
The app compiles and serves; every screen renders a labelled placeholder.

---

## The four decisions (previously open — now resolved)

**Participant identity carrier.** `participantId` (= member recordId) lives in the
Zustand store and is sent as a **request header** on every authed call. Not a
cookie, not a query param: cookies contradict the "no persistent identity" boundary
([security-and-trust.md](../docs/tech/security-and-trust.md)) and the deliberate
refresh-forgetting; query params leak the recordId into logs and history. Lost on
refresh by design — rebuilt by re-join. Header name to finalise in Segment A
(suggest `X-Participant-Id`); B1/B2 read it from the store and pass it through.

**Polling cadence: 10 seconds.** Polling hits the in-memory mirror, not Airtable
([tech-stack.md:86](../docs/tech/tech-stack.md)), so Airtable quota is *not* the
constraint — perceived liveness vs. noise is, and ambient burn-down updates
tolerate 10s comfortably.

**`/next` semantics: two endpoints.** `GET /:id/state` is the idempotent polling
read (your current claim + burn-down); `POST /:id/next` mutates (claim a contact,
idempotent per participant). "Your already-assigned contact" comes from `/state`;
"claim a new one" from `/next`.

**Script + message: fetched once at join.** `GET /:id` returns the session
(script + SMS message); cached in the store's `session` field; the contact card
reads from the store, never re-fetches. Lost on refresh, re-fetched on re-join.

---

## The contract — nine routes

Source of truth: [tech-stack.md § Hono route groups](../docs/tech/tech-stack.md).
The plan's older list (`GET /next`, no `/state`, no `/members/search`) is
**superseded** by this table.

| Method & path | Request schema | Response schema | Built by |
|---|---|---|---|
| `POST /api/sessions` | `CreateSessionRequestSchema` | `SessionSchema` | ✅ done |
| `GET /api/sessions/:id` | — | `SessionSchema` | Segment A |
| `POST /api/sessions/:id/members/search` | `MemberSearchRequestSchema` | `MemberSearchResponseSchema` | Segment A |
| `POST /api/sessions/:id/join` | `JoinRequestSchema` | `JoinResponseSchema` | Segment A |
| `GET /api/sessions/:id/state` | — (participant header) | `SessionStateResponseSchema` | Segment A |
| `POST /api/sessions/:id/next` | — (participant header) | `ClaimResultSchema` | Segment A |
| `POST /api/sessions/:id/log` | `LogRequestSchema` | `OkResponseSchema` | Segment A |
| `POST /api/sessions/:id/skip` | `SkipRequestSchema` | `OkResponseSchema` | Segment A |
| `GET /api/views` | — | `ViewListSchema` | ✅ done |

All handlers except the two ✅ are **Segment-0 mocks** in
[server/session/sessionRoutes.ts](../server/session/sessionRoutes.ts) returning
schema-valid data. B1/B2 build against these; Segment A replaces them with the
real coordinator. `async-mutex` is **not yet installed** — Segment A adds it.

### Schema file map

| File | Exports |
|---|---|
| [src/session/sessionSchema.ts](../src/session/sessionSchema.ts) | `Session`, `SessionStatus` (`active`/`ended`/`expired`), `CreateSessionRequest` |
| [src/session/joinSchema.ts](../src/session/joinSchema.ts) | `MemberMatch`, `MemberSearchRequest/Response`, `JoinRequest/Response` |
| [src/session/sessionStateSchema.ts](../src/session/sessionStateSchema.ts) | `ClaimState` (assigned/idle/exhausted), `SessionStateResponse` |
| [src/assignment/assignmentSchema.ts](../src/assignment/assignmentSchema.ts) | `Assignment` (contact + claimedAt + sessionId + participantId) |
| [src/contact/contactSchema.ts](../src/contact/contactSchema.ts) | `Contact`, `ClaimResult` (claimed/list-exhausted) |
| [src/contact/outcomeSchema.ts](../src/contact/outcomeSchema.ts) | `Outcome`, `LogOutcome`, `LogRequest`, `SkipRequest`, `OkResponse` |
| [src/contact/progressSchema.ts](../src/contact/progressSchema.ts) | `Progress` |

Server imports these via relative `../../src/*.js`; client code uses the `@/` alias.

---

## Screens → store steps → Figma → owner

The store ([phonebankerStore.ts](../src/phonebanker/phonebankerStore.ts)) exposes
`PHONEBANKER_STEPS`. The shell ([Phonebanker.tsx](../src/phonebanker/Phonebanker.tsx))
renders one screen per step. Each placeholder lives in its own folder; **fill the
body, do not edit the shell or the store enum** — that is what keeps B1 and B2
from colliding.

| Step | Screen | Figma node | Segment |
|---|---|---|---|
| `join` | Join (member search) | `0-216` | B1 |
| `alreadyJoined` | Already Joined | `0-392` | B1 |
| `sessionEnded` | Session Ended | — (copy only) | B1 |
| `assigned` | AssignedContact (+ OutcomeButtons `0-290`) | `0-236` | B2 |
| `noAnswerFollowUp` | No-answer follow-up | `0-315` | B2 |
| `wantsRemoved` | Wants to be removed | `0-342` | B2 |
| `done` | Done / celebration | `0-364` | B2 |

### How server responses drive the step

- After `POST /join` succeeds → call `GET /state`:
  - `claim.kind === 'assigned'` → set `currentContact`, go to **`assigned`** (or
    **`alreadyJoined`** — see open question below)
  - `claim.kind === 'idle'` → `POST /next` to claim the first contact
  - `claim.kind === 'exhausted'` → **`done`**
- `POST /next` → `claimed` → **`assigned`**; `list-exhausted` → **`done`**
- `GET /:id` on mount → `status !== 'active'` → **`sessionEnded`**
- Outcome on the card: `no-answer` → **`noAnswerFollowUp`**; `wants-removed` →
  **`wantsRemoved`**; `had-conversation`/skip → log, then `POST /next`.

---

## Open question for Segment B1 (needs the Figma + a position)

**When does join lead to `alreadyJoined` vs `assigned`?** Both are reached when
`/state` returns `claim.kind === 'assigned'` right after join. The distinction is
UX, not data: `alreadyJoined` is the *acknowledgement* that you're resuming an
existing claim (second device / tab-crash recovery — see
[users-and-journeys.md](../docs/design/users-and-journeys.md) "uses two devices at
once"), whereas `assigned` is the working card. Candidate rule: if the join
response indicates the participant was *already registered* (not freshly added),
route to `alreadyJoined` as an interstitial that then continues to `assigned`.
Confirm against Figma `0-392` before building — the frame decides whether it's an
interstitial or a terminal state.

---

## What Segment 0 deliberately did NOT do

- No transition logic — the store has setters; screens own the wiring.
- No real server — stubs only; Segment A owns the coordinator, mutex, Airtable
  reads/writes, and the concurrency tests.
- No Figma fetch — each screen's frame is pulled **once, inside the segment that
  builds it** (`get_design_context` on the node), never duplicated.
- No screen CSS beyond a container — co-located CSS is a screen-segment concern.
- Removed `src/store/appStore.ts` — unused, and its `phonebankerName` *string*
  contradicted the `participantId = recordId` model. `phonebankerStore` replaces it.

---

## Kickoff per segment (read only what you need — token discipline)

**Segment A — Server truth.** Read [tech-stack.md](../docs/tech/tech-stack.md)
(coordinator + routes), [data-and-airtable.md](../docs/tech/data-and-airtable.md),
[security-and-trust.md § double-call](../docs/tech/security-and-trust.md), and the
cheatsheet's *Session state / assignment* + *Multi-device* sections. Install
`async-mutex`. Owns `server/session/*`, `server/airtable/*`, `server/contact/*`,
`tests/`. Concurrency Playwright scenarios are mandatory.

**Segment B1 — Entry screens** (`join`, `alreadyJoined`, `sessionEnded`). Read the
cheatsheet's *Join flow / member identity* + *Volunteer-facing screen* + *Copy*
sections and the docs they link. Owns `src/phonebanker/steps/Join`,
`.../AlreadyJoined`, `.../SessionEnded`. Builds against the stub routes.

**Segment B2 — Call loop** (`assigned`, `noAnswerFollowUp`, `wantsRemoved`,
`done`). Read the cheatsheet's *Member data display*, *Outcome capture*,
*Volunteer-facing screen*, and *Network / failure* sections plus
[wireframes-contact-card.md](../docs/design/wireframes-contact-card.md). Owns the
remaining `src/phonebanker/steps/*`. Builds against the stub routes; final e2e
verification waits on Segment A.

Sequence (time is free, tokens are scarce): **A → B1 → B2**, each a fresh session,
each updating [progress.md](progress.md) as the handoff.
