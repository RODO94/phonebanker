import { airtableFetch, AirtableUnavailableError } from '../airtable/client.js';
import { RecordSchema, fetchAllPages } from '../airtable/records.js';
import {
  TABLES,
  SESSION_FIELDS,
  MEMBER_ASSIGNMENT_FIELDS,
  PHONE_LOG_FIELDS,
  OUTCOME_CHOICES,
  CHOICE_TO_OUTCOME,
} from '../airtable/schema.js';
import { memberBatchFilter } from '../batches/batchMembers.js';
import { CONTACT_FIELDS } from '../../src/contact/contactFields.js';
import { SessionNotFoundError } from './errors.js';
import { toContact } from '../contact/contactMapper.js';
import { SessionStatusSchema } from '../../src/session/sessionSchema.js';
import type { CoordinatorDeps, AssignmentMirror, LoggedContact } from './assignmentCoordinator.js';

function toMirror(fields: Record<string, unknown>): AssignmentMirror {
  const holder = fields[MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker];
  const claimedAt = fields[MEMBER_ASSIGNMENT_FIELDS.claimedAt];
  return {
    assignedPhonebanker: typeof holder === 'string' && holder.length > 0 ? holder : null,
    claimedAt: typeof claimedAt === 'string' && claimedAt.length > 0 ? claimedAt : null,
  };
}

// The real Airtable-backed dependencies for the assignment coordinator. All
// Airtable specifics (table IDs, field names, choice strings) are confined to
// ../airtable/schema.ts; this file only assembles requests and shapes responses.
export function createAirtableCoordinatorDeps(): CoordinatorDeps {
  return {
    now: () => Date.now(),

    async readSession(sessionId) {
      let record;
      try {
        record = await airtableFetch(`/${TABLES.sessions}/${sessionId}`, RecordSchema);
      } catch (err) {
        if (err instanceof AirtableUnavailableError && (err.status === 404 || err.status === 403)) {
          throw new SessionNotFoundError(sessionId);
        }
        throw err;
      }
      const f = record.fields;
      return {
        id: record.id,
        organiserName: String(f[SESSION_FIELDS.createdBy] ?? ''),
        phonebankBatch: String(f[SESSION_FIELDS.phonebankBatch] ?? ''),
        callScript: String(f[SESSION_FIELDS.callScript] ?? ''),
        smsMessage: String(f[SESSION_FIELDS.smsMessage] ?? ''),
        // An unknown status reads as 'ended' — fail closed onto the SessionEnded gate.
        status: SessionStatusSchema.catch('ended').parse(f[SESSION_FIELDS.status]),
      };
    },

    async listAllMembers() {
      const query = new URLSearchParams({ pageSize: '800' });
      query.append('fields[]', CONTACT_FIELDS.name);
      const records = await fetchAllPages(`/${TABLES.members}`, query);
      return records.map((rec) => ({
        id: rec.id,
        name: String(rec.fields[CONTACT_FIELDS.name] ?? ''),
      }));
    },

    async listBatchContacts(batch) {
      const query = new URLSearchParams({
        filterByFormula: memberBatchFilter(batch),
        pageSize: '800',
      });
      // Minimum exposure: fetch only the card fields plus the assignment lock,
      // so the onboarding flags, membership number and notes on the Member
      // record never leave Airtable. filterByFormula still evaluates the batch
      // tag server-side regardless of this projection.
      for (const field of [
        CONTACT_FIELDS.name,
        CONTACT_FIELDS.phoneNumber,
        CONTACT_FIELDS.contactType,
        CONTACT_FIELDS.summary,
        MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker,
        MEMBER_ASSIGNMENT_FIELDS.claimedAt,
      ]) {
        query.append('fields[]', field);
      }

      const records = await fetchAllPages(`/${TABLES.members}`, query);

      return records.map((rec) => ({
        contact: toContact(rec.id, rec.fields),
        assignment: toMirror(rec.fields),
      }));
    },

    async readContactAssignment(contactId) {
      const record = await airtableFetch(`/${TABLES.members}/${contactId}`, RecordSchema);
      return toMirror(record.fields);
    },

    async writeContactAssignment(contactId, { assignedPhonebanker, claimedAt }) {
      try {
        await airtableFetch(`/${TABLES.members}/${contactId}`, RecordSchema, {
          method: 'PATCH',
          body: JSON.stringify({
            fields: {
              [MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker]: assignedPhonebanker,
              [MEMBER_ASSIGNMENT_FIELDS.claimedAt]: claimedAt,
            },
          }),
        });
      } catch (err) {
        console.error('error writing contact assignment', contactId, assignedPhonebanker, claimedAt, err);
        throw err;
      }
    },

    async clearContactAssignment(contactId) {
      try {
        await airtableFetch(`/${TABLES.members}/${contactId}`, RecordSchema, {
          method: 'PATCH',
          body: JSON.stringify({
            fields: {
              [MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker]: null,
              [MEMBER_ASSIGNMENT_FIELDS.claimedAt]: null,
            },
          }),
        });
      } catch (err) {
        console.error('error clearing contact assignment', contactId, err);
        throw err;
      }
    },

    async writePhoneLog({ sessionId, contactId, phonebankerId, outcome, messageSent }) {
      try {
        await airtableFetch(`/${TABLES.phoneLogs}`, RecordSchema, {
          method: 'POST',
          body: JSON.stringify({
            fields: {
              [PHONE_LOG_FIELDS.session]: [sessionId],
              [PHONE_LOG_FIELDS.contact]: [contactId],
              [PHONE_LOG_FIELDS.phonebanker]: [phonebankerId],
              [PHONE_LOG_FIELDS.outcome]: OUTCOME_CHOICES[outcome],
              [PHONE_LOG_FIELDS.messageSent]: Boolean(messageSent),
              [PHONE_LOG_FIELDS.timestamp]: new Date().toISOString(),
            },
          }),
        });
      } catch (err) {
        console.error('error writing phone log', sessionId, contactId, phonebankerId, outcome, messageSent, err);
        throw err;
      }
    },

    async listLoggedContacts(sessionId) {
      const query = new URLSearchParams({
        filterByFormula: `FIND('${sessionId}', ARRAYJOIN({${PHONE_LOG_FIELDS.session}}))`,
        pageSize: '100',
      });
      const records = await fetchAllPages(`/${TABLES.phoneLogs}`, query);
      const logged: LoggedContact[] = [];
      for (const rec of records) {
        const contactLink = rec.fields[PHONE_LOG_FIELDS.contact];
        const contactId = Array.isArray(contactLink) ? String(contactLink[0]) : undefined;
        const outcome = CHOICE_TO_OUTCOME[String(rec.fields[PHONE_LOG_FIELDS.outcome] ?? '')];
        if (contactId && outcome) logged.push({ contactId, outcome });
      }
      return logged;
    },
  };
}
