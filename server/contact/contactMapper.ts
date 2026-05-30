import { ContactSchema } from '../../src/contact/contactSchema.js';
import { CONTACT_FIELDS } from '../../src/contact/contactFields.js';
import type { Contact } from '../../src/contact/contactSchema.js';

// Maps a raw Airtable Member record into a Contact, then parses it through the
// schema so field renames or type drift in the base fail loudly here rather than
// surfacing as a silent runtime bug downstream. Empty Airtable fields are simply
// absent from `fields`, which lines up with the schema's optional members.
export function toContact(id: string, fields: Record<string, unknown>): Contact {
  return ContactSchema.parse({
    id,
    name: fields[CONTACT_FIELDS.name],
    phoneNumber: fields[CONTACT_FIELDS.phoneNumber],
    contactType: fields[CONTACT_FIELDS.contactType],
    tags: fields[CONTACT_FIELDS.tags],
    phoneCallAvailability: fields[CONTACT_FIELDS.phoneCallAvailability],
    newMemberCallDone: fields[CONTACT_FIELDS.newMemberCallDone],
    hadInitialOneToOne: fields[CONTACT_FIELDS.hadInitialOneToOne],
    invitedToWhatsApp: fields[CONTACT_FIELDS.invitedToWhatsApp],
    membershipNumber: fields[CONTACT_FIELDS.membershipNumber],
    notes: fields[CONTACT_FIELDS.notes],
    summary: fields[CONTACT_FIELDS.summary],
    dateEnteredInDatabase: fields[CONTACT_FIELDS.dateEnteredInDatabase],
  });
}
