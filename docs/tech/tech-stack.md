# Tech Stack

## Summary

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite + React + TypeScript | No SSR, fast dev server, simple mental model |
| Routing | TanStack Router | Type-safe params (critical for session join links); file-based routing |
| Client state | Zustand | Lightweight; manages current contact, phonebanker name, burn-down |
| Validation | Zod | Validates all Airtable API responses; catches schema drift early |
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

---

## Proxy server (Hono)

A thin Node.js server with three responsibilities:
1. Hold the Airtable API key in an environment variable — never exposed to the client
2. Forward requests to the Airtable REST API and return shaped responses
3. Handle session assignment writes: set and clear `assigned_phonebanker` on Member records

### Session state
Assignment locking (who is calling whom) is persisted directly in Airtable via the `assigned_phonebanker` field — see [data-and-airtable.md](data-and-airtable.md). The Hono server holds no durable state; an in-process Map tracks only assignment timestamps for the 30-minute timeout check. If the server restarts, timestamps reset but Airtable remains the record of truth.

### Hono route groups
```
POST   /api/sessions              — create a new session
GET    /api/sessions/:id          — fetch session (script, message, view name)
POST   /api/sessions/:id/join     — register phonebanker name
GET    /api/sessions/:id/next     — assign and return next available contact
POST   /api/sessions/:id/log      — write phone log, clear assignment
POST   /api/sessions/:id/skip     — skip contact, clear assignment
GET    /api/views                 — list available Airtable views for session setup
```

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

```
phonebanker/
├── src/                        # Vite frontend
│   ├── routes/                 # TanStack Router file-based routes
│   ├── components/             # UI components (own design system)
│   ├── store/                  # Zustand slices
│   ├── schemas/                # Zod schemas for API responses
│   └── main.tsx
├── server/                     # Hono proxy
│   ├── routes/                 # Route handlers
│   ├── airtable/               # Airtable client + query helpers
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

---

## Environment variables

```
AIRTABLE_API_KEY=        # Never exposed to client
AIRTABLE_BASE_ID=        # The base in use (swap for test base in development)
PORT=3001                # Hono server port
VITE_API_BASE_URL=       # Points frontend at the Hono proxy
```
