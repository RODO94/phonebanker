import { Hono } from 'hono';
import { MOCK_VIEWS } from './mockViews.js';

export const viewsRoutes = new Hono();

viewsRoutes.get('/', (c) => c.json(MOCK_VIEWS));
