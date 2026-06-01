import { Hono } from 'hono';
import { BatchCountRequestSchema } from '../../src/batch/batchSchema.js';
import { countMembersInBatch } from './batchMembers.js';
import { AirtableUnavailableError } from '../airtable/client.js';

export const batchesRoutes = new Hono();

// POST /api/batches/count — how many Member records carry this batch tag. The
// organiser checks this before creating the session; zero means a typo or an
// untagged batch, which is the signal to fix the tag in Airtable and retry.
batchesRoutes.post('/count', async (c) => {
  const parsed = BatchCountRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid batch payload' }, 400);
  try {
    const count = await countMembersInBatch(parsed.data.batch);
    return c.json({ batch: parsed.data.batch, count });
  } catch (err) {
    if (err instanceof AirtableUnavailableError) {
      return c.json({ error: 'airtable unavailable' }, 502);
    }
    const detail = err instanceof Error ? err.message : String(err);
    return c.json({ error: 'internal error', detail }, 500);
  }
});
