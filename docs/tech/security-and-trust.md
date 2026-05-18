# Security and Trust

The trust model is deliberately light: union volunteers are engaged people the organiser knows, and the join link is shared by direct WhatsApp message. We optimise for ease of joining over hardened access control. This doc spells out the limits of that model and what the app does to stay within them.

The model rests on two gates working together:

1. The **join link** is shared only with confirmed volunteers; its confidentiality bounds who reaches the next gate.
2. The **member-record lookup** at join — a bounded search returning at most 5 names after a 6-character query — confirms the volunteer is on the union's member list before they can claim a contact.

Neither gate is hardened on its own. Together they are sufficient for the user base. If the join link leaks, the member search becomes the only barrier, and a sufficiently patient attacker can walk small slices of the directory — see the threat model below.

---

## Threat model (what we are and aren't defending against)

| Concern | Realistic risk | What we do |
|---------|---------------|-----------|
| Link forwarded inside the volunteer pool | Expected and fine | Nothing |
| Link forwarded outside the pool (curious ex-member, casual snoop) | Low | Link expires; can be regenerated; non-members cannot pass the member-search gate |
| Hostile actor systematically scraping member data via the link | Low but possible | Audit trail in Airtable; one-record-at-a-time UI; rate-limited "next contact"; member search is 6-char minimum, 2s debounce, top-5 only, no pagination |
| Hostile actor walking the directory by varying search queries | Low but possible | 6-character minimum and 2-second debounce make scripted enumeration operationally slow; top-5 truncation prevents bulk discovery; accepted as a known limit of the trust model |
| Impersonation by guessing another member's name | Possible | Accepted — the union trust model treats this as a social, not technical, problem. The audit trail records the recordId of whoever was selected at join. |
| Volunteer device compromised mid-session | Low | No persistent auth; nothing stored locally |
| Airtable base compromised | Out of scope for the app | Airtable's own controls |

We are **not** defending against a determined attacker with engineering capability. That's a deliberate trade-off given the user base and the cost of friction.

---

## Join link lifecycle

The join link is **load-bearing** for the trust model — it is the first of the two gates, and its confidentiality determines who reaches the member-search gate. Treat distribution accordingly: direct messages to confirmed volunteers, not public channels.

- **Generated** by the organiser at session creation
- **Shared** by the organiser via WhatsApp DM to confirmed volunteers
- **Expires** after a defined window (proposed: end of session + 24h, TBC). Expired links land on a friendly "this session has ended" page with a contact route to the organiser.
- **Reactivatable** by the organiser if a volunteer joins late or the link expires mid-session
- **Regeneratable** by the organiser if compromised. Volunteers already in the session stay in; the old link stops working. Anyone trying the old link sees a "this link is no longer active — message the organiser" page rather than a hard error.

## Audit trail

We do not build a separate access log table. The existing Airtable tables already cover what we need:

- **Sessions** — who created the session, when
- **Phone Logs** — every call attempt records the phonebanker's recordId, contact, outcome, and timestamp

Because the phonebanker reference on Phone Logs is now a Member recordId (not a typed string), the audit trail is stronger than under a name-only model: two volunteers sharing a first name are distinguishable, and the call graph can be queried against the membership table directly.

We do **not** log "viewed but did not call" events — a phonebanker who joins, sees one contact, and leaves without logging an outcome will not appear in the audit trail. This is an accepted limitation.

## Rate limiting

The "next contact" action is rate-limited per participant (proposed: 1 request per 5 seconds, TBC during build). The member search at join is rate-limited by its UX constraints — 6-character minimum and 2-second debounce — and may add an explicit server-side limit per join link if scripted abuse is observed.

## Member identity and multi-device

Volunteer identity is resolved at join through a member-record lookup. The selected member's Airtable recordId becomes the `participantId` for the rest of the session. This collapses three previously separate concerns into one mechanism:

- **Name collisions** — two volunteers named Sam have distinct recordIds the moment they pass member search
- **Same volunteer, multiple devices** — both devices identify as the same recordId after the same member-search step; no device token reconciliation needed
- **Tab-crash recovery** — rejoining via member search returns the same recordId, which the coordinator's idempotent `claimNextUnassignedContact` recognises as the existing claim and returns the same locked contact

There is no device-token machinery in this model. Anyone running the member search on the same device authenticates only against their typed name and the resulting member list — switching volunteers means re-doing the join.

## Defending against double-call

Two phonebankers receiving the same contact is the failure mode the assignment coordinator is engineered to prevent. The mechanism rests on three properties working together:

1. **A single writer.** The assignment coordinator is the only path to mutating `assigned_phonebanker` on a Member record. Manual edits via Airtable's UI are out-of-band and should not happen during a live session — document this convention with organisers.
2. **A per-session mutex.** All assignment operations for a given session serialise behind an in-process async mutex. Two `claimNextUnassignedContact` calls for the same session cannot interleave their read-then-write.
3. **Read-then-write against Airtable inside the mutex.** Each claim, inside the mutex, reads the candidate contact's current `assigned_phonebanker` from Airtable, confirms it's still unassigned, then writes the new assignment. The in-memory mirror is the source of truth for polling reads only — writes always validate against Airtable.

Together these properties make double-call structurally impossible barring out-of-band edits. Every claim attempt is logged with the participant recordId, the contact recordId, and the read-then-write outcome, so any race that did occur is forensically traceable.

## Member data sensitivity

The contact card shows: name, phone, tenancy type, contact type, last call summary. Of these:

- **Name + phone** — standard contact data; the lowest sensitivity field on the card is still PII
- **Tenancy type, contact type** — low sensitivity in isolation
- **Last call summary** — free text, written by an organiser. Could in principle contain anything (immigration status, mental health context, legal cases, abuse history). The current process does not constrain what goes in this field, and the app does not either.

**Action**: organiser to confirm with the union whether there is a named data controller, retention policy, and any classification of fields that should not surface in the volunteer-facing card. Until that's confirmed, the app surfaces what Airtable surfaces, and the responsibility for what's in `last call summary` sits with whoever wrote it.

## What the app does not do

- No phonebanker accounts, passwords, or identity verification beyond member-record lookup
- No export, download, print, or bulk view of member data
- No local storage of member data — fetched per request
- No sharing of session state across sessions
- No persistent device tokens or cookies tied to participant identity

## GDPR — phonebanker-as-member data

Because `participantId = member.recordId`, a member who phonebanks for the union has their member record linked to every call they made via Phone Logs. This is intended: it is the audit trail the trust model relies on.

If that member later asks for their data to be deleted under GDPR Article 17, the resolution is to **null the `Phonebanker` reference on every Phone Log that points to their Member record**, while retaining the rest of the Phone Log (contact, outcome, timestamp). This preserves the operational history (the call was made, with this outcome) while discharging the attribution link to the deleted member. The cascade can be set up as an Airtable automation or performed manually as part of the deletion procedure.

Phone Log visibility within Airtable should be scoped to organisers (not the wider union) so that one member cannot see who-called-whom across all sessions. Configure via Airtable's table-level permissions.

## Open questions

- Is there a named LRU data controller for member data — and any retention rule the app should respect?
- What's the right link expiry window — end-of-session, +24h, +7 days?
- Should regeneration of a link notify already-joined volunteers in any way, or stay silent?
- Phone Log visibility within Airtable — confirm the access scope with the organisers
