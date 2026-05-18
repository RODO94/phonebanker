import { z } from 'zod';
import { ApiError } from './ApiError';

export async function apiFetch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  const json = await res.json();
  return schema.parse(json);
}
