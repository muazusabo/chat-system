// app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, ApiRequestError, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { LoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!form.email.trim()) next.email = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', form);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
      router.push('/chat');
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setFormError(err instanceof ApiRequestError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Login" subtitle="Welcome back" shake={shake}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          id="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-neutral-500 hover:text-neutral-700">
            Forgot password?
          </Link>
        </div>

        {formError && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-[15px] bg-red-50 px-3 py-2 text-center text-xs text-red-600"
          >
            {formError}
          </motion.p>
        )}

        <Button type="submit" loading={loading} className="mt-1">
          LOGIN
        </Button>

        <p className="mt-2 text-center text-xs text-neutral-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-red-500 hover:text-red-600">
            Sign up
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}