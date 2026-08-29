// app/reset-password/page.tsx
'use client';

import { useState, Suspense, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [stage, setStage] = useState<'otp' | 'password' | 'done'>('otp');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otp.trim()) {
      setError('Enter the code from your email');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ resetToken: string }>('/auth/verify-reset-otp', { email, otp });
      setResetToken(data.resetToken);
      setStage('password');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword: password });
      setStage('done');
      setTimeout(() => router.push('/login'), 1600);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={stage === 'otp' ? 'Reset code' : stage === 'password' ? 'New password' : 'All set!'}
      subtitle={
        stage === 'otp'
          ? `Enter the code sent to ${email || 'your email'}`
          : stage === 'password'
          ? 'Choose a new password'
          : undefined
      }
    >
      <AnimatePresence mode="wait">
        {stage === 'otp' && (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleVerifyOtp}
            className="flex flex-col gap-3.5"
          >
            <Input
              id="otp"
              label="Reset code"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={error ?? undefined}
              placeholder="123456"
            />
            <Button type="submit" loading={loading} className="mt-1">
              VERIFY CODE
            </Button>
          </motion.form>
        )}

        {stage === 'password' && (
          <motion.form
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleResetPassword}
            className="flex flex-col gap-3.5"
          >
            <Input
              id="password"
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              id="confirmPassword"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={error ?? undefined}
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} className="mt-1">
              RESET PASSWORD
            </Button>
          </motion.form>
        )}

        {stage === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-2 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6e6e6] text-emerald-600"
              style={{ boxShadow: '5px 5px 10px #c8c8c8, -5px -5px 10px #ffffff' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <p className="text-sm font-medium text-neutral-600">Password reset! Redirecting to login...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}