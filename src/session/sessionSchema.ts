import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  viewName: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;
