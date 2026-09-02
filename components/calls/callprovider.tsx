// components/calls/CallProvider.tsx
'use client';

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useSocket } from '@/lib/hooks/useSocket';

type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected';

interface IncomingCallInfo {
  conversationId: string;
  fromUserId: string;
  offer: RTCSessionDescriptionInit;
}

interface CallContextValue {
  status: CallStatus;
  remoteUserId: string | null;
  incomingCall: IncomingCallInfo | null;
  startCall: (conversationId: string, toUserId: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  callDurationSeconds: number;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : []),
];

export function CallProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Mirrors `status` for use inside socket callbacks, which otherwise close
  // over a stale value from when the listener was registered.
  const statusRef = useRef<CallStatus>('idle');
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopDurationTimer();

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    pendingCandidatesRef.current = [];
    setCallDurationSeconds(0);
    setStatus('idle');
    setRemoteUserId(null);
    setIncomingCall(null);
    setIsMuted(false);
  }, [stopDurationTimer]);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[Call] failed to add queued ICE candidate:', error);
      }
    }
  }, []);

  const waitForSocket = useCallback(async () => {
    if (!socket) throw new Error('Call signaling is unavailable');
    if (socket.connected) return;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.off('connect', handleConnect);
        reject(new Error('Call signaling is not connected'));
      }, 10000);

      const handleConnect = () => {
        clearTimeout(timeout);
        socket.off('connect', handleConnect);
        resolve();
      };

      socket.once('connect', handleConnect);
    });
  }, [socket]);

  const createPeerConnection = useCallback(
    (toUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call:ice-candidate', { toUserId, candidate: e.candidate });
        }
      };

      pc.onicecandidateerror = (e) => {
        console.warn('[Call] ICE candidate error:', e.errorCode, e.errorText);
      };

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch((error) => {
            console.warn('[Call] remote audio playback requires user interaction:', error);
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        if (pc.connectionState === 'connected') {
          setStatus('connected');
          if (!durationTimerRef.current) {
            durationTimerRef.current = setInterval(() => setCallDurationSeconds((s) => s + 1), 1000);
          }
        }
        if (['failed', 'closed'].includes(pc.connectionState)) {
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [socket, cleanup]
  );

  const startCall = useCallback(
    async (conversationId: string, toUserId: string) => {
      if (statusRef.current !== 'idle') return;
      try {
        const signalingSocket = socket;
        if (!signalingSocket) throw new Error('Call signaling is unavailable');
        await waitForSocket();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection(toUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setRemoteUserId(toUserId);
        setStatus('outgoing');
        signalingSocket.emit('call:invite', {
          conversationId,
          toUserId,
          offer: pc.localDescription ?? offer,
        });
      } catch (error) {
        console.error('[Call] failed to start call:', error);
        cleanup();
      }
    },
    [createPeerConnection, socket, cleanup, waitForSocket]
  );

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection(incomingCall.fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      await flushPendingCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const toUserId = incomingCall.fromUserId;
      setIncomingCall(null);
      socket?.emit('call:answer', { toUserId, answer });
      // status flips to 'connected' via onconnectionstatechange once ICE
      // negotiation completes; remoteUserId was already set on 'incoming'.
    } catch (error) {
      console.error('[Call] failed to answer call:', error);
      cleanup();
    }
  }, [incomingCall, createPeerConnection, flushPendingCandidates, socket, cleanup]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      socket?.emit('call:reject', { toUserId: incomingCall.fromUserId });
    }
    cleanup();
  }, [incomingCall, socket, cleanup]);

  const endCall = useCallback(() => {
    if (remoteUserId) {
      // Backend only has a call:end handler right now (no call:cancel), so
      // an unanswered outgoing call ending also just sends call:end. The
      // callee's UI will still clear correctly on the existing handler.
      socket?.emit('call:end', { toUserId: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, socket, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    if (!socket) return;

    function handleIncoming(data: IncomingCallInfo) {
      // No call:busy handler on the backend yet — an already-in-a-call user
      // just silently doesn't ring for the new incoming call. The caller
      // will sit on "Calling..." with no explanation; worth adding
      // call:busy on the gateway if that gap matters in practice.
      if (statusRef.current !== 'idle') return;
      setIncomingCall(data);
      setRemoteUserId(data.fromUserId);
      setStatus('incoming');
    }

    function handleAnswered(data: { fromUserId: string; answer: RTCSessionDescriptionInit }) {
      const pc = pcRef.current;
      if (!pc) return;
      pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        .then(() => flushPendingCandidates(pc))
        .catch((error) => {
          console.error('[Call] failed to apply remote answer:', error);
          cleanup();
        });
    }

    function handleIceCandidate(data: { candidate: RTCIceCandidateInit }) {
      const pc = pcRef.current;
      if (pc?.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((error) => {
          console.warn('[Call] failed to add ICE candidate:', error);
        });
      } else {
        pendingCandidatesRef.current.push(data.candidate);
      }
    }

    function handleRejected() {
      cleanup();
    }

    function handleEnded() {
      cleanup();
    }

    socket.on('call:incoming', handleIncoming);
    socket.on('call:answered', handleAnswered);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:answered', handleAnswered);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
    };
  }, [socket, cleanup, flushPendingCandidates]);

  // Full teardown if the provider itself unmounts mid-call.
  useEffect(() => {
    return () => {
      stopDurationTimer();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopDurationTimer]);

  return (
    <CallContext.Provider
      value={{
        status,
        remoteUserId,
        incomingCall,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        isMuted,
        toggleMute,
        callDurationSeconds,
      }}
    >
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline aria-hidden="true" />
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}