import { z } from 'zod';

// The agreed outcome set. `skipped` is logged via the dedicated skip endpoint;
// the other three form the body of POST /:id/log.
export const OutcomeSchema = z.enum([
  'had-conversation',
  'wants-removed',
  'no-answer',
  'skipped',
]);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const LogOutcomeSchema = z.enum([
  'had-conversation',
  'wants-removed',
  'no-answer',
]);
export type LogOutcome = z.infer<typeof LogOutcomeSchema>;

// POST /api/sessions/:id/log. `messageSent` (did the volunteer send the SMS /
// leave a voicemail) is required on 'no-answer' and absent otherwise — the
// NoAnswerFollowUp micro-flow supplies it.
export const LogRequestSchema = z
  .object({
    contactId: z.string(),
    outcome: LogOutcomeSchema,
    messageSent: z.boolean().optional(),
  })
  .refine((v) => v.outcome !== 'no-answer' || typeof v.messageSent === 'boolean', {
    message: 'messageSent is required when outcome is no-answer',
    path: ['messageSent'],
  });
export type LogRequest = z.infer<typeof LogRequestSchema>;

// POST /api/sessions/:id/skip
export const SkipRequestSchema = z.object({
  contactId: z.string(),
});
export type SkipRequest = z.infer<typeof SkipRequestSchema>;

export const OkResponseSchema = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponseSchema>;
