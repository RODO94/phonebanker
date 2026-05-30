import { z } from 'zod';
import { airtableFetch } from '../airtable/client.js';
import { TABLES, SESSION_FIELDS, SESSION_ACTIVE_STATUS } from '../airtable/schema.js';

const CreatedRecordSchema = z.object({ id: z.string() });

export type CreateAirtableSessionFields = {
  organiserName: string;
  viewId: string;
  viewName: string;
  callScript: string;
  smsMessage: string;
};

export async function createAirtableSession(
  input: CreateAirtableSessionFields,
): Promise<{ id: string }> {
  const record = await airtableFetch(`/${TABLES.sessions}`, CreatedRecordSchema, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        [SESSION_FIELDS.createdBy]: input.organiserName,
        [SESSION_FIELDS.viewId]: input.viewId,
        [SESSION_FIELDS.viewName]: input.viewName,
        [SESSION_FIELDS.callScript]: input.callScript,
        [SESSION_FIELDS.smsMessage]: input.smsMessage,
        [SESSION_FIELDS.status]: SESSION_ACTIVE_STATUS,
      },
    }),
  });
  return { id: record.id };
}
