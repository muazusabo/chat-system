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
import { CallProvider } from '@/components/calls/callprovider';
import { CallOverlay } from '@/components/calls/calloverlay';
import { useTheme } from '@/lib/hooks/useTheme';

type FilterTab = 'all' | 'unread' | 'groups';
type NavTab = 'chats' | 'updates' | 'communities' | 'calls';

const WA_GREEN = 'var(--wa-header)';
const WA_GREEN_DARK = 'var(--wa-accent-hover)';
const WA_ACCENT = 'var(--wa-accent)';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { data: conversations, isLoading } = useConversations();
  const socket = useSocket();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [navTab, setNavTab] = useState<NavTab>('chats');
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
    <CallProvider>
      <div className="flex h-screen bg-[var(--wa-sidebar-bg)]">
      <div
        className={`relative flex w-full shrink-0 flex-col bg-[var(--wa-sidebar-bg)] md:w-[400px] md:border-r md:border-[var(--wa-border)] ${
          isConversationOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header — WhatsApp green */}
        <div className="flex items-center gap-4 px-4 py-3" style={{ backgroundColor: WA_GREEN }}>
          <h1 className="text-xl font-semibold text-white">WhatsApp</h1>
          <div className="ml-auto flex items-center gap-5">
            <button className="text-white/90 hover:text-white" title="Camera">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path
                  d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
            <button className="text-white/90 hover:text-white" title="Search">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="text-white/90 hover:text-white" title="Menu">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-56 overflow-hidden rounded-lg bg-[var(--wa-sidebar-bg)] py-1.5 shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-[var(--wa-border)] px-3 pb-3 pt-1">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[var(--wa-avatar-bg)] text-sm font-semibold text-[var(--wa-avatar-text)]">
                      {ownAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ownAvatar} alt={user?.name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--wa-text)]">{user?.name}</p>
                      <p className="truncate text-xs text-[var(--wa-text-secondary)]">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/profile');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/contacts');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                  >
                    New chat
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/groups/new');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                  >
                    New group
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                  >
                    <span>Dark mode</span>
                    <span
                      className="flex h-5 w-9 items-center rounded-full px-0.5 transition-colors"
                      style={{ backgroundColor: theme === 'dark' ? WA_ACCENT : 'var(--wa-border)' }}
                    >
                      <span
                        className="h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                  >
                    Settings
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push('/admin');
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--wa-tab-text)] hover:bg-[var(--wa-input-bar)]"
                    >
                      Admin dashboard
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {navTab === 'chats' ? (
          <>
            {/* Search */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--wa-input-bar)] px-3 py-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--wa-avatar-text)]">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Meta AI or Search"
                  className="w-full bg-transparent text-sm text-[var(--wa-text)] outline-none placeholder:text-[var(--wa-text-secondary)]"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-3 pb-2">
              {([
                { id: 'all' as FilterTab, label: 'All' },
                { id: 'unread' as FilterTab, label: `Unread${unreadTotal > 0 ? ` ${unreadTotal}` : ''}` },
                { id: 'groups' as FilterTab, label: 'Groups' },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    tab === t.id ? 'text-white' : 'bg-[var(--wa-input-bar)] text-[var(--wa-tab-text)] hover:bg-[var(--wa-border)]'
                  }`}
                  style={tab === t.id ? { backgroundColor: WA_GREEN } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size={24} />
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <ConversationListItem key={c.id} conversation={c} isTyping={typingIds.has(c.id)} />
                ))
              ) : sorted.length > 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <p className="text-sm text-[var(--wa-text-secondary)]">
                    {query.trim() ? `No chats match "${query}"` : 'Nothing here yet'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <p className="text-sm text-[var(--wa-text-secondary)]">No conversations yet</p>
                  <button onClick={() => router.push('/contacts')} className="text-sm font-medium" style={{ color: WA_GREEN }}>
                    Start a chat
                  </button>
                </div>
              )}
            </div>

            {/* Floating new-chat button */}
            <button
              onClick={() => router.push('/contacts')}
              className="absolute bottom-20 right-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform hover:scale-105 md:bottom-6"
              style={{ backgroundColor: WA_ACCENT }}
              title="New chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.3" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-[var(--wa-text-secondary)]">
              {navTab === 'updates' && "Updates aren't available yet"}
              {navTab === 'communities' && "Communities aren't available yet"}
              {navTab === 'calls' && "Calls aren't available yet"}
            </p>
          </div>
        )}

        {/* Bottom nav bar */}
        <div className="flex items-center justify-around border-t border-[var(--wa-border)] bg-[var(--wa-sidebar-bg)] py-2 md:hidden">
          {([
            { id: 'chats' as NavTab, label: 'Chats', badge: unreadTotal },
            { id: 'updates' as NavTab, label: 'Updates' },
            { id: 'communities' as NavTab, label: 'Communities' },
            { id: 'calls' as NavTab, label: 'Calls' },
          ]).map((n) => (
            <button
              key={n.id}
              onClick={() => setNavTab(n.id)}
              className="relative flex flex-col items-center gap-1 px-3 py-1"
            >
              <NavIcon id={n.id} active={navTab === n.id} />
              <span
                className="text-[11px] font-medium"
                style={{ color: navTab === n.id ? WA_GREEN_DARK : 'var(--wa-text-secondary)' }}
              >
                {n.label}
              </span>
              {!!n.badge && (
                <span
                  className="absolute -right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: WA_ACCENT }}
                >
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 ${isConversationOpen ? 'flex' : 'hidden md:flex'}`}>{children}</div>
      </div>
      <CallOverlay />
    </CallProvider>
  );
}

function NavIcon({ id, active }: { id: NavTab; active: boolean }) {
  const color = active ? 'var(--wa-accent-hover)' : 'var(--wa-text-secondary)';
  if (id === 'chats') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === 'updates') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        <path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'communities') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-5.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}