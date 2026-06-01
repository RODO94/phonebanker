import { z } from 'zod';

// Sent when the organiser checks how many Member records carry a batch tag,
// before committing to the session. The count is the trust signal that replaces
// the old view dropdown: zero means a typo or an untagged batch.
export const BatchCountRequestSchema = z.object({
  batch: z.string().min(1),
});
export type BatchCountRequest = z.infer<typeof BatchCountRequestSchema>;

export const BatchCountSchema = z.object({
  batch: z.string(),
  count: z.number().int().nonnegative(),
});
export type BatchCount = z.infer<typeof BatchCountSchema>;
