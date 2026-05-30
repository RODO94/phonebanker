// Named coordinator errors the route handler maps to HTTP statuses. Legitimate
// outcomes (claimed / list-exhausted) are typed return values, not exceptions —
// only world-is-broken or unauthorised conditions throw. AirtableUnavailableError
// (transport, → 502) lives with the transport in ../airtable/client.ts.

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class ParticipantNotRegisteredError extends Error {
  constructor(message = 'participant not registered for this session') {
    super(message);
    this.name = 'ParticipantNotRegisteredError';
  }
}
