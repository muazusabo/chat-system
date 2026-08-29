// lib/hooks/useNotifications.ts
import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from './useSocket';
import type { AppNotification, NotificationsPage } from '@/lib/types';

export function useNotifications() {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const queryKey = ['notifications'];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      api.get<NotificationsPage>(
        `/notifications?limit=30${pageParam ? `&cursor=${pageParam}` : ''}`
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    if (!socket) return;

    function handleNotification(notification: AppNotification) {
      queryClient.setQueryData<{ pages: NotificationsPage[]; pageParams: unknown[] }>(
        queryKey,
        (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          pages[0] = { ...pages[0], notifications: [notification, ...pages[0].notifications] };
          return { ...old, pages };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, queryClient]);

  return query;
}

export function useUnreadCount() {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
  });

  useEffect(() => {
    if (!socket) return;
    function handleNotification() {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}