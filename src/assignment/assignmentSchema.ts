import { z } from 'zod';
import { ContactSchema } from '@/contact/contactSchema';

// The payload describing a held claim: the contact plus the audit context that
// makes the claim attributable. `claimedAt` is rebuilt from the Airtable
// `Claimed at` field on hydration, so the 30-minute timeout survives a restart.
export const AssignmentSchema = z.object({
  contact: ContactSchema,
  claimedAt: z.string(), // ISO timestamp
  sessionId: z.string(),
  participantId: z.string(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;
