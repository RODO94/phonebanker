import { z } from 'zod';

// The join route branches on status: anything other than 'active' renders the
// SessionEnded screen. Tightened from a free string so that branch is exhaustive.
export const SessionStatusSchema = z.enum(['active', 'ended', 'expired']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  organiserName: z.string(),
  viewId: z.string(),
  viewName: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
  status: SessionStatusSchema,
});
export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionRequestSchema = z.object({
  organiserName: z.string().min(1),
  viewId: z.string(),
  viewName: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
