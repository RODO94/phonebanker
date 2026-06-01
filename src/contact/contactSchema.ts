import { z } from 'zod';

// Minimum exposure: the Contact is exactly what the contact card renders, no
// more. The full Member record carries onboarding flags, membership number and
// free-text notes that the GDPR posture keeps server-side — they are projected
// out before they ever cross the proxy (see listBatchContacts' fields[] query).
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

  summary: z.string().optional(),
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
