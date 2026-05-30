import { test, expect } from '@playwright/test';

// HTTP-level concurrency check against a real running server + Airtable base.
// The double-call guarantee is proven deterministically at the unit level
// (tests/unit/assignmentCoordinator.test.ts); this is the integration counterpart
// over the actual route stack. It needs a pre-seeded session whose view contains
// the given member recordIds, so it is gated behind env vars and skipped in CI
// until a test base + session are wired up. Full UI-driven e2e lands with B2.
//
//   E2E_SESSION_ID=recXXXX \
//   E2E_MEMBER_IDS=recA,recB,recC \
//   npx playwright test concurrentClaims

const sessionId = process.env.E2E_SESSION_ID;
const memberIds = (process.env.E2E_MEMBER_IDS ?? '').split(',').filter(Boolean);

test.describe('concurrent claims over HTTP', () => {
  test.skip(
    !sessionId || memberIds.length < 2,
    'set E2E_SESSION_ID and a comma-separated E2E_MEMBER_IDS (≥2) to run',
  );

  test('two phonebankers never claim the same contact', async ({ request }) => {
    const base = `/api/sessions/${sessionId}`;

    // Each member joins, then claims simultaneously.
    for (const memberId of memberIds) {
      const join = await request.post(`${base}/join`, { data: { memberId } });
      expect(join.ok()).toBeTruthy();
    }

    const claims = await Promise.all(
      memberIds.map((memberId) =>
        request.post(`${base}/next`, { headers: { 'X-Participant-Id': memberId } }),
      ),
    );

    const claimedContactIds: string[] = [];
    for (const res of claims) {
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      if (body.kind === 'claimed') claimedContactIds.push(body.contact.id);
    }

    expect(new Set(claimedContactIds).size).toBe(claimedContactIds.length); // all distinct
  });
});
