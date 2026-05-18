import { Hono } from 'hono';

export const sessionRoutes = new Hono();

sessionRoutes.post('/', (c) => c.json({ todo: 'create session' }, 501));
sessionRoutes.get('/:id', (c) => c.json({ todo: 'fetch session', id: c.req.param('id') }, 501));
sessionRoutes.post('/:id/join', (c) => c.json({ todo: 'register phonebanker' }, 501));
sessionRoutes.get('/:id/next', (c) => c.json({ todo: 'assign next contact' }, 501));
sessionRoutes.post('/:id/log', (c) => c.json({ todo: 'log call outcome' }, 501));
sessionRoutes.post('/:id/skip', (c) => c.json({ todo: 'skip contact' }, 501));
