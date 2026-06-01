import { TABLES, MEMBER_BATCH_FIELD } from '../airtable/schema.js';
import { fetchAllPages } from '../airtable/records.js';

// Exact-match against the organiser's batch tag. Batch strings are organiser-typed
// dates (e.g. "31-05-2026"), so single-quote wrapping is safe — they carry no
// quotes of their own. The match is intentionally strict: a typo finds nothing,
// which the count surfaces before the session is created.
export function memberBatchFilter(batch: string): string {
  return `{${MEMBER_BATCH_FIELD}}='${batch}'`;
}

// How many Member records carry this batch tag. Pages through the filtered set
// requesting only the batch field, so the payload stays small even on a large base.
export async function countMembersInBatch(batch: string): Promise<number> {
  const query = new URLSearchParams({
    filterByFormula: memberBatchFilter(batch),
    pageSize: '100',
  });
  query.append('fields[]', MEMBER_BATCH_FIELD);
  const records = await fetchAllPages(`/${TABLES.members}`, query);
  return records.length;
}
