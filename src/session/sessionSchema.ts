import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  organiserName: z.string(),
  viewId: z.string(),
  viewName: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
  status: z.string(),
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
