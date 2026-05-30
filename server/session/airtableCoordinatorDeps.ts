import { z } from 'zod';
import { airtableFetch, AirtableUnavailableError } from '../airtable/client.js';
import {
  TABLES,
  SESSION_FIELDS,
  MEMBER_ASSIGNMENT_FIELDS,
  PHONE_LOG_FIELDS,
  OUTCOME_CHOICES,
  CHOICE_TO_OUTCOME,
} from '../airtable/schema.js';
import { SessionNotFoundError } from './errors.js';
import { toContact } from '../contact/contactMapper.js';
import { SessionStatusSchema } from '../../src/session/sessionSchema.js';
import type { CoordinatorDeps, AssignmentMirror, LoggedContact } from './assignmentCoordinator.js';

const RecordSchema = z.object({ id: z.string(), fields: z.record(z.string(), z.unknown()) });
const ListSchema = z.object({ records: z.array(RecordSchema), offset: z.string().optional() });

function toMirror(fields: Record<string, unknown>): AssignmentMirror {
  const holder = fields[MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker];
  const claimedAt = fields[MEMBER_ASSIGNMENT_FIELDS.claimedAt];
  return {
    assignedPhonebanker: typeof holder === 'string' && holder.length > 0 ? holder : null,
    claimedAt: typeof claimedAt === 'string' && claimedAt.length > 0 ? claimedAt : null,
  };
}

// Reads every page of a list endpoint, following Airtable's `offset` cursor.
async function fetchAllPages(path: string, query: URLSearchParams) {
  const records: Array<z.infer<typeof RecordSchema>> = [];
  let offset: string | undefined;
  do {
    if (offset) query.set('offset', offset);
    else query.delete('offset');
    const page = await airtableFetch(`${path}?${query.toString()}`, ListSchema);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
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
        viewId: String(f[SESSION_FIELDS.viewId] ?? ''),
        viewName: String(f[SESSION_FIELDS.viewName] ?? ''),
        callScript: String(f[SESSION_FIELDS.callScript] ?? ''),
        smsMessage: String(f[SESSION_FIELDS.smsMessage] ?? ''),
        // An unknown status reads as 'ended' — fail closed onto the SessionEnded gate.
        status: SessionStatusSchema.catch('ended').parse(f[SESSION_FIELDS.status]),
      };
    },

    async listViewContacts(viewName) {
      const query = new URLSearchParams({ view: viewName, pageSize: '100' });
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
      await airtableFetch(`/${TABLES.members}/${contactId}`, RecordSchema, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            [MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker]: assignedPhonebanker,
            [MEMBER_ASSIGNMENT_FIELDS.claimedAt]: claimedAt,
          },
        }),
      });
    },

    async clearContactAssignment(contactId) {
      await airtableFetch(`/${TABLES.members}/${contactId}`, RecordSchema, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            [MEMBER_ASSIGNMENT_FIELDS.assignedPhonebanker]: null,
            [MEMBER_ASSIGNMENT_FIELDS.claimedAt]: null,
          },
        }),
      });
    },

    async writePhoneLog({ sessionId, contactId, phonebankerId, outcome, messageSent }) {
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
            [PHONE_LOG_FIELDS.sessionId]: sessionId,
          },
        }),
      });
    },

    async listLoggedContacts(sessionId) {
      const query = new URLSearchParams({
        filterByFormula: `{${PHONE_LOG_FIELDS.sessionId}}='${sessionId}'`,
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
