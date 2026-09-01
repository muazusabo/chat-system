// app/chat/MessageInput.tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { useUploadMessageImage, useUploadMessageAudio } from '@/lib/hooks/useMessages';
import { Spinner } from '@/components/ui/Spinner';

// WhatsApp's input is a flat white pill, no neumorphic shadow.

// Prefer a broadly-supported, small container. Browsers vary in which of
// these they actually support — MediaRecorder.isTypeSupported lets us pick
// the first one the current browser can actually produce.
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const MAX_RECORDING_SECONDS = 600; // matches the backend DTO's @Max(600)

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MessageInput({
  onSend,
  onSendImage,
  onSendAudio,
  onTypingStart,
  onTypingStop,
}: {
  onSend: (content: string) => void;
  onSendImage: (url: string) => void;
  onSendAudio: (url: string, duration: number) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadMessageImage();
  const uploadAudio = useUploadMessageAudio();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // Safety net: if the component unmounts mid-recording (e.g. navigating
    // away), stop the mic instead of leaving it recording in the background.
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        if (cancelledRef.current || chunksRef.current.length === 0) {
          chunksRef.current = [];
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType ?? 'audio/webm' });
        const duration = recordingSeconds;
        chunksRef.current = [];

        uploadAudio.mutate(
          { blob, duration },
          {
            onSuccess: (data) => onSendAudio(data.url, data.duration ?? duration),
            onError: (err) => setError(err instanceof Error ? err.message : 'Upload failed'),
          }
        );
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access denied or unavailable');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function cancelRecording() {
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  return (
    <div className="bg-[var(--wa-input-bar)] px-3 pb-3">
      {error && <p className="pb-1 text-xs text-red-500">{error}</p>}
      {uploadImage.isPending && (
        <div className="flex items-center gap-2 pb-1 text-xs text-[var(--wa-text-secondary)]">
          <Spinner size={12} /> Sending image...
        </div>
      )}
      {uploadAudio.isPending && (
        <div className="flex items-center gap-2 pb-1 text-xs text-[var(--wa-text-secondary)]">
          <Spinner size={12} /> Sending voice note...
        </div>
      )}

      {isRecording ? (
        <div className={`flex items-center gap-3 rounded-2xl bg-[var(--wa-input-pill)] px-4 py-2.5 shadow-sm`}>
          <button
            onClick={cancelRecording}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-black/5"
            title="Cancel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="flex-1 text-sm text-[var(--wa-text)]">
            {formatDuration(recordingSeconds)}
          </span>

          <button
            onClick={stopRecording}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--wa-accent)] text-white hover:bg-[var(--wa-accent-hover)]"
            title="Send voice note"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--wa-text-secondary)] transition-colors hover:bg-black/5 disabled:opacity-50"
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
            className={`max-h-32 flex-1 resize-none rounded-2xl bg-[var(--wa-input-pill)] px-4 py-2.5 text-sm text-[var(--wa-text)] outline-none placeholder:text-[var(--wa-text-secondary)] shadow-sm`}
          />

          {value.trim() ? (
            <button
              onClick={handleSend}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wa-accent)] text-white transition-colors hover:bg-[var(--wa-accent-hover)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={uploadAudio.isPending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wa-accent)] text-white transition-colors hover:bg-[var(--wa-accent-hover)] disabled:opacity-50"
              title="Record voice note"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}