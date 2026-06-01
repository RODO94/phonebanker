import type { Contact } from './contactSchema';

// Only the fields the contact card needs. The Member record carries more
// (onboarding flags, membership number, notes), but those are deliberately not
// mapped into Contact — see the minimum-exposure note in contactSchema.ts.
export const CONTACT_FIELDS = {
  name: 'Name',
  phoneNumber: 'Phone number',

  contactType: 'Contact type',

  summary: 'Summary of calls/meeting notes',
} as const satisfies Record<Exclude<keyof Contact, 'id'>, string>;

export type ContactFieldKey = keyof typeof CONTACT_FIELDS;
export type AirtableContactFieldName = (typeof CONTACT_FIELDS)[ContactFieldKey];
