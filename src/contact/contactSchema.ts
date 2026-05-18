import { z } from 'zod';

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  assignedPhonebanker: z.string().nullable(),
});
export type Contact = z.infer<typeof ContactSchema>;
