import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { View } from './types/viewsSchema';

export const ORGANISER_STEPS = ['view', 'script', 'message', 'review'] as const;
export type OrganiserStep = (typeof ORGANISER_STEPS)[number];

type OrganiserState = {
  step: OrganiserStep;
  selectedView: View | null;
  callScript: string;
  smsMessage: string;
  setStep: (step: OrganiserStep) => void;
  selectView: (view: View) => void;
  setCallScript: (script: string) => void;
  setSmsMessage: (message: string) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
};

const INITIAL: Pick<OrganiserState, 'step' | 'selectedView' | 'callScript' | 'smsMessage'> = {
  step: 'view',
  selectedView: null,
  callScript: '',
  smsMessage: '',
};

function nextStep(step: OrganiserStep): OrganiserStep {
  const i = ORGANISER_STEPS.indexOf(step);
  return ORGANISER_STEPS[Math.min(i + 1, ORGANISER_STEPS.length - 1)];
}

function previousStep(step: OrganiserStep): OrganiserStep {
  const i = ORGANISER_STEPS.indexOf(step);
  return ORGANISER_STEPS[Math.max(i - 1, 0)];
}

export const useOrganiserStore = create<OrganiserState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setStep: (step) => set({ step }),
      selectView: (selectedView) => set({ selectedView }),
      setCallScript: (callScript) => set({ callScript }),
      setSmsMessage: (smsMessage) => set({ smsMessage }),
      goNext: () => set((s) => ({ step: nextStep(s.step) })),
      goBack: () => set((s) => ({ step: previousStep(s.step) })),
      reset: () => set(INITIAL),
    }),
    {
      name: 'organiser-wizard',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        step: s.step,
        selectedView: s.selectedView,
        callScript: s.callScript,
        smsMessage: s.smsMessage,
      }),
    },
  ),
);
