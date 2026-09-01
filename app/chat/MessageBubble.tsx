// app/chat/MessageBubble.tsx
'use client';

import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';
import { AudioMessageBubble } from './AudioMessageBubble';
import type { Message } from '@/lib/types';

// Authentic WhatsApp bubble colors.
const WA_OWN_BUBBLE = 'var(--wa-own-bubble)';
const WA_TEXT = 'var(--wa-text)';
const WA_TICK_GRAY = 'var(--wa-tick)';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Static double-check "sent" indicator — gray ticks, matching WhatsApp's
// unread state. There's no read-receipt data in the Message model yet, so
// this always shows "sent," never the blue "read" ticks — that would need
// a real read-receipt field to be honest rather than decorative.
function SentTicks() {
  return (
    <svg width="15" height="11" viewBox="0 0 16 11" fill="none" className="inline-block align-text-bottom">
      <path d="M1 5.5L4.5 9L11 1.5" stroke={WA_TICK_GRAY} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 5.5L9 9L15.5 1.5" stroke={WA_TICK_GRAY} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onEdit,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  function submitEdit() {
    if (draft.trim() && draft !== message.content) {
      onEdit(message.id, draft.trim());
    }
    setEditing(false);
  }

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} px-4 py-0.5`}>
      <div className={`flex max-w-[65%] items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && (
          <div className="h-6 w-6 shrink-0">
            {showAvatar && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--wa-avatar-bg)] text-[10px] font-bold text-[var(--wa-avatar-text)]">
                {message.sender?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {editing ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--wa-input-pill)] px-3 py-2 shadow-sm">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="bg-transparent text-sm outline-none"
                style={{ color: WA_TEXT }}
              />
              <button onClick={submitEdit} className="text-xs font-semibold hover:opacity-80" style={{ color: 'var(--wa-accent)' }}>
                Save
              </button>
            </div>
          ) : (
            <div
              className={`rounded-lg px-2.5 py-1.5 text-sm leading-relaxed shadow-sm ${
                isOwn ? 'rounded-tr-none' : 'rounded-tl-none'
              }`}
              style={{ backgroundColor: isOwn ? WA_OWN_BUBBLE : 'var(--wa-other-bubble)', color: WA_TEXT }}
            >
              {message.type === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveAvatarUrl(message.content) ?? message.content}
                  alt="Sent image"
                  className="max-h-72 max-w-full rounded-md object-cover"
                />
              ) : message.type === 'AUDIO' ? (
                <AudioMessageBubble url={message.content} duration={message.duration} />
              ) : (
                <p className="whitespace-pre-wrap break-words px-0.5">{message.content}</p>
              )}
              <span className="float-right ml-2 mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--wa-text-secondary)' }}>
                {formatTime(message.createdAt)}
                {isOwn && <SentTicks />}
              </span>
            </div>
          )}

          {isOwn && !editing && (
            <div className="absolute -left-7 top-1/2 hidden -translate-y-1/2 group-hover:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-1 hover:bg-[var(--wa-menu-hover)]"
                style={{ color: 'var(--wa-text-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-6 z-10 w-28 rounded-lg bg-[var(--wa-menu-bg)] py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--wa-menu-hover)]"
                    style={{ color: WA_TEXT }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(message.id);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-[var(--wa-menu-hover)]"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}