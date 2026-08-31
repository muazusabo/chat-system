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
import type { Message } from '@/lib/types';

const raised = 'shadow-[3px_3px_6px_var(--neu-shadow-dark),-3px_-3px_6px_var(--neu-shadow-light)]';

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
    <div className="flex h-full flex-col" style={{ fontFamily: 'Poppins, sans-serif', ...wallpaperStyle }}>
      {/* Header */}
      <div className={`flex items-center justify-between bg-[var(--neu-bg)] px-2 py-2 ${raised}`}>
        <div className="flex items-center">
          <button
            onClick={() => router.push('/chat')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--neu-text-secondary)] hover:bg-black/5 md:hidden"
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
            className="flex flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-black/5 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--neu-card-alt)] text-sm font-bold text-[var(--neu-text-secondary)]">
              {headerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerImage} alt={headerName ?? ''} className="h-full w-full object-cover" />
              ) : (
                headerName?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--neu-text-primary)]">{headerName}</p>
              {otherMember && (
                <p className="text-xs text-[var(--neu-text-secondary)]">
                  {otherMember.user.status === 'ONLINE' ? 'Online' : 'Offline'}
                </p>
              )}
            </div>
          </button>
        </div>
        <button
          onClick={() => setWallpaperPickerOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--neu-text-secondary)] hover:bg-black/5"
          title="Chat wallpaper"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" />
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
                      <span className="rounded-full bg-[var(--neu-bg)] px-3 py-1 text-[11px] font-medium text-[var(--neu-text-secondary)]">
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