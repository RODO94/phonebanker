import { Hono } from 'hono';
import { CreateSessionRequestSchema } from '../../src/session/sessionSchema.js';
import { createAirtableSession } from './airtableSession.js';
import { MOCK_CONTACTS } from '../contact/mockContacts.js';

export const sessionRoutes = new Hono();

sessionRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid session payload', issues: parsed.error.issues }, 400);
  }
  const { organiserName, viewId, viewName, callScript, smsMessage } = parsed.data;

  try {
    const { id } = await createAirtableSession({
      organiserName,
      viewId,
      viewName,
      callScript,
      smsMessage,
    });
    return c.json({
      id,
      organiserName,
      viewId,
      viewName,
      callScript,
      smsMessage,
      status: 'active',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return c.json({ error: 'failed to create session', detail: message }, 502);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT 0 MOCKS — do not ship.
// These return schema-valid shapes so the phonebanker screens (Segments B1/B2)
// can build against real HTTP. Segment A replaces every handler below with the
// real Airtable-backed assignment coordinator. Contract + owners are documented
// in plans/segment-0-foundation.md and docs/tech/tech-stack.md § Hono route groups.
// ─────────────────────────────────────────────────────────────────────────────

// GET /:id → Session (status drives the SessionEnded gate)
sessionRoutes.get('/:id', (c) =>
  c.json({
    id: c.req.param('id'),
    organiserName: 'Mock Organiser',
    viewId: 'viwMock',
    viewName: "Tonight's list",
    callScript: '# Why we are calling\n\nMock call script for local dev.',
    smsMessage: "Hi, it's [Name] from London Renters Union — I was calling because…",
    status: 'active',
  }),
);

// POST /:id/members/search → { matches, truncated }
sessionRoutes.post('/:id/members/search', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = String(body?.query ?? '').toLowerCase();
  const matches = MOCK_CONTACTS.filter((m) => m.name.toLowerCase().includes(query))
    .slice(0, 5)
    .map((m) => ({ id: m.id, name: m.name }));
  return c.json({ matches, truncated: false });
});

// POST /:id/join → { participantId, displayName }
sessionRoutes.post('/:id/join', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const member = MOCK_CONTACTS.find((m) => m.id === body?.memberId) ?? MOCK_CONTACTS[0];
  return c.json({ participantId: member.id, displayName: member.name });
});

// GET /:id/state → polling envelope { progress, claim }
sessionRoutes.get('/:id/state', (c) =>
  c.json({
    progress: { total: MOCK_CONTACTS.length, called: 0 },
    claim: { kind: 'idle' },
  }),
);

// POST /:id/next → ClaimResult
sessionRoutes.post('/:id/next', (c) => c.json({ kind: 'claimed', contact: MOCK_CONTACTS[0] }));

// POST /:id/log → { ok: true }
sessionRoutes.post('/:id/log', (c) => c.json({ ok: true }));

// POST /:id/skip → { ok: true }
sessionRoutes.post('/:id/skip', (c) => c.json({ ok: true }));
