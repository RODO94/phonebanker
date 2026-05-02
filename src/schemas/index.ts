import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),
  viewName: z.string(),
  callScript: z.string(),
  smsMessage: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  assignedPhonebanker: z.string().nullable(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ProgressSchema = z.object({
  total: z.number().int().nonnegative(),
  called: z.number().int().nonnegative(),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const ViewListSchema = z.array(ViewSchema);
