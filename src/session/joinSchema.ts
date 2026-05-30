import { z } from 'zod';

// A single match returned by the bounded join search — id + display name only.
// The GDPR floor: a name query never returns a full member record.
export const MemberMatchSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type MemberMatch = z.infer<typeof MemberMatchSchema>;

// POST /api/sessions/:id/members/search
export const MemberSearchRequestSchema = z.object({
  query: z.string(),
});
export type MemberSearchRequest = z.infer<typeof MemberSearchRequestSchema>;

// At most 5 matches, ranked + alphabetised server-side. `truncated` is true when
// the raw match count exceeded 5 — drives the "type more letters to narrow down"
// hint. Zero-match copy (real-name attempt vs not-on-list) is a B1 concern, not
// a schema concern.
export const MemberSearchResponseSchema = z.object({
  matches: z.array(MemberMatchSchema).max(5),
  truncated: z.boolean(),
});
export type MemberSearchResponse = z.infer<typeof MemberSearchResponseSchema>;

// POST /api/sessions/:id/join — join with the chosen member's recordId.
// That recordId becomes the participantId for the rest of the session.
export const JoinRequestSchema = z.object({
  memberId: z.string(),
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

export const JoinResponseSchema = z.object({
  participantId: z.string(),
  displayName: z.string(),
});
export type JoinResponse = z.infer<typeof JoinResponseSchema>;
