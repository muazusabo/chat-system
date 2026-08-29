// app/chat/MessageBubble.tsx
'use client';

import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';
import type { Message } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--neu-card-alt)] text-[10px] font-bold text-[var(--neu-text-secondary)]">
                {message.sender?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {editing ? (
            <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--neu-bg)] px-3 py-2 shadow-sm">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="bg-transparent text-sm text-[var(--neu-text-primary)] outline-none"
              />
              <button onClick={submitEdit} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                Save
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                isOwn
                  ? 'rounded-br-md bg-emerald-500 text-white'
                  : 'rounded-bl-md bg-[var(--neu-bg)] text-[var(--neu-text-primary)]'
              }`}
            >
              {message.type === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveAvatarUrl(message.content) ?? message.content}
                  alt="Sent image"
                  className="max-h-72 max-w-full rounded-lg object-cover"
                />
              ) : (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
              <span
                className={`float-right ml-2 mt-1 text-[10px] ${
                  isOwn ? 'text-emerald-50/80' : 'text-[var(--neu-text-tertiary)]'
                }`}
              >
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}

          {isOwn && !editing && (
            <div className="absolute -left-7 top-1/2 hidden -translate-y-1/2 group-hover:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-1 text-[var(--neu-text-secondary)] hover:bg-black/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-6 z-10 w-28 rounded-lg bg-[var(--neu-bg)] py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-[var(--neu-text-primary)] hover:bg-black/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(message.id);
                      setMenuOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-black/5"
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