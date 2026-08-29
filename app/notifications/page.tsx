// app/notifications/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/hooks/useNotifications';
import { Spinner } from '@/components/ui/Spinner';
import type { AppNotification } from '@/lib/types';

function iconFor(type: AppNotification['type']) {
  switch (type) {
    case 'NEW_MESSAGE':
      return (
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z" />
      );
    case 'CONTACT_REQUEST':
    case 'CONTACT_ACCEPTED':
      return (
        <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z" />
      );
    case 'GROUP_INVITATION':
    case 'GROUP_MEMBER_ADDED':
      return <path d="M17 20h5v-2a4 4 0 00-4-4h-1m-9 6H2v-2a4 4 0 014-4h1m5-6a4 4 0 11-8 0 4 4 0 018 0zm6 4a3 3 0 100-6 3 3 0 000 6z" />;
    default:
      return <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
  }
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data ? data.pages.flatMap((p) => p.notifications) : [];

  function handleClick(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.type === 'NEW_MESSAGE' && n.relatedEntityId) {
      router.push(`/chat/${n.relatedEntityId}`);
    } else if (
      (n.type === 'CONTACT_REQUEST' || n.type === 'CONTACT_ACCEPTED') &&
      n.relatedEntityId
    ) {
      router.push('/contacts');
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white">Notifications</h1>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-100"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size={22} />
          </div>
        ) : notifications.length > 0 ? (
          <>
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-3 border-b border-neutral-900 px-6 py-3.5 text-left transition-colors hover:bg-neutral-900 ${
                  !n.isRead ? 'bg-neutral-900/40' : ''
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-300">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {iconFor(n.type)}
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-100">{n.title}</p>
                  <p className="mt-0.5 truncate text-sm text-neutral-500">{n.content}</p>
                  <p className="mt-1 text-xs text-neutral-600">{formatTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
              </button>
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                {isFetchingNextPage ? (
                  <Spinner size={18} />
                ) : (
                  <button
                    onClick={() => fetchNextPage()}
                    className="text-xs font-medium text-neutral-400 hover:text-neutral-100"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm text-neutral-500">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}