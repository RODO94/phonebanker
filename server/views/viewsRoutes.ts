import { Hono } from 'hono';

export const viewsRoutes = new Hono();

viewsRoutes.get('/', (c) => c.json({ todo: 'list airtable views' }, 501));
