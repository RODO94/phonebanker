# Security and Trust

The trust model is deliberately light: union volunteers are engaged people the organiser knows, and the join link is shared by direct WhatsApp message. We optimise for ease of joining over hardened access control. This doc spells out the limits of that model and what the app does to stay within them.

---

## Threat model (what we are and aren't defending against)

| Concern | Realistic risk | What we do |
|---------|---------------|-----------|
| Link forwarded inside the volunteer pool | Expected and fine | Nothing |
| Link forwarded outside the pool (curious ex-member, casual snoop) | Low | Link expires; can be regenerated |
| Hostile actor systematically scraping member data via the link | Low but possible | Audit trail in Airtable; one-record-at-a-time UI; rate-limited "next contact" |
| Volunteer device compromised mid-session | Low | No persistent auth; nothing stored locally |
| Airtable base compromised | Out of scope for the app | Airtable's own controls |

We are **not** defending against a determined attacker with engineering capability. That's a deliberate trade-off given the user base and the cost of friction.

---

## Join link lifecycle

- **Generated** by the organiser at session creation
- **Shared** by the organiser via WhatsApp DM to confirmed volunteers
- **Expires** after a defined window (proposed: end of session + 24h, TBC). Expired links land on a friendly "this session has ended" page with a contact route to the organiser.
- **Reactivatable** by the organiser if a volunteer joins late or the link expires mid-session
- **Regeneratable** by the organiser if compromised. Volunteers already in the session stay in; the old link stops working. Anyone trying the old link sees a "this link is no longer active — message the organiser" page rather than a hard error.

## Audit trail

We do not build a separate access log table. The existing Airtable tables already cover what we need:

- **Sessions** — who created the session, when
- **Phone Logs** — every call attempt records the phonebanker name, contact, outcome, and timestamp

Together these answer "who joined this session and which members did they see". For MVP this is sufficient. If a member ever reports an unexpected call, the organiser can trace it through Phone Logs.

We do **not** log "viewed but did not call" events — a phonebanker who joins, sees one contact, and leaves without logging an outcome will not appear in the audit trail. This is an accepted limitation.

## Rate limiting

The "next contact" action is rate-limited per joined name (proposed: 1 request per 5 seconds, TBC during build). This is enough to stop a casual scraping attempt without affecting normal use.

## Name collisions and same-volunteer multi-device

A volunteer can legitimately join the same session from more than one device (phone + laptop). The app must distinguish this from two different people who happen to share a first name.

Mechanism:

1. On first join, the app issues a **device token** (cookie) bound to the participant `Sam`
2. If a join comes in for "Sam" with a known device token → same volunteer, second tab. Attach to existing participant; both tabs sync via polling (see [users-and-journeys.md](users-and-journeys.md)).
3. If a join comes in for "Sam" with **no** known device token → ambiguous. Prompt: *"Are you already in this session on another device, or are you a different Sam?"*
4. If "different Sam" → app appends a suffix on join (e.g. "Sam" → "Sam B"). Volunteer-facing UI still shows just "Sam"; logs and assignment use the disambiguated name.

This keeps the audit trail clean (one participant per real person, regardless of device count) and avoids two volunteers stepping on each other's assignments.

## Member data sensitivity

The contact card shows: name, phone, tenancy type, contact type, last call summary. Of these:

- **Name + phone** — standard contact data; the lowest sensitivity field on the card is still PII
- **Tenancy type, contact type** — low sensitivity in isolation
- **Last call summary** — free text, written by an organiser. Could in principle contain anything (immigration status, mental health context, legal cases, abuse history). The current process does not constrain what goes in this field, and the app does not either.

**Action**: organiser to confirm with the union whether there is a named data controller, retention policy, and any classification of fields that should not surface in the volunteer-facing card. Until that's confirmed, the app surfaces what Airtable surfaces, and the responsibility for what's in `last call summary` sits with whoever wrote it.

## What the app does not do

- No phonebanker accounts, passwords, or identity verification beyond a typed first name
- No export, download, print, or bulk view of member data
- No local storage of member data — fetched per request
- No sharing of session state across sessions

## Open questions

- Is there a named LRU data controller for member data — and any retention rule the app should respect?
- What's the right link expiry window — end-of-session, +24h, +7 days?
- Should regeneration of a link notify already-joined volunteers in any way, or stay silent?
