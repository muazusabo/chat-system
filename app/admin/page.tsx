// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAuthStore } from '@/lib/auth-store';
import { useAdminStats, useAdminTrends } from '@/lib/hooks/useAdmin';
import { Spinner } from '@/components/ui/Spinner';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';
const inset = 'shadow-[inset_5px_5px_10px_var(--neu-shadow-dark),inset_-5px_-5px_10px_var(--neu-shadow-light)]';

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: trends, isLoading: trendsLoading } = useAdminTrends(range);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && user?.role !== 'ADMIN') {
      router.push('/chat');
    }
  }, [authStatus, user, router]);

  if (authStatus !== 'authenticated' || user?.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--neu-bg)]">
        <Spinner size={24} />
      </div>
    );
  }

  const cards = stats
    ? [
        {
          label: 'Total Users',
          value: stats.totalUsers,
          accent: 'text-[var(--neu-text-primary)]',
          sub: `${stats.verifiedUsers} verified`,
        },
        {
          label: 'Verified Rate',
          value: stats.totalUsers ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0,
          suffix: '%',
          accent: 'text-emerald-600',
          sub: `${stats.totalUsers - stats.verifiedUsers} pending`,
        },
        { label: 'Blocked Users', value: stats.blockedUsers, accent: 'text-amber-600', sub: 'restricted access' },
        { label: 'Deleted Users', value: stats.deletedUsers, accent: 'text-red-500', sub: 'soft-deleted' },
        { label: 'Conversations', value: stats.totalConversations, accent: 'text-[var(--neu-text-primary)]', sub: 'all time' },
        {
          label: 'Messages',
          value: stats.totalMessages,
          accent: 'text-[var(--neu-text-primary)]',
          sub: stats.totalConversations
            ? `${(stats.totalMessages / stats.totalConversations).toFixed(1)} avg/chat`
            : '0 avg/chat',
        },
      ]
    : [];

  const trendTotals = trends
    ? {
        users: trends.reduce((sum, t) => sum + t.newUsers, 0),
        conversations: trends.reduce((sum, t) => sum + t.newConversations, 0),
        messages: trends.reduce((sum, t) => sum + t.newMessages, 0),
      }
    : null;

  return (
    <div className="min-h-screen bg-[var(--neu-bg)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--neu-text-primary)]">Admin Dashboard</h1>
            <p className="text-xs text-[var(--neu-text-secondary)]">Platform overview & analytics</p>
          </div>
          <button
            onClick={() => router.push('/admin/users')}
            className={`ml-auto rounded-2xl bg-[var(--neu-bg)] px-4 py-2.5 text-xs font-bold tracking-wide text-red-500 transition-transform active:scale-95 ${raised}`}
          >
            MANAGE USERS
          </button>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size={24} />
          </div>
        ) : stats ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-2xl bg-[var(--neu-bg)] p-6 ${raised}`}>
                <p className={`text-3xl font-bold ${c.accent}`}>
                  {c.value.toLocaleString()}
                  {c.suffix ?? ''}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--neu-text-secondary)]">
                  {c.label}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--neu-text-tertiary)]">{c.sub}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Trends section */}
        <div className={`rounded-2xl bg-[var(--neu-bg)] p-6 ${raised}`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--neu-text-primary)]">Growth trends</h2>
              {trendTotals && (
                <p className="mt-0.5 text-xs text-[var(--neu-text-secondary)]">
                  Last {range} days: {trendTotals.users} new users · {trendTotals.conversations} new chats ·{' '}
                  {trendTotals.messages} messages
                </p>
              )}
            </div>
            <div className={`flex gap-1.5 rounded-xl bg-[var(--neu-bg)] p-1.5 ${inset}`}>
              {([7, 30, 90] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    range === r
                      ? `bg-[var(--neu-bg)] text-red-500 ${raised}`
                      : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
                  }`}
                >
                  {r}D
                </button>
              ))}
            </div>
          </div>

          {trendsLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size={22} />
            </div>
          ) : trends && trends.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--neu-card-alt)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fill: 'var(--neu-text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--neu-card-alt)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--neu-text-tertiary)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--neu-card-alt)' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    labelFormatter={(v) => formatShortDate(v as string)}
                    contentStyle={{
                      background: 'var(--neu-bg)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: '5px 5px 10px var(--neu-shadow-dark), -5px -5px 10px var(--neu-shadow-light)',
                      fontSize: 12,
                      color: 'var(--neu-text-primary)',
                    }}
                    labelStyle={{ color: 'var(--neu-text-secondary)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--neu-text-secondary)' }} />
                  <Line type="monotone" dataKey="newUsers" name="New Users" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="newConversations"
                    name="New Chats"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="newMessages"
                    name="Messages"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-[var(--neu-text-secondary)]">No activity in this period</p>
          )}
        </div>
      </div>
    </div>
  );
}