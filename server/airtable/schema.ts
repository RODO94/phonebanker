import type { Outcome } from '../../src/contact/outcomeSchema.js';

// Single source of truth for the Airtable base's tables and field names.
// Tables are addressed by ID so a rename in Airtable doesn't break the server;
// field names must match the base exactly (confirmed against the live base).

export const TABLES = {
  sessions: 'tblGtfTz6ybQVm2I0',
  members: 'tbl7LFRxXk6WRyKCh',
  phoneLogs: 'tbl0ediM965TToR2c',
} as const;

// Sessions table fields are camelCase in this base.
export const SESSION_FIELDS = {
  createdBy: 'createdBy',
  phonebankBatch: 'phonebankBatch',
  callScript: 'callScript',
  smsMessage: 'smsMessage',
  status: 'status',
} as const;

// The single-select value that means a session is live and joinable.
export const SESSION_ACTIVE_STATUS = 'active';

// The Member field the organiser tags by hand to mark a record for tonight's
// call list. A single-line text field holding the batch string (e.g. a date);
// the session's `phonebankBatch` is matched against it to build the directory.
// Views can't be queried outside Airtable Enterprise, so this tag is the filter.
export const MEMBER_BATCH_FIELD = 'Current Phonebank Batch';

// The assignment lock lives on the Member record as two plain fields.
// `assignedPhonebanker` is a single-line-text field holding the volunteer's
// member recordId (not an Airtable link); empty means the contact is unclaimed.
// `claimedAt` is the timestamp the claim was written — the basis for lazy expiry.
export const MEMBER_ASSIGNMENT_FIELDS = {
  assignedPhonebanker: 'Assigned phone banker (group/branch)',
  claimedAt: 'phoned_at',
} as const;

// Phone Logs table. Links carry the relational audit trail (and the GDPR
// null-on-delete cascade); `sessionId` is a plain-text mirror of the session
// recordId so the burn-down rebuild can filter logs by session with a cheap,
// exact filterByFormula instead of matching link display values.
export const PHONE_LOG_FIELDS = {
  session: 'Session',
  contact: 'Contact',
  phonebanker: 'Phonebanker',
  outcome: 'Outcome',
  messageSent: 'Message sent',
  timestamp: 'Timestamp',
  sessionId: 'sessionId',
} as const;

// Maps the client Outcome enum to the Phone Logs single-select choice strings.
export const OUTCOME_CHOICES: Record<Outcome, string> = {
  'had-conversation': 'Had a conversation',
  'wants-removed': 'Wants to be removed',
  'no-answer': 'No answer',
  skipped: 'Skipped',
};

// The reverse of OUTCOME_CHOICES — for reading logged outcomes back on hydration.
export const CHOICE_TO_OUTCOME: Record<string, Outcome> = Object.fromEntries(
  Object.entries(OUTCOME_CHOICES).map(([outcome, choice]) => [choice, outcome as Outcome]),
);
