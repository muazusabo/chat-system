// lib/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SafeUser } from '@/lib/types';

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.get<SafeUser>(`/users/${userId}`),
    enabled: !!userId,
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}