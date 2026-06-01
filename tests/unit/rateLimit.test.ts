import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../../server/session/rateLimit';

// A controllable clock so refill is deterministic — no real time passes.
function fakeClock(start = 0) {
  const clock = { value: start };
  return { now: () => clock.value, advance: (ms: number) => (clock.value += ms) };
}

describe('rate limiter — "next contact" cap (1 per 5s)', () => {
  it('allows the first request and rejects an immediate second', () => {
    const { now } = fakeClock();
    const limiter = createRateLimiter(1, 5_000, now);

    expect(limiter.tryConsume('participant')).toBe(true);
    expect(limiter.tryConsume('participant')).toBe(false);
  });

  it('allows again once the window has elapsed', () => {
    const { now, advance } = fakeClock();
    const limiter = createRateLimiter(1, 5_000, now);

    expect(limiter.tryConsume('participant')).toBe(true);
    advance(4_999);
    expect(limiter.tryConsume('participant')).toBe(false); // not quite refilled
    advance(1);
    expect(limiter.tryConsume('participant')).toBe(true); // one token back
  });

  it('keys independently — one participant spend does not limit another', () => {
    const { now } = fakeClock();
    const limiter = createRateLimiter(1, 5_000, now);

    expect(limiter.tryConsume('alice')).toBe(true);
    expect(limiter.tryConsume('bob')).toBe(true);
    expect(limiter.tryConsume('alice')).toBe(false);
  });
});

describe('rate limiter — burst capacity', () => {
  it('allows a burst up to capacity, then rejects until refill', () => {
    const { now, advance } = fakeClock();
    const limiter = createRateLimiter(60, 10_000, now); // search backstop config

    for (let i = 0; i < 60; i++) expect(limiter.tryConsume('session')).toBe(true);
    expect(limiter.tryConsume('session')).toBe(false);

    advance(10_000 / 60); // one token's worth of time
    expect(limiter.tryConsume('session')).toBe(true);
  });
});
