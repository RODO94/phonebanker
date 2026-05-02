import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { sessions } from './routes/sessions.js';
import { views } from './routes/views.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/sessions', sessions);
app.route('/api/views', views);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Hono proxy listening on http://localhost:${info.port}`);
});
