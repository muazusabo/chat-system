// lib/hooks/useConversations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Conversation } from '@/lib/types';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get<Conversation[]>('/conversations'),
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: 'PRIVATE' | 'GROUP'; memberIds: string[]; name?: string }) =>
      api.post<Conversation>('/conversations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

function useInvalidateConversation(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['conversations', id] });
  };
}

export function useRenameConversation(conversationId: string) {
  const invalidate = useInvalidateConversation(conversationId);
  return useMutation({
    mutationFn: (name: string) => api.patch<Conversation>(`/conversations/${conversationId}`, { name }),
    onSuccess: invalidate,
  });
}

export function useAddMembers(conversationId: string) {
  const invalidate = useInvalidateConversation(conversationId);
  return useMutation({
    mutationFn: (memberIds: string[]) =>
      api.post<Conversation>(`/conversations/${conversationId}/members`, { memberIds }),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(conversationId: string) {
  const invalidate = useInvalidateConversation(conversationId);
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/conversations/${conversationId}/members/${memberId}`),
    onSuccess: invalidate,
  });
}

export function useLeaveConversation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/conversations/${conversationId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useTransferOwnership(conversationId: string) {
  const invalidate = useInvalidateConversation(conversationId);
  return useMutation({
    mutationFn: (newOwnerId: string) =>
      api.post(`/conversations/${conversationId}/transfer-ownership`, { newOwnerId }),
    onSuccess: invalidate,
  });
}
export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}