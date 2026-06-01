# Data and Airtable

Airtable is the single source of truth for member data and call logs. The app reads member records and writes call logs back. It does not manage Airtable structure — tables must already exist.

A test Airtable base will be used during development that mirrors the production structure.

---

## Tables

### Members
The existing member list. Field names below are the **literal field names in the
live base**, not friendly labels — the server addresses them by exact string
(`src/contact/contactFields.ts`, `server/airtable/schema.ts`).

The table carries more columns than the app touches. Only the fields the server
reads or writes are listed first; the member-management fields it deliberately
ignores are recorded separately below.

**Fields the app reads or writes:**

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Full name. Also used by the bounded member search at join (case-insensitive, diacritic-stripped match). |
| Phone number | Phone | Used by phonebanker to dial |
| Contact type | Single select | Membership type, e.g. `Member (paying)`, `Cancelled direct debit`, `Contact`. Rendered as the card's metadata chip. |
| Summary of calls/meeting notes | Long text | Last-call summary shown on the card; read-only in app. |
| Current Phonebank Batch | Text | The organiser-typed batch tag (e.g. `31-05-2026`). A Member is in tonight's call list when this exactly matches the session's `phonebankBatch`. Replaces the old Airtable-view selection — views can't be queried outside Airtable Enterprise. |
| Assigned phone banker (group/branch) | Text (recordId) | **Plain text**, not a Link — holds the recordId of the volunteer currently assigned to this contact; empty when unclaimed. Written inside a mutex-guarded read-then-write at claim; cleared on outcome log, skip, or 30-minute timeout. The lock is transient by design; the durable audit link lives on Phone Logs (`Phonebanker`). |
| phoned_at | DateTime | Timestamp written alongside the assignment at claim time. Read back on hydration to rebuild the 30-minute timeout — makes expiry durable across redeploys. Cleared together with the assignment. |

**Member-management fields the app does not read** (carried by the base for the
organisation's own use; deliberately *not* mapped into `Contact`, to keep the
client payload to the minimum-exposure card set — see GDPR below):

`Tags (group/branch)`, `Phone call availability`, `# membership number`,
`New member call done?`, `Had initial 1:1?`, `Invited to WhatsApp?`,
`Notes (group/branch)`, `Date entered in database`.

### Sessions
One record per phonebanking session.

| Field | Type | Notes |
|-------|------|-------|
| Session ID | Auto-generated | Primary key |
| Date | Date | When the session was created |
| Call script | Long text | Formatted text shown to phonebankers during calls |
| SMS/voicemail message | Long text | Conversational message for copy-paste |
| phonebankBatch | Text | The batch tag for this session. Matched against each Member's `Current Phonebank Batch` to build tonight's call list. Replaces the old Airtable-view selection — views can't be queried outside Airtable Enterprise. |
| Created by | Text | Organiser's name |

### Phone Logs
One record per call attempt.

| Field | Type | Notes |
|-------|------|-------|
| Log ID | Auto-generated | Primary key |
| Session | Link to Sessions | Which session this call belongs to |
| Contact | Link to Members | Who was called |
| Phonebanker | Link to Members | The Member record of the volunteer who made the call (recordId, resolved at join). Nulled if the volunteer's Member record is deleted under GDPR — see [security-and-trust.md](security-and-trust.md). |
| Outcome | Single select | Had a conversation / Wants to be removed / No answer / Skipped |
| Message sent | Checkbox | Set on "No answer" outcomes when the volunteer sent the SMS / left a voicemail |
| Timestamp | DateTime | When the call was logged |
| Notes | Long text | Optional; future feature for full outcome form |

### Outcomes — what each means and what it triggers

| Outcome | When the volunteer picks it | What the organiser does next day |
|---------|----------------------------|--------------------------------|
| Had a conversation | Member picked up and the volunteer spoke with them | Review Phone Log; route any issue raised to caseworker / solidarity session |
| Wants to be removed | Member asked not to be called again | Manually update the member's contact preferences in Airtable so they aren't called next session |
| No answer | Voicemail or no pickup. Volunteer also flags whether they sent the SMS / left a voicemail (`Message sent`). | Roll into a future session's contact list |
| Skipped | Wrong contact in front of the volunteer, including "this is me" | Contact returns to the pool immediately; no follow-up needed |

The full outcome form (issues raised, RSVP, structured triage) is intentionally out of MVP scope — see [scope.md](scope.md).

---

## App-managed state (not in Airtable)

The assignment coordinator in the Hono server holds a `Map<sessionId, SessionState>` in process memory. Each entry contains:

| State | Purpose |
|-------|---------|
| Per-session async mutex | Serialises assignment operations for that session (provided by `async-mutex`) |
| Participant registry | The set of Member recordIds currently joined to the session. Identity is the recordId — no device tokens, no name-token reconciliation. |
| Member directory cache | Every Member in the base (id → name), loaded lazily on first touch and held for the session lifetime. Backs both member search and join — the join gate is membership-wide, not batch-scoped. See [security-and-trust.md](security-and-trust.md). |
| Batch contact cache | The contacts in this session's call batch (id → Contact). The pool from which contacts are claimed and against which burn-down is counted — distinct from the membership-wide directory above. |
| In-memory mirror | The coordinator's view of `assigned_phonebanker` / `claimed_at` per contact, used to serve polling reads. Writes always validate against Airtable inside the mutex; the mirror is updated after the Airtable write succeeds. |

State is **never evicted** during the lifetime of the Hono process — process restart (deploy, crash, reboot) is the eviction mechanism. Memory cost is bounded (kilobytes per session, weekly sessions), and there are no cascading-state risks across sessions because the map is keyed by sessionId.

Restart recovery is automatic: any method that takes a sessionId lazily rehydrates the corresponding `SessionState` on first touch. The 30-minute timeout queue is rebuilt by reading `claimed_at` from Airtable during hydration — no in-memory state is load-bearing for timeout correctness.

---

## Data flow

```
Airtable Members (batch tag) ─read─►  App (session setup: organiser types batch tag)
                                             │
                                  Phonebanker runs member search → picks themselves
                                             │
                              recordId becomes participantId for the session
                                             │
                                  App shows one contact at a time to phonebanker
                                             │
                                  Phonebanker clicks "Next person to call"
                                             │
                                  Coordinator acquires per-session mutex
                                             │
                          ──read──►  Reads current assigned_phonebanker from Airtable
                                             │
                          ◄──write──  Writes assigned_phonebanker + claimed_at
                                             │
                                  Mutex released; in-memory mirror updated
                                             │
                                  Phonebanker logs outcome (picked up / no answer / skipped)
                                             │
                         ◄──write──  App writes Phone Log record to Airtable
                                     App clears assigned_phonebanker and claimed_at
```

---

## Concurrent sessions on the same base

The assignment lock lives on the Member record, not on a session-contact pair. A contact appearing in two simultaneous sessions' batches can only be locked by one of them at a time. **If two sessions run concurrently against the same Airtable base, their batches must not overlap** — otherwise volunteers in session A and session B will compete for the same contact and one will appear locked when the other hasn't claimed it.

The strategy assumes one session per base per night and this constraint isn't load-bearing. If concurrent sessions become a real requirement, the lock granularity needs to move from the Member record to a session-scoped record (a new `Session Assignments` table linking session × contact × phonebanker). Out of scope for MVP — recorded here as the future force.

---

## GDPR considerations

- **Minimum exposure**: phonebankers see one contact record at a time; no list view, no bulk search. The member search at join ranges over the whole membership (it confirms union membership, not batch inclusion) but is bounded — 6-character minimum, up to 5 matches, no pagination — by GDPR design, so it returns identity confirmation rather than a browsable directory.
- **No export**: the app provides no download, CSV, or print functionality
- **No persistent auth**: phonebankers identify via member-record lookup at join — no account is created or stored locally
- **Retention**: the app does not store member data locally; it is fetched from Airtable per request and cached in-process for the session's lifetime only
- **Access control**: the join link plus the member-search gate together control access — see [security-and-trust.md](security-and-trust.md)
- **Sensitive fields**: phone numbers are displayed to the assigned phonebanker only, for the duration of their assigned call
- **Phone Log attribution**: each Phone Log links to the volunteer's Member record (recordId) — stronger audit than a typed name. Deletion of a Member record under Article 17 nulls the `Phonebanker` reference on every Phone Log it points to, retaining the operational record. See [security-and-trust.md § GDPR](security-and-trust.md).
