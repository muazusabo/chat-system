// lib/hooks/useAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminUser, AdminUsersPage, AdminStats, AdminTrendPoint } from '@/lib/types';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });
}

export function useAdminTrends(days = 30) {
  return useQuery({
    queryKey: ['admin', 'trends', days],
    queryFn: () => api.get<AdminTrendPoint[]>(`/admin/stats/trends?days=${days}`),
  });
}

export interface AdminUserFilters {
  q?: string;
  isBlocked?: boolean;
  isDeleted?: boolean;
  role?: 'USER' | 'ADMIN';
  page?: number;
  limit?: number;
}

function buildQuery(filters: AdminUserFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.isBlocked !== undefined) params.set('isBlocked', String(filters.isBlocked));
  if (filters.isDeleted !== undefined) params.set('isDeleted', String(filters.isDeleted));
  if (filters.role) params.set('role', filters.role);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));
  return params.toString();
}

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => api.get<AdminUsersPage>(`/admin/users?${buildQuery(filters)}`),
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.get<AdminUser>(`/admin/users/${userId}`),
    enabled: !!userId,
  });
}

function useInvalidateAdminUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };
}

export function useSoftDeleteUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (userId: string) => api.patch(`/admin/users/${userId}/delete`),
    onSuccess: invalidate,
  });
}

export function useRestoreUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (userId: string) => api.patch(`/admin/users/${userId}/restore`),
    onSuccess: invalidate,
  });
}

export function useBlockUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/block`),
    onSuccess: invalidate,
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (userId: string) => api.post(`/users/${userId}/unblock`),
    onSuccess: invalidate,
  });
}