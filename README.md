# Phonebanker

Web app for London Renters Union volunteers to run remote phonebanking sessions. See [docs/OVERVIEW.md](docs/OVERVIEW.md).

## Setup

```bash
npm install
cp .env.example .env   # fill in AIRTABLE_API_KEY and AIRTABLE_BASE_ID
npm run dev            # starts Vite (5173) + Hono (3001)
```

## Scripts

- `npm run dev` — Vite frontend + Hono proxy
- `npm run build` — type-check and build the frontend
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright end-to-end tests

## Layout

See [docs/tech/tech-stack.md](docs/tech/tech-stack.md).
