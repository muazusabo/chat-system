// lib/hooks/useAuth.ts
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { disconnectSocket } from '@/lib/socket';

export function useLogout() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  return async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails (e.g. already-expired session),
      // still clear local state so the user isn't stuck logged in on
      // the client with a dead session.
    }
    setAccessToken(null);
    disconnectSocket();
    setUser(null);
    setStatus('unauthenticated');
    router.push('/login');
  };
}