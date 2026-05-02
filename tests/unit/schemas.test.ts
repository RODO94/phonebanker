import { describe, expect, it } from 'vitest';
import { ContactSchema, SessionSchema } from '@/schemas';

describe('schemas', () => {
  it('parses a valid session', () => {
    const result = SessionSchema.safeParse({
      id: 's1',
      viewName: 'Active members',
      callScript: 'Hi...',
      smsMessage: 'Sorry we missed you...',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a contact missing phone', () => {
    const result = ContactSchema.safeParse({ id: 'c1', name: 'Ada', assignedPhonebanker: null });
    expect(result.success).toBe(false);
  });
});
