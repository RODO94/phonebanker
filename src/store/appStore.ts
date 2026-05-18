import { create } from 'zustand';
import type { Session } from '@/session/sessionSchema';
import type { Contact } from '@/contact/contactSchema';

type AppState = {
  session: Session | null;
  phonebankerName: string | null;
  contact: Contact | null;
  totalContacts: number;
  calledCount: number;
  setSession: (s: Session | null) => void;
  setPhonebankerName: (name: string) => void;
  setContact: (c: Contact | null) => void;
  setProgress: (total: number, called: number) => void;
};

export const useAppStore = create<AppState>((set) => ({
  session: null,
  phonebankerName: null,
  contact: null,
  totalContacts: 0,
  calledCount: 0,
  setSession: (session) => set({ session }),
  setPhonebankerName: (phonebankerName) => set({ phonebankerName }),
  setContact: (contact) => set({ contact }),
  setProgress: (totalContacts, calledCount) => set({ totalContacts, calledCount }),
}));
