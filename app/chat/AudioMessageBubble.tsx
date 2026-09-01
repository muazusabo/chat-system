// app/chat/AudioMessageBubble.tsx
//
// Drop-in content renderer for type === 'AUDIO' messages. Doesn't know
// anything about bubble chrome (colors, own/other alignment, timestamp,
// edit/delete menu) — it only renders what goes *inside* the bubble, same
// job as the <p>{message.content}</p> line already does for TEXT messages.
'use client';

import { useRef, useState, useEffect } from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function AudioMessageBubble({ url, duration }: { url: string; duration: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [knownDuration, setKnownDuration] = useState(duration ?? 0);

  // Resolve the audio URL with API base URL if needed
  const resolvedUrl = resolveAvatarUrl(url) ?? url;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      if (!audio || !audio.duration || Number.isNaN(audio.duration)) return;
      setCurrentTime(audio.currentTime);
      setProgress(audio.currentTime / audio.duration);
    }
    function onLoadedMetadata() {
      if (!audio) return;
      if (audio.duration && !Number.isNaN(audio.duration) && Number.isFinite(audio.duration)) {
        setKnownDuration(audio.duration);
      }
    }
    function onEnded() {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !knownDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * knownDuration;
    setProgress(ratio);
  }

  const displaySeconds = isPlaying || currentTime > 0 ? currentTime : knownDuration;

  return (
    <div className="flex min-w-[180px] items-center gap-2.5">
      <audio ref={audioRef} src={resolvedUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div
          onClick={handleSeek}
          className="h-1.5 w-full cursor-pointer rounded-full bg-black/10"
        >
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <span className="text-[11px] text-[var(--neu-text-secondary)]">
          {formatDuration(displaySeconds)}
        </span>
      </div>
    </div>
  );
}