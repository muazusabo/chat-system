// lib/lastSeen.ts
//
// Client-side "last seen" tracking per conversation. This exists because the
// current Conversation/ConversationMember types have no unread/lastReadAt
// field from the backend. It gives an honest unread *indicator* (has this
// conversation gotten a new message since I last opened it), but not an
// exact unread *count* — that needs server-side support (e.g. a
// `lastReadAt` on ConversationMember) to be accurate across devices/sessions.

const KEY_PREFIX = 'chat:lastSeen:';

export function getLastSeen(conversationId: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY_PREFIX + conversationId);
}

export function markConversationSeen(conversationId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY_PREFIX + conversationId, new Date().toISOString());
}