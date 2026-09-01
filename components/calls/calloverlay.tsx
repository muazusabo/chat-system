// components/calls/CallOverlay.tsx
'use client';

import { useCall } from './callprovider';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { resolveAvatarUrl } from '@/lib/avatar';
import { useEffect, useRef } from 'react';

function formatCallDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// The old approach used a data: URL "ringtone" that was really just a WAV
// header with no samples after it — it played, but silently, so the ring
// never actually sounded. This synthesizes a real two-tone ring pattern
// with the Web Audio API instead, no external asset needed.
function useRingtone(isRinging: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(true);

  useEffect(() => {
    if (!isRinging) {
      stoppedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      return;
    }

    stoppedRef.current = false;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    const playBeepPair = () => {
      if (stoppedRef.current || ctx.state === 'closed') return;
      [0, 0.4].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.36);
      });
      timeoutRef.current = setTimeout(playBeepPair, 2000);
    };

    // Autoplay policies can block AudioContext until a user gesture has
    // happened somewhere on the page; resume() is a no-op if already running.
    ctx.resume().finally(playBeepPair);

    return () => {
      stoppedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ctx.close().catch(() => {});
    };
  }, [isRinging]);
}

export function CallOverlay() {
  const { status, incomingCall, remoteUserId, answerCall, rejectCall, endCall, isMuted, toggleMute, callDurationSeconds } =
    useCall();

  useRingtone(status === 'incoming');

  // Whoever is on the other end of the call, regardless of who initiated it.
  const otherUserId = status === 'incoming' ? incomingCall?.fromUserId : remoteUserId;
  const { data: otherUserData, isLoading: isLoadingOtherUser } = useUserProfile(otherUserId ?? undefined);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (status === 'incoming') {
        if (e.code === 'Space') {
          e.preventDefault();
          answerCall();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          rejectCall();
        }
      } else if (status === 'connected') {
        if (e.code === 'KeyM') {
          e.preventDefault();
          toggleMute();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          endCall();
        }
      } else if (status === 'outgoing') {
        if (e.code === 'Escape') {
          e.preventDefault();
          endCall();
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [status, answerCall, rejectCall, endCall, toggleMute]);

  if (status === 'idle') return null;

  const otherUserName = otherUserData?.name || 'Unknown Caller';
  const otherUserAvatarUrl = resolveAvatarUrl(otherUserData?.profileImage);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      {/* Status icon */}
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-blue-500/20 ring-2 ring-emerald-400/30">
        {status === 'incoming' && (
          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/20" />
        )}
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="relative">
          <path
            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Caller/callee info — shown for every non-idle state */}
      <div className="text-center min-h-[6.5rem]">
        {isLoadingOtherUser ? (
          <>
            <div className="mb-4 h-20 w-20 animate-pulse rounded-full bg-slate-700 mx-auto" />
            <div className="h-5 w-32 animate-pulse rounded bg-slate-700 mx-auto mb-2" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-600 mx-auto" />
          </>
        ) : (
          <>
            {otherUserAvatarUrl && (
              <img
                src={otherUserAvatarUrl}
                alt={otherUserName}
                className="mb-4 h-20 w-20 rounded-full object-cover ring-4 ring-emerald-400/40 mx-auto"
              />
            )}
            <p className="text-2xl font-bold">{otherUserName}</p>
            <p className="text-sm text-slate-300 mt-1">
              {status === 'incoming' && 'is calling...'}
              {status === 'outgoing' && 'Calling...'}
              {status === 'connected' && (
                <span className="tabular-nums font-mono text-emerald-400">
                  {formatCallDuration(callDurationSeconds)}
                </span>
              )}
            </p>
          </>
        )}
      </div>

      {status === 'incoming' && (
        <div className="flex flex-col items-center gap-6 w-full px-8">
          <button
            onClick={answerCall}
            disabled={isLoadingOtherUser}
            className="w-full max-w-xs h-16 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/50 transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg active:scale-95"
            title="Answer call (Space)"
            aria-label="Answer call"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 013.11 4.87 2 2 0 015.11 2.87h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Answer Call
          </button>

          <button
            onClick={rejectCall}
            className="w-full max-w-xs h-14 rounded-full bg-slate-700/50 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/60 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-base text-red-400 hover:text-red-300 active:scale-95"
            title="Reject call (Esc)"
            aria-label="Reject call"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            Decline
          </button>

          <p className="text-xs text-slate-400 text-center mt-2">
            Press <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Space</kbd> to answer or{' '}
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Esc</kbd> to decline
          </p>
        </div>
      )}

      {status === 'outgoing' && (
        <div className="flex flex-col items-center gap-6 w-full px-8">
          <div className="flex gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
          <button
            onClick={endCall}
            className="w-full max-w-xs h-14 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-red-400 hover:text-red-300 active:scale-95"
            title="Cancel call (Esc)"
            aria-label="Cancel call"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {status === 'connected' && (
        <div className="flex flex-col items-center gap-6 w-full px-8">
          <div className="flex gap-4">
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                isMuted
                  ? 'bg-red-500/30 border border-red-500 text-red-400 hover:bg-red-500/40'
                  : 'bg-slate-700/50 border border-slate-600 text-white hover:bg-slate-600'
              }`}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6M19 11a7 7 0 01-1.11 3.79M5 11a7 7 0 007 7 6.96 6.96 0 003.79-1.11M12 18v3M2 2l20 20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500 transition-all duration-200 active:scale-95"
              title="End call (Esc)"
              aria-label="End call"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Press <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">M</kbd> to toggle mute or{' '}
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Esc</kbd> to end
          </p>
        </div>
      )}
    </div>
  );
}