# Scope

## MVP — In scope

### Organiser
- Create a session: select an Airtable View as the contact list, write call script, write SMS/voicemail message template
- Generate a shareable join link for the session
- Session persists until all contacts are called or manually ended

### Phonebanker
- Join a session by entering name (no account required)
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
- Prevent two phonebankers being assigned the same contact (via `assigned_phonebanker` field on Member record)
- Return a contact to the pool after 30 minutes of inactivity (no outcome logged); clear `assigned_phonebanker`
- Write a phone log record to Airtable for every call attempt (phonebanker name, contact, outcome, timestamp)
- Write `assigned_phonebanker` to Member record when a contact is assigned; clear it when outcome is logged
- Read member data from Airtable (no local storage of PII)
- Support a volunteer using multiple devices simultaneously: same name + device token attaches to the same participant session; both tabs poll (~5–10s) and stay in sync. Same mechanism handles tab-crash recovery — a rejoining volunteer gets their assigned contact back.

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
| Phonebanker authentication | Name-only entry is sufficient for the trust model of union volunteers |
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
- No persistent user accounts — session state (assignments, joins) lives in server memory or a lightweight store for the duration of a session only
- Must work well on mobile (phonebankers are likely on their phone while calling)
- Must work across distributed remote users simultaneously (concurrent session support from day one)
