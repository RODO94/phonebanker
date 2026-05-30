export const ASSIGNMENT_TIMEOUT_MS = 30 * 60 * 1000;

// Lazy 30-minute expiry: a claim is only "live" while its timestamp sits inside
// the window. Expired claims are treated as unclaimed on the next read or claim,
// so the timeout needs no background timer and rebuilds itself from Airtable's
// `phoned_at` on hydration — durable across restart, nothing load-bearing in
// memory. `now` is injected so the timeout is deterministically testable.
export function isClaimLive(claimedAt: string | null, now: number): boolean {
  if (!claimedAt) return false;
  const claimedMs = Date.parse(claimedAt);
  if (Number.isNaN(claimedMs)) return false;
  return now - claimedMs < ASSIGNMENT_TIMEOUT_MS;
}
