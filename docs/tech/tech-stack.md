# Tech Stack

## Summary

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite + React + TypeScript | No SSR, fast dev server, simple mental model |
| Routing | TanStack Router | Type-safe params (critical for session join links); file-based routing |
| Client state | Zustand | Lightweight; manages current contact, phonebanker name, burn-down |
| Validation | Zod | Validates all Airtable API responses; catches schema drift early |
| Styling | Pure CSS | Native nesting and custom properties; no preprocessor; co-located with components |
| Proxy server | Hono (Node.js) | TypeScript-first, minimal, hides Airtable API key from client |
| Unit tests | Vitest | Fast, native TypeScript, pairs with Vite |
| E2E tests | Playwright | Handles concurrent sessions; modern API |

---

## Frontend

### Vite + React + TypeScript
No server-side rendering. The app is a pure client-side SPA served as static files. The Hono proxy is the only server process.

### TanStack Router
File-based routing with full type safety on route params. The session join link carries a session ID as a URL param — TanStack Router ensures this is typed end-to-end with no string casting.

### Zustand
One store, organised into slices:
- `session` — session ID, phonebanker name, call script, SMS message
- `contact` — current assigned contact record
- `progress` — total contacts in session, count of called contacts

State is not persisted to localStorage. If a phonebanker refreshes, they re-enter their name and the app re-fetches their assigned contact from Airtable (via `assigned_phonebanker`).

### Zod
Every response from the Hono proxy is parsed through a Zod schema before use. This makes Airtable field renames or type changes a loud, early failure rather than a silent runtime bug.

### Styling — pure CSS

No preprocessor, no CSS-in-JS, no utility framework. Vite handles `.css` imports natively; modern browsers cover nesting, custom properties, `:has()` and `:where()` without polyfills. The approach draws on [Jacob Bleser's CSS methodology](https://jacobb.nyc/writing/how-i-write-css-in-2024).

**Layered structure.** Styles are organised in distinct layers, each building on the last:

1. **Preflight** — global resets, base typography, baseline accessibility floor (44px tap targets, 16px text minimum). Lives at `src/styles/preflight.css`.
2. **Tokens** — design tokens as CSS custom properties: colour scale, type scale, spacing scale, radii. Lives at `src/styles/tokens.css`. One token per shade; no inline magic values elsewhere.
3. **Elements** — base styling of semantic HTML elements (`h1`, `p`, `button`, `input`). Colour and font only; no layout, no typography variants. Lives at `src/styles/elements.css`.
4. **Components** — component-specific styles co-located alongside the component (`ContactCard/ContactCard.css` next to `ContactCard.tsx`). Imported by the component module.
5. **Layout primitives** — preset-and-modifier layout helpers (e.g. `[layout="row"]`, `[layout="column"]`) for repeatable arrangements. Lives at `src/styles/layout.css`.

**Conventions.**
- Native CSS nesting throughout; one component, one file, one root selector.
- **Classes for variants and component identity. Attribute selectors reserved for ARIA and semantic HTML state.** `<button class="primary" aria-disabled="true">` is the canonical shape — classes describe what the element *is*; attributes describe what state it's *in*. This keeps the cascade readable as two distinct layers and avoids loading React's `className` idiom with custom attribute semantics that contributors would otherwise have to learn.
- Variants are full re-declarations of a component's appearance, not partial overrides. State styles (`:hover`, `:focus-visible`, `[aria-disabled]`) layer on top.
- Mobile-first. Default styles are the mobile layout; `@media (min-width: ...)` adds desktop adjustments. The article doesn't address responsive design — this is a Phonebanker extension because the volunteer screen is mobile-first while the organiser flow is desktop-first.
- No colour-only meaning. Every state that uses colour also uses icon, label, or position. Anchored to the design-principles doc.

**Shared primitives.** A small set of React components in `src/shared/` (Button, Input, FormField, layout primitives) wrap the CSS conventions so feature contributors don't write raw HTML with class strings. The component exposes intent props (`<Button variant="primary">`); the CSS is its private implementation. This lowers the floor on feature work — contributors learn the components, not the CSS conventions underneath — and centralises styling changes in one place per primitive. A primitive earns its place when it's used in more than one feature folder with stable visual semantics.

```
src/shared/
├── Button/
│   ├── Button.tsx
│   ├── Button.css
│   └── Button.test.tsx
├── Input/
└── Row/                  # layout primitive
```

---

## Proxy server (Hono)

A thin Node.js server with three responsibilities:
1. Hold the Airtable API key in an environment variable — never exposed to the client
2. Forward requests to the Airtable REST API and return shaped responses
3. Coordinate session assignment via a named assignment coordinator (see `server/session/`)

### Assignment coordinator
A factory `createAssignmentCoordinator(deps)` returning `{ joinSession, claimNextUnassignedContact, releaseContact, recordOutcome }`. Holds a `Map<sessionId, SessionState>` in closure. Each `SessionState` contains a per-session async mutex (`async-mutex`), the participant registry, and a cached copy of the Airtable member directory for that session.

Every method that takes a `sessionId` lazily hydrates the corresponding `SessionState` on first touch: read the session record from Airtable, populate the registry and directory, then proceed. If the session doesn't exist, throw `SessionNotFoundError`. This makes restart recovery automatic — no in-memory state is load-bearing.

Assignments are guarded end-to-end:
1. The mutex serialises operations per session
2. Inside the mutex, the coordinator reads `assigned_phonebanker` from Airtable, confirms the candidate contact is still unassigned, then writes both `assigned_phonebanker` (the volunteer's recordId) and `claimed_at` (the timestamp) in a single PATCH
3. The in-memory mirror is updated after the Airtable write succeeds
4. Polling endpoints read from the mirror; writes always validate against Airtable

`claimNextUnassignedContact` is idempotent per participant — a participant already holding a claim gets the same contact back. The 30-minute timeout is rebuilt from `claimed_at` on lazy hydration, so the timer is durable across server restart.

### Identity
`participantId = member.recordId`. Resolved at join via a bounded member search (top-5, 6-char minimum, server-side). This is the audit identity in Phone Logs. See [security-and-trust.md](security-and-trust.md).

### Errors
Thrown as named classes the route handler maps to HTTP statuses:

| Class | HTTP | Meaning |
|-------|------|---------|
| `SessionNotFoundError` | 404 | Session ID doesn't exist in Airtable |
| `ParticipantNotRegisteredError` | 401 | Participant isn't in the session's registry (rejoin) |
| `AirtableUnavailableError` | 502 | Transport-level failure reaching Airtable |

`ClaimResult` is a discriminated union returned by `claimNextUnassignedContact`:
```
type ClaimResult =
  | { kind: 'claimed'; contact: Contact }
  | { kind: 'list-exhausted' }
```
Legitimate outcomes are typed; only world-is-broken conditions throw.

### Hono route groups
```
POST   /api/sessions                       — create a new session
GET    /api/sessions/:id                   — fetch session (script, message, view name)
POST   /api/sessions/:id/members/search    — bounded member search (returns up to 5)
POST   /api/sessions/:id/join              — register participant (recordId)
GET    /api/sessions/:id/state             — polling envelope (claim + burn-down)
POST   /api/sessions/:id/next              — claim next available contact (idempotent)
POST   /api/sessions/:id/log               — write phone log, clear assignment
POST   /api/sessions/:id/skip              — skip contact, clear assignment
GET    /api/views                          — list available Airtable views for session setup
```

### Schema sharing
Zod schemas describing the API contract live with their domain on the client side (`src/session/sessionSchema.ts`, `src/contact/contactSchema.ts`, `src/views/viewsSchema.ts`). The server imports them via an extended `tsconfig.server.json` rather than a top-level `shared/` folder — one config edit, no domain dispersion. If the project later splits into separate packages, the move to `shared/` or a packages monorepo is a one-time migration the codebase will earn at that point.

### Transport
`airtableFetch<T>(path: string, schema: ZodSchema<T>, init?: RequestInit): Promise<T>` — generic in the parsed type; the schema is a required argument, parsed at the transport boundary. This keeps transport reusable across domains and makes the expected shape visible at every call site.

---

## Testing

### Vitest — unit and integration
- Zod schemas
- Assignment logic (locking, timeout, skip)
- Airtable response shaping

### Playwright — end-to-end
Two workers run against a test Airtable base to simulate concurrent phonebankers. Key scenarios:
- Two phonebankers never receive the same contact
- Skip returns contact to pool
- 30-minute timeout returns contact to pool
- Burn-down counter reaches zero → celebration screen

---

## Project structure

Files are co-located by domain. Each domain folder holds everything for that unit: its schemas, its components (when written), its CSS file, its tests. Domain folders appear as the first file in them is written — empty shells are not pre-created.

```
phonebanker/
├── src/                        # Vite frontend
│   ├── routes/                 # TanStack Router file-based routes (location fixed by router)
│   ├── session/                # Session domain: schema, screens, store slice when split
│   ├── contact/                # Contact + progress domain: schema, ContactCard, outcomes
│   ├── views/                  # Airtable view-selection (organiser session setup)
│   ├── shared/                 # Cross-cutting React primitives: Button, Input, layout, etc.
│   ├── styles/                 # Global cross-cutting CSS (preflight, tokens, elements, layout)
│   ├── store/                  # Zustand app store — single store while it earns no slicing
│   └── main.tsx
├── server/                     # Hono proxy
│   ├── session/                # Session routes + assignment coordinator + member-search resolver
│   ├── views/                  # Airtable view routes
│   ├── airtable/               # HTTP transport (Zod-parsed at boundary, no domain logic)
│   └── index.ts
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/                    # Playwright
├── docs/
└── package.json                # Single package, dev and server scripts
```

---

## What's intentionally excluded

| Tool | Reason not used |
|------|----------------|
| Next.js | No SSR needed; adds complexity for community handover |
| Express | Hono is lighter and TypeScript-native |
| Redux | Zustand is sufficient and simpler for community devs |
| Redis / external session store | Airtable persists assignment state; no extra infra needed |
| Cypress | Playwright covers e2e; no need for two frameworks |
| ORM / database | Airtable is the data layer; no local DB |
| SASS / PostCSS | Native CSS nesting and custom properties cover the same ground without a build step |
| Tailwind / utility CSS | Component-co-located CSS reads more naturally to the maintainer floor than utility classes in JSX |
| CSS-in-JS (styled-components, emotion) | Runtime cost and an extra idiom on top of React; pure CSS is sufficient |

---

## Environment variables

```
AIRTABLE_API_KEY=        # Never exposed to client
AIRTABLE_BASE_ID=        # The base in use (swap for test base in development)
PORT=3001                # Hono server port
VITE_API_BASE_URL=       # Points frontend at the Hono proxy
```
