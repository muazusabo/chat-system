// app/contacts/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useContacts,
  useIncomingRequests,
  useOutgoingRequests,
  useUserSearch,
  useSendContactRequest,
  useAcceptContactRequest,
  useRejectContactRequest,
} from '@/lib/hooks/useContacts';
import { useCreateConversation } from '@/lib/hooks/useConversations';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Spinner } from '@/components/ui/Spinner';

type Tab = 'contacts' | 'requests' | 'search' | 'find';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';
const inset = 'shadow-[inset_5px_5px_10px_var(--neu-shadow-dark),inset_-5px_-5px_10px_var(--neu-shadow-light)]';

export default function ContactsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('contacts');
  const [search, setSearch] = useState('');
  const [findQuery, setFindQuery] = useState('');

  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: incoming, isLoading: incomingLoading } = useIncomingRequests();
  const { data: outgoing } = useOutgoingRequests();
  const { data: findResults, isLoading: findLoading } = useUserSearch(findQuery);

  const sendRequest = useSendContactRequest();
  const acceptRequest = useAcceptContactRequest();
  const rejectRequest = useRejectContactRequest();
  const createConversation = useCreateConversation();

  async function handleMessage(userId: string) {
    const conversation = await createConversation.mutateAsync({
      type: 'PRIVATE',
      memberIds: [userId],
    });
    router.push(`/chat/${conversation.id}`);
  }

  const filteredContacts = (contacts ?? []).filter((c) =>
    c.user.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const outgoingIds = new Set((outgoing ?? []).map((r) => r.receiverId));
  const contactIds = new Set((contacts ?? []).map((c) => c.user.id));

  return (
    <div className="min-h-screen bg-[var(--neu-bg)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--neu-text-primary)]">Contacts</h1>
            <p className="text-xs text-[var(--neu-text-secondary)]">Manage your connections</p>
          </div>
          <button
            onClick={() => router.push('/groups/new')}
            className={`ml-auto rounded-2xl bg-[var(--neu-bg)] px-4 py-2.5 text-xs font-bold tracking-wide text-red-500 transition-transform active:scale-95 ${raised}`}
          >
            + NEW GROUP
          </button>
        </div>

        <div className={`mb-6 flex gap-1.5 rounded-2xl bg-[var(--neu-bg)] p-1.5 ${inset}`}>
          {(['contacts', 'requests', 'search', 'find'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                tab === t
                  ? `bg-[var(--neu-bg)] text-red-500 ${raised}`
                  : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
              }`}
            >
              {t === 'find' ? 'Find' : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'requests' && incoming && incoming.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {incoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'contacts' && (
          <div className="flex flex-col gap-3">
            {contactsLoading ? (
              <div className="flex justify-center py-14"><Spinner size={24} /></div>
            ) : contacts && contacts.length > 0 ? (
              contacts.map((c) => (
                <div key={c.contactId} className={`flex items-center gap-4 rounded-2xl bg-[var(--neu-bg)] p-4 ${raised}`}>
                  <Avatar name={c.user.name} image={c.user.profileImage} online={c.user.status === 'ONLINE'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--neu-text-primary)]">{c.user.name}</p>
                    <p className="text-xs text-[var(--neu-text-secondary)]">
                      {c.user.status === 'ONLINE' ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMessage(c.user.id)}
                    disabled={createConversation.isPending}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neu-bg)] text-red-500 transition-transform active:scale-90 disabled:opacity-40 ${raised}`}
                    title="Message"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <EmptyState text="No contacts yet — try the Find tab" raised={raised} />
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="flex flex-col gap-3">
            {incomingLoading ? (
              <div className="flex justify-center py-14"><Spinner size={24} /></div>
            ) : incoming && incoming.length > 0 ? (
              incoming.map((req) => (
                <div key={req.id} className={`flex items-center gap-4 rounded-2xl bg-[var(--neu-bg)] p-4 ${raised}`}>
                  <Avatar name={req.sender?.name ?? '?'} image={req.sender?.profileImage ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--neu-text-primary)]">{req.sender?.name}</p>
                    <p className="text-xs text-[var(--neu-text-secondary)]">wants to connect</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptRequest.mutate(req.id)}
                      className={`rounded-xl bg-[var(--neu-bg)] px-3.5 py-2 text-xs font-bold text-emerald-600 transition-transform active:scale-95 ${raised}`}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectRequest.mutate(req.id)}
                      className={`rounded-xl bg-[var(--neu-bg)] px-3.5 py-2 text-xs font-bold text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No pending requests" raised={raised} />
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-3 rounded-2xl bg-[var(--neu-bg)] px-4 py-3 ${inset}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--neu-text-secondary)]">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends by name"
                className="w-full bg-transparent text-sm text-[var(--neu-text-primary)] outline-none placeholder:text-[var(--neu-text-tertiary)]"
              />
            </div>
            {contactsLoading ? (
              <div className="flex justify-center py-14"><Spinner size={24} /></div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((c) => (
                <div key={c.contactId} className={`flex items-center gap-4 rounded-2xl bg-[var(--neu-bg)] p-4 ${raised}`}>
                  <Avatar name={c.user.name} image={c.user.profileImage} online={c.user.status === 'ONLINE'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--neu-text-primary)]">{c.user.name}</p>
                    <p className="text-xs text-[var(--neu-text-secondary)]">
                      {c.user.status === 'ONLINE' ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMessage(c.user.id)}
                    disabled={createConversation.isPending}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--neu-bg)] text-red-500 transition-transform active:scale-90 disabled:opacity-40 ${raised}`}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.97-4.03 9-9 9-1.5 0-2.91-.37-4.15-1.02L3 21l1.02-3.85A8.96 8.96 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <EmptyState text={contacts?.length === 0 ? 'No friends yet' : 'No matches'} raised={raised} />
            )}
          </div>
        )}

        {tab === 'find' && (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-3 rounded-2xl bg-[var(--neu-bg)] px-4 py-3 ${inset}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--neu-text-secondary)]">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder="Search by name or email"
                className="w-full bg-transparent text-sm text-[var(--neu-text-primary)] outline-none placeholder:text-[var(--neu-text-tertiary)]"
              />
            </div>
            {findLoading ? (
              <div className="flex justify-center py-14"><Spinner size={24} /></div>
            ) : findQuery.trim() && findResults && findResults.length > 0 ? (
              findResults.map((u) => {
                const isContact = contactIds.has(u.id);
                const requestSent = outgoingIds.has(u.id);
                return (
                  <div key={u.id} className={`flex items-center gap-4 rounded-2xl bg-[var(--neu-bg)] p-4 ${raised}`}>
                    <Avatar name={u.name} image={u.profileImage} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--neu-text-primary)]">{u.name}</p>
                      <p className="truncate text-xs text-[var(--neu-text-secondary)]">{u.email}</p>
                    </div>
                    {isContact ? (
                      <span className="text-xs font-medium text-[var(--neu-text-tertiary)]">Connected</span>
                    ) : requestSent ? (
                      <span className="text-xs font-medium text-[var(--neu-text-tertiary)]">Sent</span>
                    ) : (
                      <button
                        onClick={() => sendRequest.mutate(u.id)}
                        disabled={sendRequest.isPending}
                        className={`rounded-xl bg-[var(--neu-bg)] px-3.5 py-2 text-xs font-bold text-red-500 transition-transform active:scale-95 disabled:opacity-40 ${raised}`}
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })
            ) : findQuery.trim() ? (
              <EmptyState text="No users found" raised={raised} />
            ) : (
              <EmptyState text="Type a name or email to find new people" raised={raised} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ name, image, online }: { name: string; image: string | null; online?: boolean }) {
  const resolved = resolveAvatarUrl(image);
  return (
    <div className="relative shrink-0">
      <div
        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[var(--neu-bg)] text-sm font-bold text-[var(--neu-text-secondary)]"
        style={{ boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)' }}
      >
        {resolved ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolved} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--neu-bg)] bg-emerald-500" />}
    </div>
  );
}

function EmptyState({ text, raised }: { text: string; raised: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-6 py-14 text-center ${raised}`}>
      <p className="text-sm text-[var(--neu-text-secondary)]">{text}</p>
    </div>
  );
}