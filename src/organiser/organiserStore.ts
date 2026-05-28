import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { View } from '@/view/viewsSchema';

export const ORGANISER_STEPS = ['identify', 'view', 'script', 'message', 'review'] as const;
export type OrganiserStep = (typeof ORGANISER_STEPS)[number];

type OrganiserState = {
  step: OrganiserStep;
  organiserName: string;
  selectedView: View | null;
  callScript: string;
  smsMessage: string;
  setStep: (step: OrganiserStep) => void;
  setOrganiserName: (name: string) => void;
  selectView: (view: View) => void;
  setCallScript: (script: string) => void;
  setSmsMessage: (message: string) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
};

const INITIAL: Pick<
  OrganiserState,
  'step' | 'organiserName' | 'selectedView' | 'callScript' | 'smsMessage'
> = {
  step: 'identify',
  organiserName: '',
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
      setOrganiserName: (organiserName) => set({ organiserName }),
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
        organiserName: s.organiserName,
        selectedView: s.selectedView,
        callScript: s.callScript,
        smsMessage: s.smsMessage,
      }),
    },
  ),
);
