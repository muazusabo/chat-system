// app/chat/[conversationId]/page.tsx
'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useConversation, useMarkConversationRead } from '@/lib/hooks/useConversations';
import { useMessages, useSendMessage, useTypingIndicator } from '@/lib/hooks/useMessages';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAuthStore } from '@/lib/auth-store';
import { resolveAvatarUrl } from '@/lib/avatar';
import { getConversationWallpaper, resolveWallpaperStyle } from '@/lib/wallpaper';
import { MessageBubble } from '@/app/chat/MessageBubble';
import { TypingIndicator } from '@/app/chat/TypingIndicator';
import { MessageInput } from '@/app/chat/MessageInput';
import { WallpaperPicker } from '@/app/chat/WallpaperPicker';
import { Spinner } from '@/components/ui/Spinner';
import { useCall } from '@/components/calls/callprovider';
import type { Message } from '@/lib/types';

function dateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const socket = useSocket();

  const { data: conversation } = useConversation(conversationId);
  const markRead = useMarkConversationRead();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const { startTyping, stopTyping } = useTypingIndicator(conversationId);
  const { startCall, status: callStatus } = useCall();

  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [wallpaperPickerOpen, setWallpaperPickerOpen] = useState(false);
  const [wallpaperRefresh, setWallpaperRefresh] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const messages: Message[] = data ? data.pages.flatMap((p) => p.messages).reverse() : [];

  useEffect(() => {
    if (!socket || !conversationId) return;

    function handleTyping({ userId }: { conversationId: string; userId: string }) {
      if (userId === currentUser?.id) return;
      const member = conversation?.members.find((m) => m.userId === userId);
      setTypingUser(member?.user.name ?? 'Someone');
    }
    function handleStopTyping() {
      setTypingUser(null);
    }

    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);
    return () => {
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
    };
  }, [socket, conversationId, currentUser?.id, conversation?.members]);

  useEffect(() => {
    if (isFirstLoad.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstLoad.current = false;
    }
  }, [messages.length]);

  useEffect(() => {
    isFirstLoad.current = true;
  }, [conversationId]);

  useEffect(() => {
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;
    if (el.scrollTop < 100) {
      const prevHeight = el.scrollHeight;
      fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }

  async function handleEdit(id: string, content: string) {
    socket?.emit('editMessage', { messageId: id, content });
  }

  async function handleDelete(id: string) {
    socket?.emit('deleteMessage', { messageId: id });
  }

  function handleSend(content: string) {
    sendMessage(conversationId, content, 'TEXT');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleSendImage(url: string) {
    sendMessage(conversationId, url, 'IMAGE');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleSendAudio(url: string, duration: number) {
    sendMessage(conversationId, url, 'AUDIO', duration);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function handleStartCall() {
    if (conversation?.type !== 'PRIVATE' || !otherMember || callStatus !== 'idle') return;
    startCall(conversationId, otherMember.userId);
  }

  const otherMember =
    conversation?.type === 'PRIVATE'
      ? conversation.members.find((m) => m.userId !== currentUser?.id)
      : null;
  const headerName =
    conversation?.type === 'GROUP' ? conversation.name : otherMember?.user.name ?? '...';
  const headerImage = resolveAvatarUrl(
    conversation?.type === 'GROUP' ? conversation.image : otherMember?.user.profileImage
  );

  const wallpaperSetting = getConversationWallpaper(conversationId);
  const wallpaperStyle = resolveWallpaperStyle(wallpaperSetting, resolveAvatarUrl);

  return (
    <div className="flex h-full flex-col bg-[var(--wa-chat-bg)]" style={{ fontFamily: 'Poppins, sans-serif', ...wallpaperStyle }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2" style={{ backgroundColor: 'var(--wa-header)' }}>
        <div className="flex items-center">
          <button
            onClick={() => router.push('/chat')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/10 md:hidden"
            title="Back"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (conversation?.type === 'GROUP') router.push(`/groups/${conversationId}`);
              else if (otherMember) router.push(`/users/${otherMember.userId}`);
            }}
            disabled={!otherMember && conversation?.type !== 'GROUP'}
            className="flex flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold text-white">
              {headerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerImage} alt={headerName ?? ''} className="h-full w-full object-cover" />
              ) : (
                headerName?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{headerName}</p>
              {otherMember && (
                <p className="text-xs text-white/75">
                  {otherMember.user.status === 'ONLINE' ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1">
          {conversation?.type === 'PRIVATE' && (
            <button
              onClick={handleStartCall}
              disabled={callStatus !== 'idle'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/10 disabled:opacity-40"
              title="Voice call"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setWallpaperPickerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
            title="Chat wallpaper"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size={24} />
          </div>
        ) : (
          <>
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Spinner size={16} />
              </div>
            )}
            {messages.map((message, i) => {
              const prev = messages[i - 1];
              const showAvatar = !prev || prev.senderId !== message.senderId;

              const showDateSeparator =
                !prev ||
                new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-[var(--wa-input-pill)]/90 px-3 py-1 text-[11px] font-medium shadow-sm" style={{ color: 'var(--wa-text-secondary)' }}>
                        {dateLabel(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={message.senderId === currentUser?.id}
                    showAvatar={showAvatar}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {typingUser && <TypingIndicator name={typingUser} />}

      <MessageInput
        onSend={handleSend}
        onSendImage={handleSendImage}
        onSendAudio={handleSendAudio}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
      />

      {wallpaperPickerOpen && (
        <WallpaperPicker
          conversationId={conversationId}
          onClose={() => setWallpaperPickerOpen(false)}
          onChange={() => setWallpaperRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}