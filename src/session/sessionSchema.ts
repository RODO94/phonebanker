import { z } from 'zod';

// The join route branches on status: anything other than 'active' renders the
// SessionEnded screen. Tightened from a free string so that branch is exhaustive.
export const SessionStatusSchema = z.enum(['active', 'ended', 'expired']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  organiserName: z.string(),
  // The free-text batch tag the organiser sets on Member records in Airtable.
  // It is the session's contact filter, replacing the (Enterprise-only) view API.
  phonebankBatch: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
  status: SessionStatusSchema,
});
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionRequestSchema = z.object({
  organiserName: z.string().min(1),
  phonebankBatch: z.string().min(1),
  callScript: z.string(),
  smsMessage: z.string(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
