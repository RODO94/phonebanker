import { z } from 'zod';

export const ProgressSchema = z.object({
  total: z.number().int().nonnegative(),
  called: z.number().int().nonnegative(),
});
export type Progress = z.infer<typeof ProgressSchema>;
