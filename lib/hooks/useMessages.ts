// lib/hooks/useMessages.ts
import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, getAccessToken } from '@/lib/api';
import { useSocket } from './useSocket';
import type { Message, MessagesPage, MessageType } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const queryKey = ['messages', conversationId];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      api.get<MessagesPage>(
        `/messages/conversation/${conversationId}?limit=30${pageParam ? `&cursor=${pageParam}` : ''}`
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
    staleTime: 10 * 1000, // Keep messages fresh for 10 seconds
  });

  // Live updates via socket — keep the cache in sync without refetching.
  useEffect(() => {
    if (!socket || !conversationId) return;

    function handleNewMessage(message: Message) {
      if (message.conversationId !== conversationId) return;
      queryClient.setQueryData<{ pages: MessagesPage[]; pageParams: unknown[] }>(
        queryKey,
        (old) => {
          if (!old) return old;
          const pages = [...old.pages];
          // Newest messages live in the first page (cursor pagination loads older pages after).
          pages[0] = { ...pages[0], messages: [message, ...pages[0].messages] };
          return { ...old, pages };
        }
      );
    }

    function handleMessageEdited(updated: Message) {
      queryClient.setQueryData<{ pages: MessagesPage[]; pageParams: unknown[] }>(
        queryKey,
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          }));
          return { ...old, pages };
        }
      );
    }

    function handleMessageDeleted({ id }: { id: string; conversationId: string }) {
      queryClient.setQueryData<{ pages: MessagesPage[]; pageParams: unknown[] }>(
        queryKey,
        (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.id !== id),
          }));
          return { ...old, pages };
        }
      );
    }

    socket.emit('joinConversation', { conversationId });
    socket.on('newMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.emit('leaveConversation', { conversationId });
      socket.off('newMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [socket, conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const socket = useSocket();
  return (conversationId: string, content: string, type: MessageType = 'TEXT') => {
    socket?.emit('sendMessage', { conversationId, content, type });
  };
}

export function useTypingIndicator(conversationId: string | undefined) {
  const socket = useSocket();

  const startTyping = () => {
    if (conversationId) socket?.emit('typing', { conversationId });
  };
  const stopTyping = () => {
    if (conversationId) socket?.emit('stopTyping', { conversationId });
  };

  return { startTyping, stopTyping };
}

export function useUploadMessageImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/messages/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        credentials: 'include',
        body: formData,
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message ?? 'Upload failed');
      }
      return body.data as { url: string };
    },
  });
}