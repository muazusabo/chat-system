// app/chat/layout.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useConversations } from '@/lib/hooks/useConversations';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAuthStore } from '@/lib/auth-store';
import { useLogout } from '@/lib/hooks/useAuth';
import { resolveAvatarUrl } from '@/lib/avatar';
import { ConversationListItem } from '@/app/chat/ConversationListItem';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';

type FilterTab = 'all' | 'unread' | 'groups';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';
const inset = 'shadow-[inset_5px_5px_10px_var(--neu-shadow-dark),inset_-5px_-5px_10px_var(--neu-shadow-light)]';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { data: conversations, isLoading } = useConversations();
  const socket = useSocket();
  const logout = useLogout();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isConversationOpen = pathname !== '/chat';

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!socket) return;

    function handleTyping({ conversationId, userId }: { conversationId: string; userId: string }) {
      if (userId === user?.id) return;
      setTypingIds((prev) => new Set(prev).add(conversationId));
    }
    function handleStopTyping({ conversationId }: { conversationId: string }) {
      setTypingIds((prev) => {
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    }

    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);
    return () => {
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
    };
  }, [socket, user?.id]);

  const sorted = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
  }, [conversations]);

  const searched = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();
    return sorted.filter((c) => {
      const name =
        c.type === 'GROUP'
          ? c.name ?? 'Group'
          : c.members.find((m) => m.userId !== user?.id)?.user.name ?? 'Unknown';
      return name.toLowerCase().includes(q);
    });
  }, [sorted, query, user?.id]);

  const filtered = useMemo(() => {
    if (tab === 'unread') return searched.filter((c) => c.unreadCount > 0);
    if (tab === 'groups') return searched.filter((c) => c.type === 'GROUP');
    return searched;
  }, [searched, tab]);

  const unreadTotal = sorted.filter((c) => c.unreadCount > 0).length;

  if (authStatus === 'loading') return <FullPageSpinner />;
  if (authStatus === 'unauthenticated') return null;

  const ownAvatar = resolveAvatarUrl(user?.profileImage);

  return (
    <div className="flex h-screen bg-[var(--neu-bg)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div
        className={`relative flex w-full shrink-0 flex-col bg-[var(--neu-bg)] md:w-[380px] ${
          isConversationOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--neu-bg)] text-sm font-bold text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
              title="Account"
            >
              {ownAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ownAvatar} alt={user?.name ?? ''} className="h-full w-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </button>

            {menuOpen && (
              <div className={`absolute left-0 top-[52px] z-20 w-52 overflow-hidden rounded-2xl bg-[var(--neu-bg)] py-1.5 ${raised}`}>
                <div className="border-b border-[var(--neu-border)] px-3 pb-2.5 pt-1">
                  <p className="truncate text-sm font-semibold text-[var(--neu-text-primary)]">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--neu-text-secondary)]">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--neu-text-primary)] hover:bg-black/5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--neu-text-primary)] hover:bg-black/5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                    <path
                      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Settings
                </button>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/admin');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--neu-text-primary)] hover:bg-black/5"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>

          <h1 className="flex-1 text-xl font-bold text-[var(--neu-text-primary)]">Chats</h1>

          <button
            onClick={() => router.push('/contacts')}
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
            title="Contacts"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-3 rounded-2xl bg-[var(--neu-bg)] px-4 py-3 ${inset}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--neu-text-secondary)]">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm text-[var(--neu-text-primary)] outline-none placeholder:text-[var(--neu-text-tertiary)]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`mx-4 mb-3 flex gap-1.5 rounded-2xl bg-[var(--neu-bg)] p-1.5 ${inset}`}>
          {([
            { id: 'all' as FilterTab, label: 'All' },
            { id: 'unread' as FilterTab, label: `Unread${unreadTotal > 0 ? ` (${unreadTotal})` : ''}` },
            { id: 'groups' as FilterTab, label: 'Groups' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                tab === t.id
                  ? `bg-[var(--neu-bg)] text-red-500 ${raised}`
                  : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size={24} />
            </div>
          ) : filtered.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {filtered.map((c) => (
                <div key={c.id} className={`overflow-hidden rounded-2xl bg-[var(--neu-bg)] ${raised}`}>
                  <ConversationListItem conversation={c} isTyping={typingIds.has(c.id)} />
                </div>
              ))}
            </div>
          ) : sorted.length > 0 ? (
            <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-6 py-12 text-center ${raised}`}>
              <p className="text-sm text-[var(--neu-text-secondary)]">
                {query.trim() ? `No chats match "${query}"` : 'Nothing here yet'}
              </p>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-6 py-12 text-center ${raised}`}>
              <p className="text-sm text-[var(--neu-text-secondary)]">No conversations yet</p>
              <button onClick={() => router.push('/contacts')} className="text-sm font-semibold text-red-500 hover:underline">
                Start a chat
              </button>
            </div>
          )}
        </div>

        {/* Floating new-chat button */}
        <button
          onClick={() => router.push('/contacts')}
          className={`absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--neu-bg)] text-red-500 transition-transform active:scale-90 ${raised}`}
          title="New chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M21 12c0 4.97-4.03 9-9 9-1.3 0-2.53-.28-3.65-.78L3 21l1.02-4.29A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={`flex-1 ${isConversationOpen ? 'flex' : 'hidden md:flex'}`}>{children}</div>
    </div>
  );
}