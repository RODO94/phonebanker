# Scope

## MVP — In scope

### Organiser
- Create a session: select an Airtable View as the contact list, write call script, write SMS/voicemail message template
- Generate a shareable join link for the session
- Session persists until all contacts are called or manually ended

### Phonebanker
- Join a session by searching for their own member record (type at least 6 characters of their name, see up to 5 matches, pick themselves)
- Non-members cannot join — the search returns zero matches and points them to the organiser
- See one contact at a time (name, phone number, tenancy type, contact type, last call summary)
- View call script on the same screen
- Copy voicemail/SMS message to clipboard with one tap
- Record outcome: Had a conversation / Wants to be removed / No answer / Skipped
- On "No answer", flag whether the SMS / voicemail was sent
- Skip a contact (returns to pool, logged as "Skipped" — covers "this is me" cases too)
- "Wants to be removed" surfaces the contact for manual opt-out by the organiser the next day (no auto-update of member preferences in MVP)
- See burn-down counter (X of Y called)
- See celebration screen when all contacts are called

### System
- Resolve volunteer identity by member-record lookup at join — `participantId` is the volunteer's Airtable Member recordId. Two volunteers sharing a first name are distinct by recordId; a single volunteer using two devices is the same participant on both.
- Prevent two phonebankers being assigned the same contact via a mutex-guarded read-then-write against the `assigned_phonebanker` field on the Member record. The coordinator is the sole writer.
- Return a contact to the pool after 30 minutes of inactivity (no outcome logged); clear `assigned_phonebanker` and `claimed_at`. The `claimed_at` field on the Member record makes the timeout durable across server restart.
- Write a phone log record to Airtable for every call attempt (phonebanker recordId, contact, outcome, timestamp)
- Read member data from Airtable (no local storage of PII)
- Support a volunteer using multiple devices simultaneously: both devices identify as the same `participantId` after the member-search step, both poll (~5–10s) and see the same assigned contact. Tab-crash recovery uses the same path — rejoining via the member search returns the still-locked contact.

---

## Out of scope for MVP

| Feature | Reason deferred |
|---------|----------------|
| Full outcome form (issues raised, RSVP, notes) | Adds complexity; basic log (picked up / no answer) covers the core need first |
| Organiser live dashboard (real-time view of session) | Organisers can monitor via Airtable filtered by today; build this once core flow is stable |
| In-app calling or SMS sending | Out of scope by design; app is a coordinator, not a communication tool |
| Scheduling sessions in advance | Not needed for MVP; organiser creates session on the night |
| Member sign-up or account creation | This is a calling tool, not a membership platform |
| Editing Airtable base structure from the app | Airtable is managed separately |
| Multi-session history / reporting | Airtable handles this |
| Phonebanker authentication (passwords, accounts, magic links) | Member-record lookup at join plus the shared join link is the trust model — see [security-and-trust.md](../tech/security-and-trust.md) |
| Browsing the member list | Member search returns at most 5 matches after a 6-character minimum query — by design, not a directory browser |
| Exporting call data from the app | GDPR constraint; Airtable is the record of truth |

---

## Future backlog (post-MVP)

- **Full outcome form** — additional fields: issues raised, event RSVP, free-text notes
- **Organiser session dashboard** — real-time view of who is calling whom, burn-down, stragglers
- **Real-time multi-device sync** — replace the MVP polling model with websockets / SSE for instant cross-tab updates. MVP polling is sufficient for the actual workflow.
- **Returning volunteer recognition** — if a phonebanker enters the same name in a later session, pre-fill or greet them (low priority given GDPR complexity)
- **Session templates** — reuse a script and message from a previous session
- **Voicemail/SMS message personalisation** — auto-insert phonebanker's name into the message template

---

## Technical constraints (inform build decisions)

- Airtable API is the data layer — all member reads and log writes go through it
- No persistent user accounts — session state (assignments, joins) lives in server memory for the duration of a session only; durable lock state lives in Airtable (`assigned_phonebanker` + `claimed_at`)
- Concurrent sessions on the same Airtable base must use **non-overlapping views** — the lock field is on the Member record, so a contact appearing in two simultaneous sessions' views can only be locked by one of them
- Must work well on mobile (phonebankers are likely on their phone while calling)
- Must work across distributed remote users simultaneously (concurrent session support from day one)
