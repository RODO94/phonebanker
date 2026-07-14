import { describe, expect, it } from 'vitest';
import { SessionSchema } from '@/session/sessionSchema';
import { ContactSchema } from '@/contact/contactSchema';

describe('schemas', () => {
  it('parses a valid session', () => {
    const result = SessionSchema.safeParse({
      id: 's1',
      organiserName: 'Sam',
      phonebankBatch: '31-05-2026',
      callScript: 'Hi...',
      smsMessage: 'Sorry we missed you...',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a contact missing phone', () => {
    const result = ContactSchema.safeParse({ id: 'c1', name: 'Ada', assignedPhonebanker: null });
    expect(result.success).toBe(true);
  });

  it('rejects a contact missing name', () => {
    const result = ContactSchema.safeParse({ id: 'c1', phoneNumber: '07700 900000' });
    expect(result.success).toBe(false);
  });
});
