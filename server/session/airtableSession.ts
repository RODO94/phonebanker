import { z } from 'zod';
import { airtableFetch } from '../airtable/client.js';

// Table: "Phonebank Sessions" — using the ID so a rename in Airtable doesn't break the write.
const SESSIONS_TABLE_ID = 'tblGtfTz6ybQVm2I0';

const AirtableRecordSchema = z.object({
  id: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

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
  const raw = await airtableFetch(`/${SESSIONS_TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        createdBy: input.organiserName,
        viewId: input.viewId,
        viewName: input.viewName,
        callScript: input.callScript,
        smsMessage: input.smsMessage,
        status: 'active',
      },
    }),
  });
  const record = AirtableRecordSchema.parse(raw);
  return { id: record.id };
}
