// lib/auth-store.ts
import { create } from 'zustand';
import type { SafeUser } from './types';

interface AuthState {
  user: SafeUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  setUser: (user: SafeUser | null) => void;
  setStatus: (status: AuthState['status']) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading', // starts 'loading' until session-restore attempt finishes
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
}));