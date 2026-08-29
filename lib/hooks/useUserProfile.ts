// lib/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SafeUser } from '@/lib/types';

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.get<SafeUser>(`/users/${userId}`),
    enabled: !!userId,
  });
}