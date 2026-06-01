// A per-key token bucket held in process memory — consistent with the
// coordinator's in-memory model (a restart resets every bucket, which is fine
// for a rate limit). `capacity` is the burst ceiling; tokens refill continuously
// at `capacity / windowMs`, so a steady caller is held to `capacity` requests
// per `windowMs`. `now` is injected so the refill is deterministic under test.
type Bucket = { tokens: number; lastRefill: number };

export type RateLimiter = { tryConsume: (key: string) => boolean };

export function createRateLimiter(
  capacity: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const refillPerMs = capacity / windowMs;

  return {
    // Returns true if the caller may proceed (a token was available and spent),
    // false if the bucket is empty and the request should be rejected.
    tryConsume(key) {
      const t = now();
      const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: t };
      bucket.tokens = Math.min(capacity, bucket.tokens + (t - bucket.lastRefill) * refillPerMs);
      bucket.lastRefill = t;
      buckets.set(key, bucket);

      if (bucket.tokens < 1) return false;
      bucket.tokens -= 1;
      return true;
    },
  };
}
