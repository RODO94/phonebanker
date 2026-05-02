# Service Blueprint

Maps the whole phonebanking night, not just the app. The app is one tool inside a larger service that includes WhatsApp, Zoom, the in-person room, and the weekly solidarity sessions that follow up on issues raised.

## Stages at a glance

| Stage | When | Primary goal |
|-------|------|-------------|
| 1. Recruit | Days before | Get enough volunteers to commit |
| 2. Prep | Same day or day before | Pick the list, write script, write SMS |
| 3. Kick-off | First 15 min of session | Brief volunteers, answer questions, get them calling |
| 4. Calling | ~18:00–20:30 | Reach as many members as possible, capture outcomes |
| 5. Wind-down | Last 15 min | Stop on time or on list-empty, debrief |
| 6. Follow-up | Day after onwards | Update Airtable, route issues to staff caseworkers / solidarity sessions |

---

## Blueprint

### 1. Recruit

| Layer | Detail |
|-------|--------|
| Volunteer action | Sees broadcast, replies "in", receives DM with details |
| Organiser action | Posts broadcast in WhatsApp, DMs confirmed volunteers with date / time / Zoom or venue |
| App involvement | None |
| Supporting tools | WhatsApp |
| Risks | ~25% no-show rate; over-recruit accordingly |

### 2. Prep

| Layer | Detail |
|-------|--------|
| Organiser action | Picks Airtable view based on the night's purpose (recruit to dispute, re-engage quiet members, follow up on recent issues). Writes / pastes call script and SMS template. Generates join link. |
| App involvement | Organiser session setup flow; link generation |
| Supporting tools | Airtable (views), prior session scripts |
| Risks | Phone numbers in Airtable can be invalid; no current routine for cleaning these |

### 3. Kick-off

| Layer | Detail |
|-------|--------|
| Volunteer action | Joins Zoom or arrives in person; receives verbal brief; opens join link; enters first name |
| Organiser action | Walks through who is being called, why, tone, and what to do if X. Answers first-time questions. Shares link in chat / on screen. |
| App involvement | Join screen; first contact card |
| Supporting tools | Zoom OR physical room (sometimes both); WhatsApp group as backup channel |
| Risks | New volunteers nervous; brief assumes shared context volunteers may not have |

### 4. Calling

| Layer | Detail |
|-------|--------|
| Volunteer action | Reads card → calls on own phone → reads script / leaves voicemail / sends SMS → records outcome → next contact. Length per call: 5 min typical, up to 30 min for complex issues. |
| Organiser action | Phonebanks alongside; fields questions in Zoom chat / WhatsApp / in person; triages tricky situations live |
| App involvement | Contact card, copy-message button, outcome capture, burn-down counter, 30-min auto-release |
| Supporting tools | Zoom chat / WhatsApp / face-to-face for help; volunteer's own phone for the call |
| Risks | Low pickup rate is normal and demoralising — burn-down counter must reflect *attempts* not *pickups*. New volunteers triaging beyond their depth without realising. |

### 5. Wind-down

| Layer | Detail |
|-------|--------|
| Volunteer action | Stops calling at agreed end time or when list is empty; some leave early, some stay for debrief |
| Organiser action | Calls time; runs debrief, especially if hard calls came up; checks in 1:1 if needed |
| App involvement | Celebration / completion screen; session ends |
| Supporting tools | Zoom or room; informal chat |
| Risks | Volunteers who left early don't get the debrief; hard calls go unprocessed |

### 6. Follow-up (next day onwards)

| Layer | Detail |
|-------|--------|
| Organiser action | Reviews Phone Logs in Airtable. Manually updates contact preferences for opt-outs. Flags "no answer" / "callback" contacts for next session's list. Routes complex issues to staff caseworkers or invites member to next solidarity session. |
| Staff caseworker action | Picks up follow-up calls for issues that need professional support |
| Solidarity sessions | Weekly community space where members work through issues with peers |
| App involvement | None — pure Airtable work |
| Risks | Manual opt-out updating is fragile; "issue raised" today is captured loosely and depends on organiser remembering / reading notes |

---

## Where the app sits in the service

The app owns **stages 2, 3, 4, and 5** (organiser prep through session end). It deliberately stays out of:

- **Recruit** — WhatsApp does this well
- **The room** — Zoom and in-person are the social layer; the app is not a chat tool
- **Follow-up** — Airtable + the weekly solidarity session do this

The seams to design carefully are:

- **Kick-off**: the join link arriving in WhatsApp → the volunteer landing in the app for the first time. First impression sets confidence for the night.
- **Calling**: the volunteer's attention is split between phone-to-ear, script, and the app. The app must not demand attention while a conversation is live.
- **Wind-down**: the celebration screen is the last app moment, but the *real* close is the human debrief. The app should hand off, not steal the moment.
