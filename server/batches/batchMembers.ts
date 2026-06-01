import { TABLES, MEMBER_BATCH_FIELD, CONTACT_TYPE_FIELD, ALLOWED_CONTACT_TYPES } from '../airtable/schema.js';
import { fetchAllPages } from '../airtable/records.js';

// Valid member types: only paying/non-paying members and Contacts are phonebanked.
const CONTACT_TYPE_CLAUSE = `OR(${ALLOWED_CONTACT_TYPES.map((t) => `{${CONTACT_TYPE_FIELD}}='${t}'`).join(',')})`;

// Scope to the organiser's batch tag AND allowed contact types. Batch strings are
// organiser-typed dates (e.g. "31-05-2026"), so single-quote wrapping is safe.
export function memberBatchFilter(batch: string): string {
  return `AND({${MEMBER_BATCH_FIELD}}='${batch}',${CONTACT_TYPE_CLAUSE})`;
}

// How many Member records carry this batch tag. Pages through the filtered set
// requesting only the batch field, so the payload stays small even on a large base.
export async function countMembersInBatch(batch: string): Promise<number> {
  const query = new URLSearchParams({
    filterByFormula: memberBatchFilter(batch),
    pageSize: '800',
  });
  query.append('fields[]', MEMBER_BATCH_FIELD);
  const records = await fetchAllPages(`/${TABLES.members}`, query);
  return records.length;
}
