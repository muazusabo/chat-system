// app/chat/MessageInput.tsx
'use client';

import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { useUploadMessageImage } from '@/lib/hooks/useMessages';
import { Spinner } from '@/components/ui/Spinner';

const raised = 'shadow-[3px_3px_6px_var(--neu-shadow-dark),-3px_-3px_6px_var(--neu-shadow-light)]';

export function MessageInput({
  onSend,
  onSendImage,
  onTypingStart,
  onTypingStop,
}: {
  onSend: (content: string) => void;
  onSendImage: (url: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadMessageImage();

  function handleChange(v: string) {
    setValue(v);
    onTypingStart();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTypingStop(), 1500);
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > 5000) return;
    onSend(trimmed);
    setValue('');
    onTypingStop();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Only JPEG, PNG, WEBP, and GIF images are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    uploadImage.mutate(file, {
      onSuccess: (data) => onSendImage(data.url),
      onError: (err) => setError(err instanceof Error ? err.message : 'Upload failed'),
    });
  }

  return (
    <div className="bg-[var(--neu-chat-bg)] px-3 pb-3">
      {error && <p className="pb-1 text-xs text-red-500">{error}</p>}
      {uploadImage.isPending && (
        <div className="flex items-center gap-2 pb-1 text-xs text-[var(--neu-text-secondary)]">
          <Spinner size={12} /> Sending image...
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImage.isPending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--neu-text-secondary)] transition-colors hover:bg-black/5 disabled:opacity-50"
          title="Attach image"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className={`max-h-32 flex-1 resize-none rounded-2xl bg-[var(--neu-bg)] px-4 py-2.5 text-sm text-[var(--neu-text-primary)] outline-none placeholder:text-[var(--neu-text-tertiary)] ${raised}`}
        />

        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-[var(--neu-card-alt)] disabled:text-[var(--neu-text-tertiary)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}