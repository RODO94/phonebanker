# Claude Design — per-screen prompts

Copy the **Shared context** block once into Claude Design as a system/preface, then paste one screen prompt per generation. Tweak content (names, copy) freely; the structure/intent is the part to keep.

Sources these prompts are derived from:
- [users-and-journeys.md](users-and-journeys.md)
- [design-principles.md](design-principles.md)
- [wireframes-contact-card.md](wireframes-contact-card.md)
- [service-blueprint.md](service-blueprint.md)

---

## Shared context (paste first / use as system prompt)

> You are designing screens for **Phonebanker**, a web app used by London Renters Union (LRU) volunteers to run remote phonebanking sessions. Volunteers call union members one at a time; the app coordinates who is calling whom and logs outcomes back to Airtable.
>
> **Audience:** mixed digital literacy, often on a phone held in one hand while the other holds a phone to their ear. First-time volunteers must succeed on the first try.
>
> **Design language:**
> - Inspired by GOV.UK Design System (https://design-system.service.gov.uk) — plain English, one task per screen, generous whitespace, no decorative noise.
> - LRU branding: warm, direct, community-led. Avoid corporate polish; this is a union tool, not a SaaS product. Black text on near-white background; a single accent colour (LRU red or a confident warm tone) reserved for primary actions.
> - Buttons are full-width, stacked, minimum 44×44px tap target, large type. Outcome buttons are bigger still and sit in the thumb zone (bottom of viewport on mobile).
> - Type: system sans-serif (system-ui / -apple-system / Segoe UI). Body 16px minimum, headings generous. Line-height ≥1.5.
> - Accessibility: WCAG AA contrast minimum, no colour-only meaning (every coloured state has an icon or label too), no countdowns or attention-stealing animation, focus states visible.
> - Layout: mobile-first, single column. Desktop = same column centred at ~640px max-width — never a wall of text.
>
> **Tone of voice:** warm, direct, plain English. "Who are you calling today?" not "Select a contact". Celebrate progress without being twee.
>
> **What this app is not:** not a dashboard, not a CRM, not a chat tool. No tables, no filters, no settings panels for the phonebanker.
>
> **Tech context (for any code output):** React + TypeScript + Vite + TanStack Router. Plain CSS (no Tailwind imposed). Components should be small and composable.

---

## Screen 1 — Landing / role split

**Route:** `/`
**Used by:** Both roles, briefly

> Design the landing screen for Phonebanker.
>
> Two paths from here:
> - **Organiser:** primary button "Create a session"
> - **Phonebanker:** secondary text below, e.g. *"Joining a session? Open the link your organiser sent you."* — no button, since they should always arrive via a join link.
>
> Above: LRU Phonebank wordmark/logo, one-line strapline ("Calling members together"). Below: tiny footer linking to the LRU site.
>
> One screen. No navigation chrome. Mobile-first.

---

## Screen 2 — Organiser: select Airtable view

**Route:** `/new/view`
**Step 1 of 4 in session setup**

> Design step 1 of the organiser session-setup flow: choosing which Airtable View to call from tonight.
>
> Content:
> - Heading: "Who are we calling tonight?"
> - Helper text: "Pick a list from Airtable. We'll only show contacts in this view."
> - A radio-button list of Airtable views (5–15 items typical). Each row shows: view name (large), and below it a one-line description if present, plus contact count (e.g. *"47 contacts"*).
> - Primary button at bottom: "Continue"
> - Step indicator at top: "Step 1 of 4"
>
> No search bar (lists are short). No filter controls. The default state has nothing selected — the Continue button is disabled until a view is chosen.

---

## Screen 3 — Organiser: write call script

**Route:** `/new/script`
**Step 2 of 4**

> Design step 2: writing the call script.
>
> Content:
> - Heading: "What should volunteers say?"
> - Helper text: "Volunteers will read this on screen during every call. Use short sections with headings — 'Why we're calling', 'Key points', 'If they ask about X'."
> - A large textarea (markdown-friendly; render headings/bullets in the preview).
> - A live preview pane *below* the textarea on mobile, *beside* it on desktop (≥768px). Preview should look exactly like the script section on the contact card so the organiser sees what volunteers will see.
> - "Back" link, "Continue" primary button at bottom.
> - Step indicator: "Step 2 of 4"
>
> No rich-text toolbar — markdown is enough, and the helper text gives a hint.

---

## Screen 4 — Organiser: write SMS/voicemail message

**Route:** `/new/message`
**Step 3 of 4**

> Design step 3: writing the message volunteers will copy/paste into SMS or read into voicemail.
>
> Content:
> - Heading: "What's the message if they don't pick up?"
> - Helper text: "This is what volunteers will copy into WhatsApp or read as a voicemail. Keep it conversational and under ~300 characters."
> - Textarea with a live character counter (advisory, not enforced — show in muted grey).
> - Below the textarea: a small "Preview" pill showing how the message will appear with the volunteer's name auto-inserted (placeholder shown as `[Volunteer name]`).
> - "Back" / "Continue" buttons.
> - Step indicator: "Step 3 of 4"

---

## Screen 5 — Organiser: review and share link

**Route:** `/new/share`
**Step 4 of 4**

> Design the final step: review + share the join link.
>
> Content:
> - Heading: "Ready to phonebank!"
> - Summary card showing: list name + contact count, first 2 lines of the script (with "Show full script" expander), first line of the message.
> - A prominent block containing the join link (e.g. `phonebank.lru.org.uk/session/abc123`). Two buttons next to it: "Copy link" (primary) and "Open" (secondary, opens in new tab so the organiser can also phonebank).
> - Below: helper text — *"Share this link in your WhatsApp group. Anyone with the link can join — no password needed."*
> - Smaller secondary action: "Edit session" (back to step 1 with state preserved).
> - Step indicator: "Step 4 of 4 · Done"

---

## Screen 6 — Phonebanker: join session

**Route:** `/session/$sessionId`
**State:** before name entered

> Design the phonebanker join screen. This is the volunteer's first impression — calm and confident.
>
> Content:
> - Header: LRU Phonebank wordmark; below it, one line: *"You're joining tonight's phonebank for [organiser name / list purpose if available]."* (if no metadata, just *"You're joining tonight's phonebank."*)
> - **Single text input**: label *"What's your first name?"* — large, centred, autofocus on load.
> - **Single primary button**: "Join session" — full-width, large, below the input.
> - Below the button, small reassuring helper: *"No password needed. Your name is just so the organiser knows who called who."*
> - That's the entire screen. No nav, no footer links beyond a tiny "About LRU" link in the corner.
>
> Mobile keyboards open immediately on load. The button stays visible above the keyboard.

---

## Screen 7 — Contact card (the main screen)

**Route:** `/session/$sessionId` after name entered, default state
**Used by:** Phonebanker, repeatedly

> Design the contact card — the screen the volunteer sees when a new contact is assigned. This is the most-used screen in the app, designed for one-handed phone use during a phone call.
>
> Persistent header (sticky):
> - Left: "LRU Phonebank" wordmark (small)
> - Right: burn-down counter "12 of 47" with a slim progress bar beneath. The counter shows *attempts logged*, not pickups — important for morale on low-pickup nights.
>
> Main card content (in this order, top to bottom):
> 1. **Name** — large, the most prominent element on the screen (e.g. "Sarah Patel")
> 2. **Phone number** — second most prominent. Big, full-width tappable button styled as a `tel:` link with a phone icon. Tapping it dials on mobile.
> 3. **Metadata row** — small, muted: e.g. "Private renter · Full member"
> 4. **"Last time we spoke"** — collapsible section, collapsed by default if >120 chars. Shows date and summary. Clear "Show more / Show less" affordance.
> 5. **Call script** — formatted from markdown (headings, bullets). Scrollable within the card if long. No max-height clipping; the script can push the page down.
>
> Sticky bottom action zone (always in thumb reach):
> - **"Copy SMS / voicemail"** button (secondary style, with clipboard icon) — copies the message template to clipboard, shows a brief "Copied!" toast.
> - **Outcome buttons**, stacked, full-width, each with an icon AND a label (no colour-only meaning):
>   - "Had a conversation" (check icon)
>   - "No answer" (cross icon)
>   - "Wants to be removed" (block icon)
> - Below outcomes: a small text link "Skip this contact" — intentionally less prominent so it can't be hit by accident.
>
> Desktop: same layout, content max-width ~640px, centred. Outcome buttons stay full-width within that column.

---

## Screen 8 — "No answer" follow-up

**State of:** contact card, after tapping "No answer"

> Design the one micro-flow that lives inside the contact card: the "No answer" follow-up.
>
> Replace the contact card content with this focused view (header + burn-down stay):
> - Heading: "No answer from Sarah."
> - Body: "Did you send the SMS or leave a voicemail?"
> - Two stacked, full-width buttons:
>   - Primary: "Yes, message sent" (check icon)
>   - Secondary: "No, no message"
> - Below: text link "← Back" — returns to the contact card without logging anything.
>
> Same visual language as the contact card outcome zone. Calm, no fuss.

---

## Screen 9 — "Wants to be removed" confirmation

**State of:** contact card, after tapping "Wants to be removed"

> Design the confirmation screen for the highest-impact outcome: marking someone as wanting to be removed from the calling list.
>
> Content (replaces card body, header stays):
> - Heading: "Mark Sarah as wanting to be removed?"
> - Reassuring body, two short sentences: *"An organiser will update her contact preferences tomorrow. She won't be called again until then."*
> - Primary button: "Yes, log it"
> - Below: text link "← Back"
>
> Tone is warm and matter-of-fact — the volunteer is doing the right thing for the member.

---

## Screen 10 — Logging & loading next contact (transient)

**State:** between contacts, ~1s

> Design the transient "in-between contacts" state. Shown briefly after the volunteer logs an outcome.
>
> - Burn-down counter in the header advances **immediately** (optimistic) — e.g. "13 of 47".
> - Centre of the screen: two short status lines, e.g. *"Logging Sarah…"* then *"Finding next contact"*. Use a calm spinner — not a progress bar, not a skeleton card.
> - No buttons. No way to interrupt.
>
> Should resolve in ~1 second on a good connection. The point of this screen is to reassure the volunteer the system isn't frozen, without demanding attention.

---

## Screen 11 — End of list / celebration

**Route:** session, list-empty state

> Design the celebration / completion screen. This is the last app moment, but it should hand off to the human debrief — not try to be the close itself.
>
> Content:
> - A single celebratory glyph (party popper or similar — restrained, not animated)
> - Heading: "That's the whole list."
> - Sub-heading: "Thank you, [first name]."
> - Two stat lines: "You called 18 people tonight." / "6 picked up." (both should still display when zero.)
> - Primary button: "Done"
> - Closing line in muted text: *"Stay on the Zoom for the debrief."*
>
> Warm, brief. No social-share buttons, no "rate the app", no email capture. The session ends quietly.

---

## Screen 12 — Failed to load next contact (error)

**State:** error after logging an outcome

> Design the recovery screen shown when we couldn't load the next contact (network blip, Airtable outage). The volunteer must never feel stuck.
>
> Content:
> - Burn-down counter still shows the advanced count — the previous log succeeded.
> - Heading: "Hmm, we couldn't get the next contact."
> - Body line 1: *"Your last call (Sarah, no answer) was logged successfully."* — name + outcome dynamically inserted, so the volunteer isn't anxious about double-logging.
> - Primary button: "Try again"
> - Body line 2 (smaller): *"Still stuck? Message the organiser on Zoom or WhatsApp."* — explicit human fallback.
>
> No stack trace, no error code. Calm, plainspoken.

---

## Screen 13 — Disambiguation: name collision

**State:** join screen, after entering a name already in use

> Design the disambiguation screen for when a volunteer enters a name that's already in this session (e.g. two people called Sam).
>
> Content:
> - Heading: "There's already a Sam in this session."
> - Two stacked buttons:
>   - Primary: "That's me — I'm rejoining" (re-attaches them to their existing participant + assigned contact)
>   - Secondary: "I'm a different Sam" (registers them as a new participant, internally suffixed e.g. "Sam B")
> - Below: text link "← Use a different name"
>
> Plain, non-judgemental. This isn't an error — it's a normal disambiguation.

---

## Notes for working with Claude Design

- Generate one screen at a time and review before moving on — patterns set on early screens (button shape, header treatment, type scale) cascade.
- Generate **Screen 7 (contact card) first** even though it's mid-flow. It's the most constrained and most-used; everything else should harmonise with it.
- After each generation, ask Claude Design to extract reusable primitives (button, input, header, outcome button) so screens 6–13 share a component vocabulary.
- Keep the `aria-` attributes and focus order in mind on every screen — many volunteers use the app on phones with accessibility settings on.
