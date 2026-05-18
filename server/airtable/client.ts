const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn('AIRTABLE_API_KEY and AIRTABLE_BASE_ID are not set — Airtable calls will fail.');
}

const BASE_URL = 'https://api.airtable.com/v0';

export async function airtableFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/${baseId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
