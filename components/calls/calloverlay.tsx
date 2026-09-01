// components/calls/CallOverlay.tsx
'use client';

import { useCall } from './callprovider';

function formatCallDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallOverlay() {
  const { status, answerCall, rejectCall, endCall, isMuted, toggleMute, callDurationSeconds } = useCall();

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/85 text-white backdrop-blur-sm">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {status === 'incoming' && (
        <>
          <p className="text-lg font-medium">Incoming call</p>
          <div className="flex gap-8">
            <button
              onClick={rejectCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
              title="Decline"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={answerCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600"
              title="Answer"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 013.11 4.87 2 2 0 015.11 2.87h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </>
      )}

      {status === 'outgoing' && (
        <>
          <p className="text-lg font-medium">Calling...</p>
          <button
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
            title="Cancel"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}

      {status === 'connected' && (
        <>
          <p className="text-lg font-medium tabular-nums">{formatCallDuration(callDurationSeconds)}</p>
          <div className="flex gap-8">
            <button
              onClick={toggleMute}
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isMuted ? 'bg-white text-black' : 'bg-white/15 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6M19 11a7 7 0 01-1.11 3.79M5 11a7 7 0 007 7 6.96 6.96 0 003.79-1.11M12 18v3M2 2l20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
              title="End call"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}