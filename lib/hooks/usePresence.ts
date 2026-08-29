// lib/hooks/usePresence.ts
import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import type { UserStatus } from '@/lib/types';

interface PresenceUpdate {
  userId: string;
  status: UserStatus;
  lastSeen: string;
}

export function usePresence() {
  const socket = useSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceUpdate>>({});

  useEffect(() => {
    if (!socket) return;

    function handlePresenceUpdate(update: PresenceUpdate) {
      setPresenceMap((prev) => ({ ...prev, [update.userId]: update }));
    }

    socket.on('presenceUpdate', handlePresenceUpdate);
    return () => {
      socket.off('presenceUpdate', handlePresenceUpdate);
    };
  }, [socket]);

  return presenceMap;
}