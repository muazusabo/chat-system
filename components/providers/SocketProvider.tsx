// components/providers/SocketProvider.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createSocket, disconnectSocket } from '@/lib/socket';
import { getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const SocketContext = createContext<Socket | null>(null);

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const [socket, setSocket] = useState<Socket | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !connectedRef.current) {
      const token = getAccessToken();
      if (token) {
        const s = createSocket(token);
        setSocket(s);
        connectedRef.current = true;
      }
    }

    if (status === 'unauthenticated' && connectedRef.current) {
      disconnectSocket();
      setSocket(null);
      connectedRef.current = false;
    }
  }, [status]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}