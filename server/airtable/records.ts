import { z } from 'zod';
import { airtableFetch } from './client.js';

// The generic Airtable record and list-response shapes. Field contents are
// validated by the caller against a domain schema; here we only assert the
// envelope so the paging cursor and record ids are safe to read.
export const RecordSchema = z.object({ id: z.string(), fields: z.record(z.string(), z.unknown()) });
export const ListSchema = z.object({ records: z.array(RecordSchema), offset: z.string().optional() });

export type AirtableRecord = z.infer<typeof RecordSchema>;

// Reads every page of a list endpoint, following Airtable's `offset` cursor.
export async function fetchAllPages(
  path: string,
  query: URLSearchParams,
): Promise<AirtableRecord[]> {
  try {

    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      if (offset) query.set('offset', offset);
      else query.delete('offset');
      const page = await airtableFetch(`${path}?${query.toString()}`, ListSchema);
      records.push(...page.records);
      offset = page.offset;
    } while (offset);

    return records;
  } catch (err) {
    console.error('error fetching all pages', path, query, err);
    throw err;
  }
}
