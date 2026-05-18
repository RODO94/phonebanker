import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { sessionRoutes } from './session/sessionRoutes.js';
import { viewsRoutes } from './views/viewsRoutes.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/sessions', sessionRoutes);
app.route('/api/views', viewsRoutes);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono proxy listening on http://localhost:${info.port}`);
});
