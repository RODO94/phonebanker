import { Hono } from 'hono';
import { CreateSessionRequestSchema } from '../../src/session/sessionSchema.js';
import { createAirtableSession } from './airtableSession.js';

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

sessionRoutes.get('/:id', (c) => c.json({ todo: 'fetch session', id: c.req.param('id') }, 501));
sessionRoutes.post('/:id/join', (c) => c.json({ todo: 'register phonebanker' }, 501));
sessionRoutes.get('/:id/next', (c) => c.json({ todo: 'assign next contact' }, 501));
sessionRoutes.post('/:id/log', (c) => c.json({ todo: 'log call outcome' }, 501));
sessionRoutes.post('/:id/skip', (c) => c.json({ todo: 'skip contact' }, 501));
