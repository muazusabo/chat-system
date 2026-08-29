// components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { api, setAccessToken, setOnAuthFailure } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { SafeUser } from '@/lib/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    setOnAuthFailure(() => {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    });

    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      // /auth/refresh reads the httpOnly cookie and returns a fresh access token
      const { accessToken } = await api.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(accessToken);

      const user = await api.get<SafeUser>('/auth/me');
      setUser(user);
      setStatus('authenticated');
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }

  return <>{children}</>;
}