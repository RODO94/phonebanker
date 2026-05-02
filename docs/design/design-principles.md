# Design Principles

## Foundation: Our own design system, inspired by GDS

We build our own component library as we need it — not importing GDS directly — so we can apply LRU branding. GDS is our **design inspiration**, not our dependency. When building a new component, ask: how would GDS solve this? Then adapt it to fit our visual identity.

Core GDS principles we carry over:

- **One thing per page** — each screen asks the user to do one thing only
- **Design for the most constrained user** — if someone with low digital literacy and a small phone screen can use it, everyone can
- **Plain English** — no jargon, short sentences, active voice
- **Make the default the right thing** — users should rarely need to think about what to do next

Reference (for inspiration, not direct use): https://design-system.service.gov.uk/

---

## Accessibility

- **High contrast** between all text and backgrounds — meet WCAG AA as a minimum
- **Large tap targets** — buttons must be at least 44×44px; primary actions should be larger
- **No colour-only meaning** — never use colour as the only way to communicate state (e.g. add an icon or label alongside a green/red indicator)
- **Readable font sizes** — body text minimum 16px; never below 14px for any UI text
- **No time pressure on UI** — don't use countdowns or animations that demand immediate action (the 30-min timeout is a background rule, not a visible timer)

---

## Key screen patterns

### Contact card (the main phonebanker screen)
Single card, one contact at a time. Contains:
- Name (large, prominent)
- Phone number (tappable `tel:` link on mobile)
- Tenancy type + contact type (secondary, smaller)
- Last call summary (collapsible or below the fold if long)
- Call script (readable, structured — not a wall of text)
- **Copy message** button (copies voicemail/SMS template to clipboard)
- Outcome buttons (large, clearly labelled): **Had a conversation**, **Wants to be removed**, **No answer**
- On **No answer**, a follow-up prompt asks whether the SMS / voicemail was sent
- **Skip** button (smaller, less prominent — not a primary action; covers both "wrong person" and "this is me" cases — if it's them, they'll skip)

### Burn-down counter
Always visible during a session. Shows: `12 of 47 called`. Simple, not intrusive. Gives volunteers a sense of progress and an end in sight.

### Celebration screen
Shown when all contacts are called. Should feel rewarding — not just a blank state. Show total calls made, how many picked up, and a positive message. Keep it simple; this is not a detailed report.

### Session join screen
- Single text input: "What's your name?"
- One button: "Join session"
- No other options or navigation

### Organiser session setup
Multi-step, but each step is one thing:
1. Select an Airtable **View** to use as the contact list for this session
2. Write call script
3. Write SMS/voicemail message
4. Review and generate link

---

## Tone of voice

- Warm and direct — this is a union app used by people who care about their community
- Avoid corporate language ("Please complete the following form")
- Prefer friendly prompts ("Who are you calling today?" over "Select a contact")
- Celebrate progress — acknowledge when things go well

---

## What this app is not

- Not a data management tool — no tables, no sorting, no filtering for phonebankers
- Not a communication platform — no in-app chat, no call functionality
- Not a reporting dashboard — Airtable handles that
