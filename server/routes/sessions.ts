import { Hono } from 'hono';

export const sessions = new Hono();

sessions.post('/', (c) => c.json({ todo: 'create session' }, 501));
sessions.get('/:id', (c) => c.json({ todo: 'fetch session', id: c.req.param('id') }, 501));
sessions.post('/:id/join', (c) => c.json({ todo: 'register phonebanker' }, 501));
sessions.get('/:id/next', (c) => c.json({ todo: 'assign next contact' }, 501));
sessions.post('/:id/log', (c) => c.json({ todo: 'log call outcome' }, 501));
sessions.post('/:id/skip', (c) => c.json({ todo: 'skip contact' }, 501));
