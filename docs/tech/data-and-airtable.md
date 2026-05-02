# Data and Airtable

Airtable is the single source of truth for member data and call logs. The app reads member records and writes call logs back. It does not manage Airtable structure — tables must already exist.

A test Airtable base will be used during development that mirrors the production structure.

---

## Tables

### Members
The existing member list. The organiser selects a View from this table for each session.

| Field | Type | Notes |
|-------|------|-------|
| Name | Text | Full name |
| Phone number | Phone | Used by phonebanker to dial |
| Tenancy type | Single select | e.g. private renter, social housing |
| Contact type | Single select | Membership type |
| Last call summary | Long text | Summary from most recent phone log; read-only in app |
| Assigned phonebanker | Text | Name of the phonebanker currently assigned to this contact; written when a phonebanker clicks "Next person to call", cleared when an outcome is logged |

### Sessions
One record per phonebanking session.

| Field | Type | Notes |
|-------|------|-------|
| Session ID | Auto-generated | Primary key |
| Date | Date | When the session was created |
| Call script | Long text | Formatted text shown to phonebankers during calls |
| SMS/voicemail message | Long text | Conversational message for copy-paste |
| Airtable view | Text | The name of the Airtable view used as the contact list for this session |
| Created by | Text | Organiser's name |

### Phone Logs
One record per call attempt.

| Field | Type | Notes |
|-------|------|-------|
| Log ID | Auto-generated | Primary key |
| Session | Link to Sessions | Which session this call belongs to |
| Contact | Link to Members | Who was called |
| Phonebanker name | Text | Name entered at session join |
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

The following is tracked in-app (e.g. in server memory or a lightweight store) during a session and does not need its own Airtable table:

| State | Purpose |
|-------|---------|
| Assignment timestamp | To trigger the 30-minute timeout and return contact to pool; complements `assigned_phonebanker` in Airtable |
| Participants | One record per volunteer in the session: name, device tokens (one per open tab/device), currently-assigned contact. A participant can have N device tokens — supports same-volunteer-multi-device and tab-crash recovery. |

This state only needs to persist for the duration of a session. It can be cleared when a session ends.

---

## Data flow

```
Airtable Members (View) ──read──►  App (session setup: organiser selects View)
                                             │
                                  App shows one contact at a time to phonebanker
                                             │
                                  Phonebanker clicks "Next person to call"
                                             │
                         ◄──write──  App sets assigned_phonebanker on Member record
                                             │
                                  Phonebanker logs outcome (picked up / no answer / skipped)
                                             │
                         ◄──write──  App writes Phone Log record to Airtable
                                     App clears assigned_phonebanker on Member record
```

---

## GDPR considerations

- **Minimum exposure**: phonebankers see one contact record at a time; no list view, no search
- **No export**: the app provides no download, CSV, or print functionality
- **No persistent auth**: phonebankers identify by name only — no account is created or stored
- **Retention**: the app does not store member data locally; it is fetched from Airtable per request
- **Access control**: the join link is the only access mechanism — organisers are responsible for sharing it appropriately
- **Sensitive fields**: phone numbers are displayed to the assigned phonebanker only, for the duration of their assigned call
- **Logs**: phone logs in Airtable record who called whom — organisers are responsible for managing retention in Airtable
