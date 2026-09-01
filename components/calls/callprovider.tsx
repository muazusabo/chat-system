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
  startCall: (conversationId: string, toUserId: string) => void;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  callDurationSeconds: number;
}

const CallContext = createContext<CallContextValue | null>(null);

// STUN only — no TURN server configured. Calls between two peers who are
// both on straightforward home/office NATs will connect fine. Calls where
// either side is behind a symmetric NAT (common on cellular networks, some
// corporate/campus WiFi) will fail to establish audio. Fixing that requires
// a TURN server (e.g. Twilio's Network Traversal Service, or self-hosted
// coturn) added to this array — that's infrastructure you'd need to stand
// up and pay for/host, not something addable from just the app code.
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function CallProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocket();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const statusRef = useRef<CallStatus>('idle');
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    durationTimerRef.current = null;
    setCallDurationSeconds(0);
    setStatus('idle');
    setRemoteUserId(null);
    setIncomingCall(null);
    setIsMuted(false);
  }, []);

  const createPeerConnection = useCallback(
    (toUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket?.emit('call:ice-candidate', { toUserId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected');
          if (!durationTimerRef.current) {
            durationTimerRef.current = setInterval(() => setCallDurationSeconds((s) => s + 1), 1000);
          }
        }
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection(toUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setRemoteUserId(toUserId);
        setStatus('outgoing');
        socket?.emit('call:invite', { conversationId, toUserId, offer });
      } catch {
        cleanup();
      }
    },
    [createPeerConnection, socket, cleanup]
  );

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = createPeerConnection(incomingCall.fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const toUserId = incomingCall.fromUserId;
      setRemoteUserId(toUserId);
      setIncomingCall(null);
      socket?.emit('call:answer', { toUserId, answer });
    } catch {
      cleanup();
    }
  }, [incomingCall, createPeerConnection, socket, cleanup]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      socket?.emit('call:reject', { toUserId: incomingCall.fromUserId });
    }
    cleanup();
  }, [incomingCall, socket, cleanup]);

  const endCall = useCallback(() => {
    if (remoteUserId) {
      socket?.emit('call:end', { toUserId: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, socket, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  }, []);

  useEffect(() => {
    if (!socket) return;

    function handleIncoming(data: IncomingCallInfo) {
      // No "busy" signal sent back yet — an already-in-a-call user just
      // silently doesn't see the new incoming call ring. Worth adding a
      // call:busy event if this becomes a real gap in practice.
      if (statusRef.current !== 'idle') return;
      setIncomingCall(data);
      setStatus('incoming');
    }

    function handleAnswered(data: { fromUserId: string; answer: RTCSessionDescriptionInit }) {
      pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer)).then(async () => {
        for (const candidate of pendingCandidatesRef.current) {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
      });
    }

    function handleIceCandidate(data: { candidate: RTCIceCandidateInit }) {
      if (pcRef.current?.remoteDescription) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
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
  }, [socket, cleanup]);

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
      <audio ref={remoteAudioRef} autoPlay />
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}