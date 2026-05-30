import type { ZodType } from 'zod';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn('AIRTABLE_API_KEY and AIRTABLE_BASE_ID are not set — Airtable calls will fail.');
}

const BASE_URL = 'https://api.airtable.com/v0';

// Thrown for any failure reaching, or making sense of, Airtable. `status` is the
// HTTP status when the failure was an error response (undefined for transport or
// validation failures). Route handlers map this to 502; callers that care about a
// specific status (e.g. a 404 session lookup) branch on `status` before rethrowing.
export class AirtableUnavailableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AirtableUnavailableError';
  }
}

// The transport boundary: schema is a required argument, parsed here so the
// expected shape is visible at every call site and drift fails loudly and early.
export async function airtableFetch<T>(
  path: string,
  schema: ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${baseId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch (cause) {
    throw new AirtableUnavailableError(`Airtable request failed: ${String(cause)}`);
  }

  if (!res.ok) {
    throw new AirtableUnavailableError(`Airtable ${res.status}: ${await res.text()}`, res.status);
  }

  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    throw new AirtableUnavailableError(`Airtable response failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
