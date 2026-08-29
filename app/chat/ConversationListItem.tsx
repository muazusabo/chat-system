// components/chat/ConversationListItem.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Conversation } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';
import { resolveAvatarUrl } from '@/lib/avatar';

function getDisplayInfo(conversation: Conversation, currentUserId: string) {
  if (conversation.type === 'GROUP') {
    return { name: conversation.name ?? 'Group', image: null as string | null };
  }
  const other = conversation.members.find((m) => m.userId !== currentUserId);
  return { name: other?.user.name ?? 'Unknown', image: other?.user.profileImage ?? null };
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationListItem({
  conversation,
  isTyping,
  hasUnread,
}: {
  conversation: Conversation;
  /** True while another member is currently typing in this conversation. */
  isTyping?: boolean;
  /** True if the last message arrived after this conversation was last opened. */
  hasUnread?: boolean;
}) {
  const pathname = usePathname();
  const currentUser = useAuthStore((s) => s.user);
  if (!currentUser) return null;

  const { name, image } = getDisplayInfo(conversation, currentUser.id);
  const resolvedImage = resolveAvatarUrl(image);
  const isActive = pathname === `/chat/${conversation.id}`;
  const lastMessage = conversation.lastMessage;

  const preview = isTyping
    ? 'Typing...'
    : lastMessage
      ? `${lastMessage.senderId === currentUser.id ? 'You: ' : ''}${lastMessage.content}`
      : 'No messages yet';

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        isActive ? 'bg-neutral-900' : 'hover:bg-neutral-900/60'
      }`}
    >
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-700 text-base font-semibold text-neutral-200 ${
          hasUnread ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-neutral-950' : ''
        }`}
      >
        {resolvedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedImage} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-neutral-50">{name}</p>
          <span className="shrink-0 text-xs text-neutral-500">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              isTyping ? 'font-medium text-violet-400' : 'text-neutral-500'
            }`}
          >
            {preview}
          </p>
          {hasUnread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-600" />}
        </div>
      </div>
    </Link>
  );
}