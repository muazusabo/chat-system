// lib/hooks/useContacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Contact, ContactRequest, SafeUser } from '@/lib/types';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get<Contact[]>('/contacts'),
  });
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: ['contacts', 'requests', 'incoming'],
    queryFn: () => api.get<ContactRequest[]>('/contacts/requests/incoming'),
  });
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: ['contacts', 'requests', 'outgoing'],
    queryFn: () => api.get<ContactRequest[]>('/contacts/requests/outgoing'),
  });
}

export function useUserSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: ['users', 'search', query, limit],
    queryFn: () => api.get<SafeUser[]>(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`),
    enabled: query.trim().length > 0,
  });
}

function useInvalidateContacts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };
}

export function useSendContactRequest() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (receiverId: string) => api.post('/contacts/requests', { receiverId }),
    onSuccess: invalidate,
  });
}

export function useAcceptContactRequest() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (requestId: string) => api.post(`/contacts/requests/${requestId}/accept`),
    onSuccess: invalidate,
  });
}

export function useRejectContactRequest() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (requestId: string) => api.post(`/contacts/requests/${requestId}/reject`),
    onSuccess: invalidate,
  });
}

export function useCancelContactRequest() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (requestId: string) => api.post(`/contacts/requests/${requestId}/cancel`),
    onSuccess: invalidate,
  });
}

export function useRemoveContact() {
  const invalidate = useInvalidateContacts();
  return useMutation({
    mutationFn: (contactId: string) => api.delete(`/contacts/${contactId}`),
    onSuccess: invalidate,
  });
}