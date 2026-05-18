import { z } from 'zod';

export const ViewSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const ViewListSchema = z.array(ViewSchema);
export type View = z.infer<typeof ViewSchema>;
