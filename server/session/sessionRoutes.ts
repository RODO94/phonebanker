import { Hono } from 'hono';
import type { Context } from 'hono';
import { CreateSessionRequestSchema } from '../../src/session/sessionSchema.js';
import { MemberSearchRequestSchema, JoinRequestSchema } from '../../src/session/joinSchema.js';
import { LogRequestSchema, SkipRequestSchema } from '../../src/contact/outcomeSchema.js';
import { createAirtableSession } from './airtableSession.js';
import { createAssignmentCoordinator } from './assignmentCoordinator.js';
import { createAirtableCoordinatorDeps } from './airtableCoordinatorDeps.js';
import { createRateLimiter } from './rateLimit.js';
import { SessionNotFoundError, ParticipantNotRegisteredError } from './errors.js';
import { AirtableUnavailableError } from '../airtable/client.js';

// The participant's identity, carried as a request header on every authed call.
// Lost on refresh by design — rebuilt by re-joining (no cookie, no persistence).
const PARTICIPANT_HEADER = 'X-Participant-Id';

const coordinator = createAssignmentCoordinator(createAirtableCoordinatorDeps());

// "Next contact" is capped per participant at 1 request / 5s — the scraping
// mitigation in security-and-trust.md. The one-call-at-a-time UI never needs to
// go faster, so a legitimate volunteer never trips it.
const nextLimiter = createRateLimiter(1, 5_000);

// The join search runs pre-join (no participant yet), so it can only be keyed by
// session. The cap is deliberately generous — a backstop against a runaway
// scraping script (and the Airtable load it would cause), set well above what a
// roomful of volunteers typing their names concurrently would reach, so it does
// not erode the "ease of joining" value. Per security-and-trust.md, slowing
// enumeration — not preventing it — is the accepted posture.
const searchLimiter = createRateLimiter(60, 10_000);

export const sessionRoutes = new Hono();

function mapError(c: Context, err: unknown) {
  if (err instanceof SessionNotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof ParticipantNotRegisteredError) return c.json({ error: err.message }, 401);
  if (err instanceof AirtableUnavailableError) return c.json({ error: 'airtable unavailable' }, 502);
  const detail = err instanceof Error ? err.message : String(err);
  return c.json({ error: 'internal error', detail }, 500);
}

function participantId(c: Context): string {
  const id = c.req.header(PARTICIPANT_HEADER);
  if (!id) throw new ParticipantNotRegisteredError('missing participant header');
  return id;
}

// POST /api/sessions — create a session (writes the record to Airtable).
sessionRoutes.post('/', async (c) => {
  const parsed = CreateSessionRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'invalid session payload', issues: parsed.error.issues }, 400);
  }
  try {
    const { id } = await createAirtableSession(parsed.data);
    return c.json({ id, ...parsed.data, status: 'active' });
  } catch (err) {
    return mapError(c, err);
  }
});

// GET /api/sessions/:id — fetch the session (script, message, status gate).
sessionRoutes.get('/:id', async (c) => {
  try {
    return c.json(await coordinator.getSession(c.req.param('id')));
  } catch (err) {
    return mapError(c, err);
  }
});

// POST /api/sessions/:id/members/search — bounded join search (top 5).
sessionRoutes.post('/:id/members/search', async (c) => {
  const parsed = MemberSearchRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid search payload' }, 400);
  if (!searchLimiter.tryConsume(c.req.param('id'))) {
    return c.json({ error: 'too many requests' }, 429);
  }
  try {
    return c.json(await coordinator.searchMembers(c.req.param('id'), parsed.data.query));
  } catch (err) {
    return mapError(c, err);
  }
});

// POST /api/sessions/:id/join — register the chosen member as a participant.
sessionRoutes.post('/:id/join', async (c) => {
  const parsed = JoinRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid join payload' }, 400);
  try {
    return c.json(await coordinator.joinSession(c.req.param('id'), parsed.data.memberId));
  } catch (err) {
    return mapError(c, err);
  }
});

// GET /api/sessions/:id/state — the polling envelope (claim + burn-down).
sessionRoutes.get('/:id/state', async (c) => {
  try {
    return c.json(await coordinator.getState(c.req.param('id'), participantId(c)));
  } catch (err) {
    return mapError(c, err);
  }
});

// POST /api/sessions/:id/next — claim the next available contact (idempotent).
sessionRoutes.post('/:id/next', async (c) => {
  try {
    const pid = participantId(c);
    if (!nextLimiter.tryConsume(pid)) {
      return c.json({ error: 'too many requests' }, 429);
    }
    return c.json(await coordinator.claimNextUnassignedContact(c.req.param('id'), pid));
  } catch (err) {
    return mapError(c, err);
  }
});

// POST /api/sessions/:id/log — write a phone log, clear the assignment.
sessionRoutes.post('/:id/log', async (c) => {
  const parsed = LogRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid log payload', issues: parsed.error.issues }, 400);
  try {
    await coordinator.recordOutcome(c.req.param('id'), participantId(c), parsed.data);
    return c.json({ ok: true });
  } catch (err) {
    return mapError(c, err);
  }
});

// POST /api/sessions/:id/skip — log a skip, return the contact to the pool.
sessionRoutes.post('/:id/skip', async (c) => {
  const parsed = SkipRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid skip payload' }, 400);
  try {
    await coordinator.releaseContact(c.req.param('id'), participantId(c), parsed.data.contactId);
    return c.json({ ok: true });
  } catch (err) {
    return mapError(c, err);
  }
});
