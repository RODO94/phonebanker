# Wireframes — Contact Card

Low-fi wireframes for the phonebanker's main screen and its outcome flows. Mobile-first; desktop notes at the end. These are layout sketches, not visual design — type, colour, and LRU branding come later.

## Design intent recap

- One contact, one screen, one task ([design-principles.md](design-principles.md))
- Volunteer's attention is split between phone-to-ear, script, and screen — the card must not demand attention while a conversation is live
- Primary actions are the **outcome buttons**; everything else recedes
- The "no answer" follow-up (was the SMS sent?) is the one micro-flow we accept inside the card; everything else is one tap → next contact

---

## State A — Default contact card

The screen the volunteer sees when a new contact is assigned.

```
┌────────────────────────────────────────┐
│  LRU Phonebank          12 of 47 ▓▓░░  │  ← persistent header: brand + burn-down
├────────────────────────────────────────┤
│                                        │
│  Sarah Patel                           │  ← name, large
│                                        │
│  ┌──────────────────────────────────┐  │
│  │   📞  07700 900123               │  │  ← tel: link, large tap target
│  └──────────────────────────────────┘  │
│                                        │
│  Private renter · Full member          │  ← secondary metadata
│                                        │
│  ─── Last time we spoke ──────────── ▼ │  ← collapsible (collapsed by default
│                                        │     if > ~120 chars)
│  Spoke 12 Mar — interested in joining  │
│  the rent strike, asked for a callback │
│  this month.                           │
│                                        │
│  ─── Call script ───────────────────── │
│                                        │
│  Why we're calling                     │
│  We're contacting members about the    │
│  campaign against Section 21…          │
│                                        │
│  Key points                            │
│  • Mention the Tuesday meeting         │
│  • Ask if they've had any issues       │
│    with their landlord recently        │
│                                        │
│  [ scrollable; script can be long ]    │
│                                        │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  📋  Copy SMS / voicemail        │  │  ← copies template to clipboard
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ✓  Had a conversation           │  │  ← primary outcomes,
│  └──────────────────────────────────┘  │     stacked, full-width,
│  ┌──────────────────────────────────┐  │     thumb-reachable
│  │  ✗  No answer                    │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  🚫  Wants to be removed         │  │
│  └──────────────────────────────────┘  │
│                                        │
│             Skip this contact           │  ← text link, less prominent
│                                        │
└────────────────────────────────────────┘
```

**Notes**
- Outcome buttons sit at the bottom of the screen — thumb zone on a phone held in one hand
- Each outcome button has an icon AND a label (no colour-only meaning — see [design-principles.md](design-principles.md))
- "Skip" is intentionally a text link, not a button, so it can't be hit by accident
- Burn-down counter says "called", which here means *attempts logged*, not *pickups* — important for morale on a low-pickup night
- The phone number is the second largest element on the card, and is a `tel:` link on mobile so a tap dials

---

## State B — "No answer" follow-up

The one micro-flow that lives inside the card. Triggered by tapping "No answer".

```
┌────────────────────────────────────────┐
│  LRU Phonebank          12 of 47 ▓▓░░  │
├────────────────────────────────────────┤
│                                        │
│  No answer from Sarah                  │
│                                        │
│  Did you send the SMS or leave         │
│  a voicemail?                          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ✓  Yes, message sent            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │     No, no message               │  │
│  └──────────────────────────────────┘  │
│                                        │
│             ← Back                     │  ← if the volunteer hit No Answer
│                                        │     by mistake
└────────────────────────────────────────┘
```

**Notes**
- Two-tap floor for "No answer" — one to choose the outcome, one to flag the message
- "Back" returns to the contact card with no log written
- This is the **only** micro-flow in the contact card; "Had a conversation" and "Wants to be removed" both go straight to the next contact

---

## State C — "Wants to be removed" confirmation

Tap-to-confirm because it's the highest-impact outcome. No second screen — a tap-and-hold or a confirmation modal would slow the volunteer down on a sensitive moment.

```
┌────────────────────────────────────────┐
│  LRU Phonebank          12 of 47 ▓▓░░  │
├────────────────────────────────────────┤
│                                        │
│  Mark Sarah as wanting to be removed?  │
│                                        │
│  An organiser will update her          │
│  contact preferences tomorrow.         │
│  She won't be called again until then. │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Yes, log it                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│             ← Back                     │
│                                        │
└────────────────────────────────────────┘
```

**Notes**
- One-tap confirm. Sets expectations honestly: this is a manual organiser action, not an instant database update.
- Reassures the volunteer they're doing the right thing for the member.

---

## State D — Logging & loading next contact

Brief transition between contacts. Should feel quick, not an interruption.

```
┌────────────────────────────────────────┐
│  LRU Phonebank          13 of 47 ▓▓▓░  │  ← counter ticks up *immediately*
├────────────────────────────────────────┤
│                                        │
│                                        │
│             Logging Sarah…             │
│                                        │
│             ⠋  Finding next contact    │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

**Notes**
- Counter advances optimistically — if the log fails we recover quietly in the background
- Two short status lines so the volunteer knows the system hasn't frozen
- Should resolve within ~1 second on a normal connection

---

## State E — End of list / celebration

```
┌────────────────────────────────────────┐
│  LRU Phonebank                         │
├────────────────────────────────────────┤
│                                        │
│              🎉                        │
│                                        │
│      That's the whole list.            │
│      Thank you, Rory.                  │
│                                        │
│      You called 18 people tonight.     │
│      6 picked up.                      │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Done                            │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Stay on the Zoom for the debrief.     │  ← hands off to the human moment
│                                        │
└────────────────────────────────────────┘
```

**Notes**
- Warm but brief — see tone of voice in [design-principles.md](design-principles.md)
- Explicit handoff to the debrief; the app doesn't try to be the closing moment
- No animation that demands attention (accessibility)

---

## State F — Long "last call summary"

When the summary exceeds ~120 chars, collapse it by default with a clear "Show more" affordance. The volunteer can read it before dialling if they want context, or skip it.

```
│  ─── Last time we spoke ──────────── ▶ │  ← collapsed
│                                        │
│  Spoke 12 Mar — interested in joining… │  ← first line preview
│                       Show more        │
```

When expanded, the section pushes the script down — the script is scrollable, so this is fine.

---

## State G — Skip

Tapping the "Skip this contact" text link releases the contact back to the pool and moves on. No confirmation — the action is reversible at the system level (the contact will be reassigned to someone else) and the volunteer's most likely reasons (it's me, wrong person in front of me) are time-sensitive.

```
┌────────────────────────────────────────┐
│  LRU Phonebank          12 of 47 ▓▓░░  │
├────────────────────────────────────────┤
│                                        │
│             Skipping…                  │
│             ⠋  Finding next contact    │
│                                        │
└────────────────────────────────────────┘
```

---

## State H — Edge: failed to load next contact

Network blip, Airtable outage, etc. The volunteer should never feel stuck.

```
┌────────────────────────────────────────┐
│  LRU Phonebank          13 of 47 ▓▓▓░  │
├────────────────────────────────────────┤
│                                        │
│  Hmm, we couldn't get the next         │
│  contact.                              │
│                                        │
│  Your last call (Sarah, no answer)     │
│  was logged successfully.              │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Try again                       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Still stuck? Message the organiser    │
│  on Zoom or WhatsApp.                  │
│                                        │
└────────────────────────────────────────┘
```

**Notes**
- Tells the volunteer what *did* succeed so they're not anxious about double-logging
- Explicit fallback route to the human (organiser), not just a retry button

---

## Desktop layout notes

The same card works on desktop with these adjustments:

- Max content width ~640px, centred — don't let the script become a wall of text
- Outcome buttons remain stacked full-width within the content column (consistency with mobile)
- Phone number stays a `tel:` link — many laptops can place calls via paired phone (FaceTime, Phone Link)
- Burn-down counter top right; brand top left; otherwise identical

---

## Open questions for design review

- **Should "Copy SMS / voicemail" become two buttons** ("Send SMS" with a `sms:` deep link, "Voicemail script" that just shows the text)? The current single button is simpler, but the deep link removes a step on mobile. Worth user-testing.
- **Position of "Last time we spoke"** — above or below the script? Above means context-before-action; below means the script is the dominant element. Currently above; flag for testing.
- **Outcome button order** — currently Conversation / No answer / Removed (most-frequent first). Validate with real session data.
- **Should the script collapse** while a call is in progress, with a "back to script" affordance? Or always-visible? Currently always-visible-and-scrollable. Worth observing in a real session.
