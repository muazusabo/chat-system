// app/forgot-password/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      // Backend returns a generic message either way (doesn't reveal if email exists),
      // but still handle network/unexpected errors.
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={sent ? undefined : 'Enter your email and we\'ll send you a reset code'}
    >
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16v12H4V6zm0 0l8 7 8-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              If an account exists for <span className="font-medium text-neutral-700 dark:text-neutral-300">{email}</span>, a reset code is on its way.
            </p>
            <Button
              variant="ghost"
              onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="mt-1"
            >
              Enter reset code
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error ?? undefined}
              autoComplete="email"
            />
            <Button type="submit" loading={loading}>
              Send reset code
            </Button>
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              Remembered it?{' '}
              <Link href="/login" className="font-medium text-indigo-500 hover:text-indigo-600">
                Back to login
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}