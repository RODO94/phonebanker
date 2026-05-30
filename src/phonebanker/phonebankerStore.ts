import { create } from 'zustand';
import type { Session } from '@/session/sessionSchema';
import type { Contact } from '@/contact/contactSchema';
import type { Outcome } from '@/contact/outcomeSchema';

// Screen states for the phonebanker flow. Unlike the organiser wizard this is NOT
// a linear walk — transitions are driven by server responses (claim state, outcome
// logs), so there is no goNext/goBack. See plans/segment-0-foundation.md for the
// claim-state → step mapping the screen segments wire up.
export const PHONEBANKER_STEPS = [
  'join',
  'alreadyJoined',
  'assigned',
  'noAnswerFollowUp',
  'wantsRemoved',
  'done',
  'sessionEnded',
] as const;
export type PhonebankerStep = (typeof PHONEBANKER_STEPS)[number];

type PhonebankerState = {
  step: PhonebankerStep;
  sessionId: string;
  participantId: string | null; // = member.recordId, set at join, lost on refresh by design
  displayName: string | null;
  session: Session | null; // script + SMS message, fetched once at join
  currentContact: Contact | null;
  total: number;
  called: number;
  lastOutcome: Outcome | null;

  setStep: (step: PhonebankerStep) => void;
  setParticipant: (p: { participantId: string; displayName: string }) => void;
  setSession: (session: Session) => void;
  setCurrentContact: (contact: Contact | null) => void;
  setProgress: (total: number, called: number) => void;
  setLastOutcome: (outcome: Outcome | null) => void;
  reset: () => void;
};

// Deliberately NOT persisted (no localStorage / sessionStorage). A refresh clears
// participant identity and forces a re-join via member search — the GDPR
// "deliberate forgetting" posture in tech-stack.md. The organiser store persists;
// this one must not. Do not wrap this in `persist`.
const INITIAL: Omit<
  PhonebankerState,
  | 'setStep'
  | 'setParticipant'
  | 'setSession'
  | 'setCurrentContact'
  | 'setProgress'
  | 'setLastOutcome'
  | 'reset'
> = {
  step: 'join',
  sessionId: '',
  participantId: null,
  displayName: null,
  session: null,
  currentContact: null,
  total: 0,
  called: 0,
  lastOutcome: null,
};

export const usePhonebankerStore = create<PhonebankerState>((set) => ({
  ...INITIAL,
  setStep: (step) => set({ step }),
  setParticipant: ({ participantId, displayName }) => set({ participantId, displayName }),
  setSession: (session) => set({ session }),
  setCurrentContact: (currentContact) => set({ currentContact }),
  setProgress: (total, called) => set({ total, called }),
  setLastOutcome: (lastOutcome) => set({ lastOutcome }),
  reset: () => set((s) => ({ ...INITIAL, sessionId: s.sessionId })),
}));
