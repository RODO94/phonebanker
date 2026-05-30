import { z } from 'zod';
import { AssignmentSchema } from '@/assignment/assignmentSchema';
import { ProgressSchema } from '@/contact/progressSchema';

// What GET /api/sessions/:id/state returns on every poll (~10s). `claim` is the
// participant's current standing in the call loop; `progress` is the burn-down.
// Named *Response to avoid colliding with the coordinator's in-memory SessionState.
export const ClaimStateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('assigned'), assignment: AssignmentSchema }),
  z.object({ kind: z.literal('idle') }), // joined, holding no contact
  z.object({ kind: z.literal('exhausted') }), // no contacts left to claim
]);
export type ClaimState = z.infer<typeof ClaimStateSchema>;

export const SessionStateResponseSchema = z.object({
  progress: ProgressSchema,
  claim: ClaimStateSchema,
});
export type SessionStateResponse = z.infer<typeof SessionStateResponseSchema>;
