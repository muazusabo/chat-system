// app/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/ui/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { RegisterResponse } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await api.post<RegisterResponse>('/auth/register', form);
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Sign Up" subtitle="Create your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Input
          id="name"
          label="Full name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />

        {formError && (
          <p className="rounded-[15px] bg-red-50 px-3 py-2 text-center text-xs text-red-600">{formError}</p>
        )}

        <Button type="submit" loading={loading} className="mt-1">
          CREATE ACCOUNT
        </Button>

        <p className="mt-2 text-center text-xs text-neutral-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-red-500 hover:text-red-600">
            Login
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}