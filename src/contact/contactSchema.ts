import { z } from 'zod';

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string(),

  contactType: z
    .enum([
      'Member (paying)',
      'Member (non-paying)',
      'Cancelled direct debit',
      'Interested (did not complete)',
      'Contact',
    ])
    .optional(),

  tags: z.array(z.string()).optional(),
  phoneCallAvailability: z.array(z.string()).optional(),

  newMemberCallDone: z.boolean().optional(),
  hadInitialOneToOne: z.boolean().optional(),
  invitedToWhatsApp: z.boolean().optional(),

  membershipNumber: z.number().optional(),

  notes: z.string().optional(),
  summary: z.string().optional(),

  dateEnteredInDatabase: z.string().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ContactListSchema = z.array(ContactSchema);

// Returned by POST /api/sessions/:id/next — the claim outcome. Legitimate
// outcomes are typed; only world-broken conditions throw (see
// patterns-and-conventions.md § Fetch and return type structures).
export const ClaimResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('claimed'), contact: ContactSchema }),
  z.object({ kind: z.literal('list-exhausted') }),
]);
export type ClaimResult = z.infer<typeof ClaimResultSchema>;
