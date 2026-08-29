// app/verify-email/page.tsx
'use client';

import { useState, useRef, KeyboardEvent, ClipboardEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/ui/AuthCard';
import { Spinner } from '@/components/ui/Spinner';

const OTP_LENGTH = 6;

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function updateDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return; // only single digit
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(null);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (next.every((d) => d) && next.join('').length === OTP_LENGTH) {
      submit(next.join(''));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const lastIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[lastIndex]?.focus();
    if (pasted.length === OTP_LENGTH) submit(pasted);
  }

  async function submit(otp: string) {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-email', { email, otp });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1400);
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      setError(err instanceof ApiRequestError ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    try {
      await api.post('/auth/resend-verification-otp', { email });
      setResendMsg('Code sent — check your inbox');
    } catch {
      setResendMsg('Could not resend. Try again shortly.');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard title="Verify email" subtitle={`Enter the code sent to ${email || 'your email'}`} shake={shake}>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-2"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e6e6e6] text-emerald-600"
              style={{ boxShadow: '5px 5px 10px #c8c8c8, -5px -5px 10px #ffffff' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <p className="text-center text-sm font-medium text-neutral-600">Email verified! Redirecting...</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <div className="mb-2 flex justify-center gap-2">
              {digits.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el;
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileFocus={{ scale: 1.06 }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => updateDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className={`h-11 w-9 rounded-[12px] border-none bg-[#e6e6e6] text-center text-base font-semibold outline-none disabled:opacity-60 ${
                    error ? 'text-red-500' : 'text-neutral-700'
                  }`}
                  style={{ boxShadow: 'inset 4px 4px 8px #c8c8c8, inset -4px -4px 8px #ffffff' }}
                />
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-1 mt-2 text-center text-xs text-red-500"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {loading && (
              <div className="mt-3 flex justify-center">
                <Spinner size={22} className="text-neutral-500" />
              </div>
            )}

            <div className="mt-4 text-center text-xs text-neutral-500">
              Didn&apos;t get it?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
            {resendMsg && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-[11px] text-neutral-400">
                {resendMsg}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}