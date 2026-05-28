import type { Contact } from './contactSchema';

export const CONTACT_FIELDS = {
  name: 'Name',
  phoneNumber: 'Phone number',

  contactType: 'Contact type',

  tags: 'Tags (group/branch)',
  phoneCallAvailability: 'Phone call availability',

  newMemberCallDone: 'New member call done?',
  hadInitialOneToOne: 'Had initial 1:1?',
  invitedToWhatsApp: 'Invited to WhatsApp?',

  membershipNumber: '# membership number',

  notes: 'Notes (group/branch)',
  summary: 'Summary of calls/meeting notes',

  dateEnteredInDatabase: 'Date entered in database',
} as const satisfies Record<Exclude<keyof Contact, 'id'>, string>;

export type ContactFieldKey = keyof typeof CONTACT_FIELDS;
export type AirtableContactFieldName = (typeof CONTACT_FIELDS)[ContactFieldKey];
