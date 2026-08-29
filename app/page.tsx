// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { FullPageSpinner } from '@/components/ui/Spinner';

export default function RootPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/chat');
    } else if (status === 'unauthenticated') {
      router.replace('/login');
    }
    // status === 'loading' → wait, AuthProvider is still restoring the session
  }, [status, router]);

  return <FullPageSpinner />;
}