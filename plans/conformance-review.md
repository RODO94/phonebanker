# Conformance Review — implementation vs. design & tech docs

A risk-prioritised audit of the Phonebanker implementation against the docs in
`docs/design/` and `docs/tech/`. Every divergence is collected and triaged by
**severity of drift**, not by which side is "right" — the report is a planning
input for future refinement, not a fix list. No code was changed.

Reviewed: 2026-06-01, against `main` @ `b1983b7` plus the uncommitted working
tree (an in-flight views→batches refactor touching the coordinator, deps,
schema, and `AssignedContact`).

Ground truth run at review time:
- `npm run lint` (tsc -b) — **FAILS**
- `tsc -p tsconfig.app.json` / `tsconfig.server.json` — **FAILS**
- `npx vitest run` — **7 failed / 3 passed (10)**

---

## Severity summary

| Severity | Count | Meaning |
|----------|-------|---------|
| **Critical** | 1 | Load-bearing safety/privacy/correctness guarantee currently contradicted |
| **Major** | 6 | Documented contract/behaviour wrong or absent; would mislead a maintainer |
| **Minor / doc-stale** | 5 | Behaviour intact; docs or comments describe an older world |
| **Conforms** | 8 | Verified to match the docs — recorded so the next pass can trust them |

The dominant theme: a **views → batches migration** is half-landed. The docs
universally describe the organiser selecting an *Airtable View*; the code has
replaced that with a hand-typed *batch tag* on the Member record because
"Views can't be queried outside Airtable Enterprise" (`server/airtable/schema.ts:28`).
That single discovered constraint cascades into most of the findings below.

---

## CRITICAL

### C1 — The working tree does not build or pass tests; `progress.md` claims it does
- **Docs:** `plans/progress.md:72` — "`npm run lint` is clean… passes 10/10 unit tests".
- **Code:** `tests/unit/assignmentCoordinator.test.ts:32` — the in-memory fake
  omits `listAllMembers`, which the refactor added to `CoordinatorDeps`
  (`server/session/assignmentCoordinator.ts:28`). Result: tsc fails, lint fails,
  and 7/10 vitest cases throw `deps.listAllMembers is not a function`
  (`server/session/assignmentCoordinator.ts:83`).
- **Verdict:** diverges. **Severity: Critical.**
- **Why it matters:** the concurrency and timeout guarantees (track 1 below) are
  *proven by exactly these tests*. With the suite red, the double-call defence
  is currently **unverified**, not just untested. The fake also carries a stale
  comment (`tests/unit/assignmentCoordinator.test.ts:16`) asserting "the member
  directory *is* the session's view" — an invariant the refactor deliberately broke.
- **Recommendation:** code-side. Add `listAllMembers` to the fake and decide
  whether the fake should model an all-members pool distinct from the batch.
  This is in-flight work, not rot — but the green state the docs assert is false today.

---

## MAJOR

### M1 — Member search scope widened from session view to the entire member base
- **Docs:** `docs/tech/security-and-trust.md:8` and `docs/tech/data-and-airtable.md:71`
  model the join search as bounded to the session's directory ("the session's
  Airtable view, loaded lazily"). The two-gate trust model assumes the search
  pool is the session list.
- **Code:** `server/session/assignmentCoordinator.ts:160` now searches
  `memberDirectory` — populated from `listAllMembers()`
  (`server/session/airtableCoordinatorDeps.ts:56`), i.e. **every Member in the base**,
  not the batch. `joinSession` (`assignmentCoordinator.ts:174`) gates on the same
  full directory.
- **Verdict:** diverges. **Severity: Major.**
- **Why it matters:** this is arguably *more* correct — a volunteer who phonebanks
  need not be in tonight's call batch, and the old view-only gate would have
  locked them out. But it changes the documented data-exposure surface: the
  searchable pool is now the whole membership. The anti-enumeration bounds
  (6-char min, top-5, no pagination) still hold over the wider pool.
- **Recommendation:** doc-side decision needed. Confirm "search all members" is
  intended, then update the security/data docs to describe the gate as
  membership-wide, and reconcile the threat-model enumeration row against the
  larger pool.

### M2 — The contact payload ships far more PII than the card renders or the docs list
- **Docs:** `docs/tech/data-and-airtable.md:119` — "Minimum exposure"; the card
  is documented as Name, Phone, Tenancy type, Contact type, Last call summary
  (`docs/design/design-principles.md:31`).
- **Code:** `listBatchContacts` sets no `fields[]` projection
  (`server/session/airtableCoordinatorDeps.ts:66`), so the full Member record is
  fetched and `toContact` maps ~12 fields into the `Contact`
  (`server/contact/contactMapper.ts:9`, `src/contact/contactSchema.ts:3`):
  `notes`, `membershipNumber`, `tags`, `invitedToWhatsApp`, `hadInitialOneToOne`,
  `newMemberCallDone`, `phoneCallAvailability`, `dateEnteredInDatabase`. All of
  it crosses the proxy to the browser, though `AssignedContact.tsx` renders only
  name, phone, `contactType`, and `summary`.
- **Verdict:** diverges. **Severity: Major.**
- **Why it matters:** the GDPR "minimum exposure" posture is the whole point of
  one-contact-at-a-time. Shipping the full record (including free-text `notes`
  and membership number) to the client undercuts it even if the UI hides the fields.
- **Recommendation:** code-side. Project `fields[]` to the documented card set in
  `listBatchContacts`, or trim in `toContact`. Then re-baseline the docs' field list.

### M3 — Members table data model has drifted from `data-and-airtable.md`
- **Docs:** `docs/tech/data-and-airtable.md:11` — Members has Name, Phone number,
  Tenancy type, Contact type, Last call summary, **Assigned phonebanker (Link to
  Members)**, **Claimed at**.
- **Code:** the real field map (`src/contact/contactFields.ts`,
  `server/airtable/schema.ts:29`) has **no Tenancy type**; adds `Tags (group/branch)`,
  `Phone call availability`, `# membership number`, three onboarding booleans,
  `Date entered in database`; the lock field is `Assigned phone banker (group/branch)`
  as **plain text** holding a recordId (not a Link — `server/airtable/schema.ts:35`),
  and the timestamp is `phoned_at`, not "Claimed at".
- **Verdict:** diverges. **Severity: Major.**
- **Why it matters:** the doc's table is the contract Zod is supposed to defend.
  The "Assigned phonebanker = Link to Members" claim in particular feeds the
  doc's GDPR cascade reasoning; the real lock is a transient text field, so that
  reasoning only holds for the Phone Logs `Phonebanker` link (which *is* a link —
  `server/session/airtableCoordinatorDeps.ts:121` — and conforms).
- **Recommendation:** doc-side. Rewrite the Members table to match the live base;
  note that the lock is text-on-Member by design and the durable audit link lives
  on Phone Logs.

### M4 — Left-in debug logging of search queries (member-name fragments)
- **Docs:** `docs/tech/security-and-trust.md:41` describes a deliberate audit
  posture and explicitly chooses *not* to log incidental events.
- **Code:** `server/session/assignmentCoordinator.ts:155` —
  `console.log('searchMembers', sessionId, query, needle)` logs raw name
  fragments on every search; plus `console.error` dumps in `buildState`
  (`assignmentCoordinator.ts:101`) and `listBatchContacts`
  (`airtableCoordinatorDeps.ts:80`).
- **Verdict:** diverges. **Severity: Major** (PII in logs) — almost certainly
  refactor residue.
- **Recommendation:** code-side. Remove the `searchMembers` log; downgrade the
  error logs to a structured logger that doesn't echo query text.

### M5 — The phonebanker flow is not mobile-first; it is desktop-capped with no responsive layer
- **Docs:** `docs/tech/tech-stack.md:53` — "**Mobile-first.** Default styles are
  the mobile layout; `@media (min-width: ...)` adds desktop adjustments… the
  volunteer screen is mobile-first." Reinforced by `docs/design/wireframes-contact-card.md:3`
  ("Mobile-first; desktop notes at the end") and the hard constraint
  `docs/design/scope.md:66` ("Must work well on mobile").
- **Code:** there is **exactly one** `@media` rule in all of `src/`, and it is on
  the landing route (`src/routes/index.css:33`) — **zero** in the phonebanker or
  organiser flows. The phonebanker container is a single desktop cap with no
  fluid gutter (`src/phonebanker/Phonebanker.css:3` — `max-width: 32rem; margin: 0 auto;`),
  and `AssignedContact.css` uses fixed paddings (52px phone box, 16px script,
  240px script max-height) with no breakpoint adaptation.
- **Observed at 401px** (user screenshot): the card runs edge-to-edge with no
  horizontal page padding — the layout was authored at the capped width and never
  given a mobile base, which is the inverse of the documented "mobile base +
  desktop `@media`" structure.
- **Verdict:** diverges. **Severity: Major.** Mobile is a *hard* scope constraint,
  not a nicety — phonebankers call from their phones — so "works but ungutter­ed
  and unadapted on a 401px screen" misses the one device that matters most.
- **Recommendation:** code-side. Establish the mobile base (page gutter on the
  container, fluid paddings) as the default, and reframe the `max-width` cap as
  the `@media (min-width: …)` desktop adjustment the doc describes. This is the
  pattern the index route already follows and the rest of the app does not.

### M6 — Outcome buttons invert and collapse the design's colour + icon semantics
- **Docs / source of truth:** the hi-fi Figma frame for this screen
  ([node 0-236](https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-236&m=dev))
  colour-codes the three outcomes by severity, each with an icon: **Had a
  conversation = green + ✓**, **No answer = slate grey + ✗**, **Wants to be
  removed = red + 🚫**. `docs/design/design-principles.md:22` mandates "no
  colour-only meaning — add an icon or label alongside."
- **Code:** `AssignedContact.tsx:257-280` maps the outcomes onto the generic
  Button variants: `variant="primary"` (red) for **Had a conversation**, and an
  identical `variant="secondary"` (grey) for **both** No answer and Wants to be
  removed; no icons anywhere. The Button component has no green/slate/red
  semantic set to map onto.
- **Verdict:** diverges. **Severity: Major.**
- **Why it matters:** the positive primary action renders in the *alarm* colour
  (red), training the wrong instinct, while the most consequential, member-facing
  action ("Wants to be removed") is visually indistinguishable from the benign
  "No answer." On a care-sensitive union tool this is a usability and trust
  misfire, and it breaches the "no colour-only meaning" rule from both ends —
  the build carries neither the design's colours nor its icons.
- **Recommendation:** code-side, but it needs a design-system decision first:
  the outcome buttons need a semantic variant set (positive / neutral / caution)
  with bound colour tokens and icons, rather than borrowing primary/secondary.
  Confirm the green/slate/red mapping against `colors.css` tokens.

---

## MINOR / DOC-STALE

### N1 — views → batches terminology and dead references throughout the docs
- `GET /api/views` (`docs/tech/tech-stack.md:120`), `viewName`/`Airtable view`
  (`docs/tech/data-and-airtable.md:33`, `plans/progress.md:18`), and the paths
  `src/organiser/viewsSchema.ts` / `server/views/` (`tech-stack.md:124,165`) do
  not exist. The real surface is `src/batch/`, `server/batches/`, and a
  `BatchEntry` organiser step. **Doc-stale**, pervasive but behaviour-neutral.

### N2 — API contract: the 9th route is `POST /api/batches/count`, not `GET /api/views`
- **Docs:** `docs/tech/tech-stack.md:110` lists nine routes ending in `GET /api/views`.
- **Code:** the eight `/api/sessions` routes match exactly — names, methods,
  the `ClaimResult` discriminated union, and the 404/401/502 error mapping
  (`server/session/sessionRoutes.ts`). The ninth is `POST /api/batches/count`
  (`server/batches/batchesRoutes.ts:11`), serving the organiser's pre-create
  batch-size check. **Doc-stale.** Recommendation: update the route table.

### N3 — Stale comment in `schema.ts` after the uncommitted `sessionId` removal
- `server/airtable/schema.ts:40-43` still describes a `sessionId` plain-text
  mirror on Phone Logs; the working-tree edit removed that field and switched
  `listLoggedContacts` to filter the `Session` link via `FIND(ARRAYJOIN(...))`
  (`server/session/airtableCoordinatorDeps.ts:132`). Comment now contradicts its
  own code. **Minor.** Recommendation: delete the stale lines.

### N4 — Contact-card visual fidelity gaps vs. the hi-fi design
- **Source of truth:** `docs/design/wireframes-contact-card.md` and the Figma
  frame [node 0-236](https://www.figma.com/design/2bSUA8wuI0nY6E3eN0Cesd/Phonebanker?node-id=0-236&m=dev).
- **Code:** `src/phonebanker/steps/AssignedContact/AssignedContact.tsx`.
- Gaps confirmed against the Figma render:
  - **No persistent header.** The design has a black "LRU Phonebank" bar with
    "12 of 47" top-right and a green progress bar; the build has no brand header
    and burn-down is an inline `<p>` (`AssignedContact.tsx:252`).
  - **Phone is under-emphasised.** Design: a prominent green filled button with a
    phone icon (the second-largest element per `wireframes-contact-card.md:76`).
    Build: a plain outline box, no icon (`AssignedContact.css:74`).
  - **Metadata.** Design shows "Private renter · Full member" as plain secondary
    text; build shows a single bordered `contactType` chip (tenancy is gone with M3).
  - **Call script container.** Design renders the script plain on white; build
    wraps it in a cream callout box (`AssignedContact.css:170`).
  - **Summary collapse** fires at 200 chars (`AssignedContact.tsx:224`) vs. the
    doc's ~120 (`wireframes-contact-card.md:31`).
  - (Outcome-button colour/icon semantics are tracked separately as M6.)
- Conforms within the card: `tel:` link, copy-SMS, "X of Y called", outcome order
  (Conversation / No answer / Removed), Skip as a low-emphasis link. Font roles
  (sans display, mono UI) follow the documented token decision in `progress.md`,
  a deliberate post-Figma deviation rather than a defect.
- **Verdict:** partial. **Severity: Minor** (layout/affordance polish; the
  meaning-bearing colour issue is escalated to M6). Recommendation: design-side
  call on which of these are MVP vs. deferred.

### N5 — Rate limiting on `/next` (and server-side on search) is not implemented
- **Docs:** `docs/tech/security-and-trust.md:20,52` lists a rate-limited
  "next contact" (proposed 1/5s, TBC) as a scraping mitigation.
- **Code:** no rate limiter on `POST /:id/next` (`server/session/sessionRoutes.ts:89`);
  search is bounded only by UX (debounce/min-length) client-side.
- **Verdict:** absent, but the doc self-labels it "proposed / TBC". **Severity:
  Minor (known gap).** Recommendation: either implement or move the doc rows from
  "what we do" to "open questions".

---

## CONFORMS (verified — safe for the next pass to trust)

1. **Double-call defence** — single writer, per-session `async-mutex`, and
   read-then-write re-validated against Airtable *inside* the mutex, exactly as
   `security-and-trust.md:66` specifies (`assignmentCoordinator.ts:209-240`).
   *(Caveat: proven only by the tests currently failing under C1.)*
2. **Idempotent re-claim** — a participant already holding a live claim gets the
   same contact back (`assignmentCoordinator.ts:217`).
3. **30-minute lazy expiry**, rebuilt from `phoned_at` on hydration, no background
   timer — matches `data-and-airtable.md:76` (`server/session/assignment.ts:1`).
4. **Error → HTTP mapping** 404/401/502 + 500 fallback matches `tech-stack.md:96`
   (`sessionRoutes.ts:20`).
5. **No localStorage of PII** — the phonebanker store is explicitly un-persisted,
   matching the GDPR "deliberate forgetting" posture (`phonebankerStore.ts:41`).
6. **Identity model** — `participantId = member.recordId`, carried as the
   `X-Participant-Id` header, lost on refresh by design (`sessionRoutes.ts:14`,
   `phonebankerStore.ts:24`). Matches `security-and-trust.md:55`.
7. **Phone Logs audit links** — Session / Contact / Phonebanker written as Airtable
   links, supporting the GDPR null-on-delete cascade (`airtableCoordinatorDeps.ts:114`).
8. **Search bounds** — 6-char minimum, top-5, no pagination, diacritic-stripped
   matching, all server-side (`assignmentCoordinator.ts:61,160`). Hold over the
   wider pool from M1.

---

## Suggested order for the follow-up

1. **C1** — green the build (unblocks everything and re-arms the concurrency proof).
2. **M2 + M4** — the two live GDPR/privacy regressions (over-exposed payload,
   PII in logs); both are small code fixes.
3. **M1** — decide search scope, then write the decision into the security doc.
4. **M6** — outcome-button colour/icon semantics; a design-system decision plus a
   small wiring change, and a real usability/trust issue on the main screen.
5. **M5** — the mobile-first CSS pass; contained code work against a hard scope
   constraint, and the index route already shows the pattern to copy.
6. **M3 + N1–N3** — one documentation pass to re-baseline data model, routes, and
   terminology onto the batches reality.
7. **N4 + N5** — design and product calls; defer-or-do, no urgency.
