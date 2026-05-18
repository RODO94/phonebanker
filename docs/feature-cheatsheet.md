# Feature Cheatsheet

Quick reference for building any feature in Phonebanker. Skim the relevant section, hit the linked docs only when you need the detail. Each section follows the same shape: **what triggers it → things to consider → where to read more**.

> **Always do these four, every feature:**
>
> 1. **Check [scope.md](design/scope.md)** — is it in MVP, future backlog, or out of scope? Don't build out-of-scope work.
> 2. **Read [design-principles.md](design/design-principles.md)** — one task per screen, plain English, accessibility floor (WCAG AA, 44px taps, 16px text).
> 3. **Match the tone** — warm, direct, no corporate language ([design-principles.md § Tone of voice](design/design-principles.md)).
> 4. **Don't store PII locally** — fetch from Airtable per request ([data-and-airtable.md § GDPR](tech/data-and-airtable.md)).

---

## 🧑‍🤝‍🧑 Volunteer-facing screen

> Anything a phonebanker sees during a session — contact card, join screen, celebration, error states.

**Consider:**
- One thing per screen — if you're showing two tasks, split them
- Primary action in the thumb zone (bottom of mobile screen, full-width button)
- Tap target ≥ 44px; primary actions larger
- No colour-only meaning — always pair with icon or label
- The volunteer may have a phone to their ear — design for split attention
- No countdowns, no auto-advancing animations
- Loading / empty / error states are part of the feature, not afterthoughts

**Read more:**
- [design/design-principles.md](design/design-principles.md) — accessibility, key patterns
- [design/wireframes-contact-card.md](design/wireframes-contact-card.md) — pattern reference for states
- [design/users-and-journeys.md](design/users-and-journeys.md) — Journey 2

---

## 👤 Organiser-facing flow

> Session setup, sharing the join link, ending a session, anything desktop-first.

**Consider:**
- Multi-step is OK here, but each step is still **one thing**
- Desktop-first; max content width ~640px; outcome buttons stay full-width within column
- Organiser may also be phonebanking — don't assume they have full attention either
- Honest copy when something is a manual follow-up (e.g. "An organiser will update preferences tomorrow")
- Keep Airtable as the source of truth — don't replicate organiser tools the app shouldn't own (reporting, member editing)

**Read more:**
- [design/users-and-journeys.md](design/users-and-journeys.md) — Journey 1
- [design/service-blueprint.md](design/service-blueprint.md) — stages 2 (Prep), 3 (Kick-off), 5 (Wind-down), 6 (Follow-up)
- [design/scope.md](design/scope.md) — what the organiser does NOT do in MVP

---

## ✍️ Outcome capture / Airtable write

> Anything that logs a call, sets `assigned_phonebanker`, or writes to Airtable.

**Consider:**
- Use the agreed outcome set: **Had a conversation / Wants to be removed / No answer / Skipped**
- "No answer" requires the `Message sent` boolean follow-up — don't shortcut
- "Wants to be removed" is a **flag for organiser**, not an auto-update of member preferences — copy must say so
- Every write also clears `assigned_phonebanker` on the Member record
- Optimistic UI: counter advances on tap; recover quietly if the write fails
- All API responses validated through a Zod schema before use

**Read more:**
- [tech/data-and-airtable.md](tech/data-and-airtable.md) — Phone Logs schema, outcomes table, data flow
- [tech/tech-stack.md](tech/tech-stack.md) — Hono routes, Zod validation
- [design/wireframes-contact-card.md](design/wireframes-contact-card.md) — states B, C, D for outcome flows

---

## 🔒 Member data display (any PII on screen)

> Any feature that puts a member's name, phone, tenancy, contact type, or last-call summary on screen.

**Consider:**
- One contact per screen — never a list, search, or table for phonebankers
- No export, download, print, or "copy all"
- `last call summary` may contain anything — surface it as-is but don't assume it's safe to repeat aloud
- Phone number is a `tel:` link on mobile — large, tappable
- Volunteer must be **assigned** to that contact to see it (no peeking at others' contacts)
- Card disappears on outcome log — no scrollback to previously-called contacts

**Read more:**
- [tech/data-and-airtable.md](tech/data-and-airtable.md) — GDPR considerations
- [tech/security-and-trust.md](tech/security-and-trust.md) — member data sensitivity, threat model
- [design/users-and-journeys.md](design/users-and-journeys.md) — "What phonebankers never see"

---

## 🔄 Session state / assignment

> Anything that touches who-is-calling-whom, the 30-min timeout, or the next-contact handout.

**Consider:**
- Assignments belong to **participants**, not tabs — a participant may have N device tokens
- A contact is locked the moment it's assigned (`assigned_phonebanker` written immediately)
- 30-min timeout returns the contact to the pool and clears the field
- Skip = release immediately + log "Skipped"
- Server holds in-memory only assignment timestamps + participants; Airtable is the durable store
- Idempotent on outcome submission per (session, contact) — repeat taps must not double-log

**Read more:**
- [design/users-and-journeys.md](design/users-and-journeys.md) — edge cases (drop-off, multi-device, tab crash)
- [tech/data-and-airtable.md](tech/data-and-airtable.md) — app-managed state
- [tech/tech-stack.md](tech/tech-stack.md) — Hono session state section

---

## 📱 Multi-device / cross-tab sync

> Anything where two open tabs need to agree on state.

**Consider:**
- Identity is `participantId = member.recordId`. Same member on two devices is the same participant on both — no disambiguation prompt, no device tokens to reconcile.
- Sync via polling (~5–10s) — no websockets in MVP
- `claimNextUnassignedContact` is idempotent per participant: both tabs see the same assigned contact; either tab can log the outcome; the other catches up on next poll
- Tab-crash recovery uses the same path: rejoin via member search → same recordId → idempotent claim returns the still-locked contact

**Read more:**
- [design/users-and-journeys.md](design/users-and-journeys.md) — edge case "Phonebanker uses two devices at once"
- [tech/security-and-trust.md](tech/security-and-trust.md) — member identity and the join-link trust model
- [design/scope.md](design/scope.md) — MVP polling vs. future real-time sync

---

## 🪪 Join flow / member identity

> The member-search step at session join — anything that resolves a volunteer to a participant.

**Consider:**
- Search activates only after **6 characters** typed; debounced 2 seconds after the last keystroke, or submitted on Enter / Search button
- Server-side resolver returns at most **5 matches**, ranked prefix > substring-on-word-boundary > substring-anywhere, alphabetised within rank
- Normalise lower-case and strip diacritics for matching only; display the original casing
- Zero results uses **two distinct messages**: "We couldn't find that name — try a different spelling" if the query looks like a real name attempt; "You may not be on our member list — speak to the organiser" once it's clear the search isn't finding anyone. Don't compress them.
- Over-five matches: silently truncate and show a "type more letters to narrow down" hint. No pagination — browsing the directory is not the affordance.
- Non-members cannot proceed past the join screen. The "speak to the organiser" message is the route, not an error.
- The selected member's recordId becomes `participantId` for the rest of the session. It is the audit identity in Phone Logs.

**Read more:**
- [tech/security-and-trust.md](tech/security-and-trust.md) — trust model, join-link's load-bearing role
- [design/users-and-journeys.md](design/users-and-journeys.md) — Journey 2 (phonebanker join)
- [tech/data-and-airtable.md](tech/data-and-airtable.md) — Members table, recordId as identity

---

## 🌐 Network / failure handling

> Any feature that calls Airtable, the proxy, or could fail in flight.

**Consider:**
- Tell the volunteer what *did* succeed before what failed (e.g. "Sarah's call was logged")
- Always offer a route to the human (organiser via Zoom / WhatsApp) as the ultimate fallback
- No hard error pages — friendly copy, retry button, and the human route
- Volunteers may be on patchy mobile signal — assume it
- The 30-min release covers most "I lost connection mid-call" cases without intervention

**Read more:**
- [design/wireframes-contact-card.md](design/wireframes-contact-card.md) — state H (failed to load next)
- [design/design-principles.md](design/design-principles.md) — tone of voice (warm even when broken)

---

## 🔐 Auth, links, and access

> Anything touching the join link, who can join, audit trail, or session lifecycle.

**Consider:**
- No accounts, no passwords. Identity is member-record lookup at join (see Join flow / member identity above).
- The **join link is load-bearing** for the trust model — it gates access to the member search. Anyone with the link can run name queries; protect distribution accordingly.
- Join link expires (end of session + window TBC); can be **regenerated** by organiser; old link → friendly "no longer active" page
- Audit trail comes from existing Airtable Sessions + Phone Logs, now stronger because `participantId = member.recordId` rather than a typed string
- Rate-limit "next contact" per participant (~1 per 5s)
- Don't surface anything that depends on cross-session identity (no "welcome back, Sam")

**Read more:**
- [tech/security-and-trust.md](tech/security-and-trust.md) — full threat model, link lifecycle, audit
- [design/scope.md](design/scope.md) — out-of-scope: phonebanker authentication

---

## ❤️‍🩹 Anything safeguarding-adjacent

> Outcome flows, "wants to be removed", help affordances, error states a stressed volunteer might hit, post-call copy.

**Consider:**
- Active listening over rushing — don't nudge the volunteer to move on quickly
- The app does **not** offer counselling prompts, helpline numbers, or crisis scripts — those live in the script and union materials
- Always make it easy for the volunteer to step away (their contact auto-releases)
- Honest copy when the app can't fix something — point to the organiser
- Don't auto-flag calls as "distressing" — that's the volunteer's judgement

**Read more:**
- [design/safeguarding.md](design/safeguarding.md) — full doc, principles, in-the-moment guidance
- [design/design-principles.md](design/design-principles.md) — tone of voice

---

## 🎨 Styling / design tokens

> Any new CSS, any new component, any visual change.

**Consider:**
- **Reach for the token, not the literal.** `var(--color-text-primary)` not `#0B0C0C`. `var(--font-body)` not `"Geist Mono"`. Literal hex, font names, sizes, or line-heights in component CSS are a smell.
- **Consume semantic, not primitive.** Semantic tokens (`--color-action-primary`, `--font-interactive`) encode intent; primitives (`--color-red-500`, `--font-mono`) are building blocks. Components reach for the semantic layer; primitives exist so semantic tokens can be re-aliased without sweeping the codebase.
- **Typography roles** — `display`, `subtitle`, `body`, `interactive`, `caption`. **Geist Mono is the default UI font; Geist is the exception** (display + subtitle only). `interactive` covers buttons, input labels, and clickable card text.
- **Colour categories** — `text`, `surface`, `border`, `action`. If the colour you want doesn't fit a category, that's a signal — either it belongs in a category you haven't named yet, or you're reaching for something the system shouldn't have.
- **Adding a new token earns its place.** Three or more uses across genuinely similar problems, or it names a real role the system is missing. One-offs stay in the component's CSS until they recur.
- **CSS is the source of truth; Figma is the reference.** When they diverge, update both — keep `tokens.css` authoritative. Don't import tokens *from* Figma; mirror by hand.

**Read more:**
- [src/styles/tokens.css](../src/styles/tokens.css) — the authoritative list of every token
- [tech/patterns-and-conventions.md § CSS for a component](tech/patterns-and-conventions.md) — class-vs-attribute, nesting, mobile-first

---

## ✏️ Copy / microcopy / labels

> Any user-facing words — button labels, headings, error messages, empty states, the celebration screen.

**Consider:**
- Plain English, short sentences, active voice
- No jargon, no corporate language
- Friendly prompts over instructions ("Who are you calling today?" > "Select a contact")
- Celebrate progress without being twee
- Set honest expectations about what happens next (especially for manual organiser actions)
- For form labels, ask a question if natural ("What's your name?") rather than a noun ("Name")

**Read more:**
- [design/design-principles.md](design/design-principles.md) — Tone of voice
- [design/wireframes-contact-card.md](design/wireframes-contact-card.md) — examples of copy in context

---

## 🧪 Testing a feature

> Anything new should ship with the right test coverage for its risk.

**Consider:**
- Zod schema for any new Airtable response shape — first line of defence against schema drift
- Vitest for assignment / locking / outcome logic
- Playwright for any feature that two volunteers might hit at once
- Concurrent-session scenarios are mandatory for anything touching assignment

**Read more:**
- [tech/tech-stack.md](tech/tech-stack.md) — Testing section, e2e scenarios

---

## When in doubt

If a feature spans multiple sections above, read the linked docs in this order:
1. **[design/scope.md](design/scope.md)** — confirm it's in scope
2. **[design/users-and-journeys.md](design/users-and-journeys.md)** — confirm the journey
3. **[design/design-principles.md](design/design-principles.md)** — confirm the UX shape
4. **[tech/data-and-airtable.md](tech/data-and-airtable.md)** — confirm the data model
5. **[tech/tech-stack.md](tech/tech-stack.md)** — confirm the implementation pattern

If after that you still have a judgement call to make, surface it in the PR description rather than guessing.
