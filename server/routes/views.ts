import { Hono } from 'hono';

export const views = new Hono();

views.get('/', (c) => c.json({ todo: 'list airtable views' }, 501));
