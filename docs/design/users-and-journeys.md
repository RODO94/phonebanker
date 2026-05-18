# Users and Journeys

## Personas

### Organiser
A union rep or staff member running the phonebanking night. Comfortable enough with Airtable to manage lists. Sets up the session before the night starts and may also phonebank themselves. There are a small number of these (starting with ~4 people).

### Phonebanker
A union volunteer joining for the evening. Mixed digital literacy — may be doing this for the first time. Needs a clear, low-friction interface. Does not manage sessions or see the wider member list.

---

## Journey 1: Organiser sets up a session

1. Organiser opens the app and chooses "Create session"
2. Selects an Airtable **View** to use as the contact list for tonight (Views are pre-configured in Airtable by the organiser)
3. Writes (or pastes) the **call script** — structured text covering:
   - Why we're calling
   - Key information to get across
   - Any event details
4. Writes (or pastes) the **voicemail/SMS message** — conversational, suitable for WhatsApp or SMS, e.g. *"Hi it's [Name] from London Renters Union, I was phoning because..."*
5. App generates a **join link** for the session
6. Organiser shares the link (e.g. via WhatsApp group or email)

**Organiser can also phonebank** — they join their own session the same way as any other volunteer.

---

## Journey 2: Phonebanker joins and makes calls

1. Phonebanker opens the join link
2. Types at least **6 characters** of their name. After a 2-second pause (or pressing Enter), the app shows up to 5 matching members. The phonebanker picks themselves. A non-member sees a message pointing them at the organiser; they can't proceed.
3. App shows the **next available contact**:
   - Name
   - Phone number
   - Tenancy type
   - Contact/membership type
   - Summary of last call (if any)
4. Phonebanker calls the person on their own device
5. After the call, phonebanker records the outcome:
   - **Had a conversation** / **Wants to be removed** / **No answer** / **Skipped**
   - On **No answer**, also flags whether they sent the SMS or left a voicemail
   - (Full outcome form — issues raised, RSVP, structured triage — is a future feature; see [scope.md](scope.md))
6. App logs the call to Airtable (phonebanker name, contact, outcome, timestamp)
7. Phonebanker presses **Next contact** — app assigns the next available person

### On-screen aids
- **Copy message** button: copies the session's voicemail/SMS template to clipboard with a single tap, ready to paste into WhatsApp or Messages
- **Call script**: visible on the same screen, formatted with clear sections
- **Burn-down counter**: shows X of Y contacts called so far

---

## Journey 3: End of session

- When all contacts have been called, the app shows a **celebration screen**
- Displays total calls made and how many picked up
- No further action required — all logs are already in Airtable

---

## Edge cases

### Phonebanker skips a contact (including "this is me")
- A single **Skip** button handles all skip cases — wrong person, not a good time, or the contact is the phonebanker themselves
- Skipped contact is returned to the pool; outcome logged as "Skipped"
- No need to distinguish the reason — if it's them, they'll skip

### Contact already being called
- Contacts are locked the moment they are assigned to a phonebanker (`assigned_phonebanker` is written to Airtable)
- A second phonebanker will never see a locked contact — they receive the next available one

### Phonebanker drops off mid-session
- If a contact has been assigned but no outcome logged after **30 minutes**, it is automatically returned to the available pool and `assigned_phonebanker` is cleared
- No manual intervention needed from the organiser

### Phonebanker uses two devices at once
- A volunteer (e.g. Sam) may want the contact card on their phone *and* their laptop — phone for dialling, laptop for script and outcome capture
- Sam joins on device 1: types their name, picks themselves from the search, their `participantId` is set to their Member recordId
- Sam joins on device 2: does the same search, picks themselves, gets the same recordId
- Because identity is the recordId, both devices identify as the same participant. Both poll every ~5–10s and see the same assigned contact; either tab can log the outcome.
- A second volunteer who happens to share Sam's first name is distinct by recordId from the moment they pass member search — no disambiguation prompt is needed.

### Phonebanker's tab crashes or loses connection
- The volunteer re-opens the join link, re-runs the member search, picks themselves — the recordId is the same as before
- The coordinator's `claimNextUnassignedContact` is idempotent per participant: the still-locked contact is returned to them
- This works because the assignment is owned by the participant (recordId), not by a tab, cookie, or device token

---

## What phonebankers never see
- The full member list
- Other phonebankers' assigned contacts
- Any export or download of data
- Other sessions
