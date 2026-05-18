# Phonebanker — Project Overview

A lightweight web app that helps London Renters Union volunteers run remote phonebanking sessions together. It shows one member at a time from a session list, prevents two volunteers calling the same person, and logs outcomes back to Airtable.

## Who is this for?

| Role | What they do |
|------|-------------|
| **Organiser** | Creates a session: selects a contact list from Airtable, writes a call script and a voicemail/SMS message template, shares a join link with volunteers |
| **Phonebanker** | Joins a session by name, phones contacts one at a time, records whether the person picked up, and copies the pre-written message if needed |

## The core loop (session night)

1. Organiser sets up session → shares link
2. Phonebankers enter their name and join
3. App assigns next available contact (one at a time, no duplicates)
4. Phonebanker calls, records outcome, moves to next contact
5. Burn-down counter shows progress; celebration screen when list is complete

## Design north star

Simple enough for any volunteer, regardless of digital literacy. Follow GDS (gov.uk Design System) principles: clear labels, high contrast, one task per screen. See [design-principles.md](design/design-principles.md).

## Key constraints

- GDPR: phonebankers see **one contact at a time**, no bulk export
- No auth: phonebankers identify by typing their name
- No in-app calling or SMS sending — app provides a copy button for the message template
- Airtable is the source of truth for member data and call logs

## Building a feature?

Start with the **[feature-cheatsheet.md](feature-cheatsheet.md)** — quick reference for what to consider and where to read more, organised by feature type.

## Document map

### Design

| Doc | What's inside |
|-----|--------------|
| [design/users-and-journeys.md](design/users-and-journeys.md) | Personas, session flows, edge cases |
| [design/service-blueprint.md](design/service-blueprint.md) | The whole night end-to-end: where the app sits inside the wider service |
| [design/design-principles.md](design/design-principles.md) | GDS rules, accessibility, key UI patterns |
| [design/wireframes-contact-card.md](design/wireframes-contact-card.md) | Low-fi wireframes for the phonebanker's main screen and its states |
| [design/safeguarding.md](design/safeguarding.md) | How the service supports volunteers and members through hard calls |
| [design/scope.md](design/scope.md) | MVP in-scope, out-of-scope, future backlog |

### Tech

| Doc | What's inside |
|-----|--------------|
| [tech/data-and-airtable.md](tech/data-and-airtable.md) | Airtable table structures, fields, outcomes, GDPR notes |
| [tech/security-and-trust.md](tech/security-and-trust.md) | Threat model, join link lifecycle, audit, data sensitivity |
| [tech/tech-stack.md](tech/tech-stack.md) | Stack choices, project structure, env vars, what's excluded |
| [tech/patterns-and-conventions.md](tech/patterns-and-conventions.md) | Code-recipe layer: how types, CSS, and fetch/return shapes look when you sit down to write them |
