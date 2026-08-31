// app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  useAdminUsers,
  useSoftDeleteUser,
  useRestoreUser,
  useBlockUser,
  useUnblockUser,
  type AdminUserFilters,
} from '@/lib/hooks/useAdmin';
import { Spinner } from '@/components/ui/Spinner';

type StatusFilter = 'all' | 'active' | 'blocked' | 'deleted';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';
const inset = 'shadow-[inset_5px_5px_10px_var(--neu-shadow-dark),inset_-5px_-5px_10px_var(--neu-shadow-light)]';

export default function AdminUsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated' && user?.role !== 'ADMIN') {
      router.push('/chat');
    }
  }, [authStatus, user, router]);

  const filters: AdminUserFilters = {
    q: search.trim() || undefined,
    page,
    limit: 20,
    ...(statusFilter === 'blocked' ? { isBlocked: true } : {}),
    ...(statusFilter === 'deleted' ? { isDeleted: true } : {}),
    ...(statusFilter === 'active' ? { isBlocked: false, isDeleted: false } : {}),
  };

  const { data, isLoading } = useAdminUsers(filters);
  const softDelete = useSoftDeleteUser();
  const restore = useRestoreUser();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  if (authStatus !== 'authenticated' || user?.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--neu-bg)]">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--neu-bg)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="mx-auto max-w-6xl px-5 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-[var(--neu-text-primary)]">Manage Users</h1>
        </div>

        {/* Search + filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className={`flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl bg-[var(--neu-bg)] px-4 py-3 ${inset}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--neu-text-secondary)]">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email"
              className="w-full bg-transparent text-sm text-[var(--neu-text-primary)] outline-none placeholder:text-[var(--neu-text-tertiary)]"
            />
          </div>
          <div className={`flex gap-1.5 rounded-2xl bg-[var(--neu-bg)] p-1.5 ${inset}`}>
            {(['all', 'active', 'blocked', 'deleted'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setStatusFilter(f);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition-all ${
                  statusFilter === f
                    ? `bg-[var(--neu-bg)] text-red-500 ${raised}`
                    : 'text-[var(--neu-text-secondary)] hover:text-[var(--neu-text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* User cards */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size={24} />
          </div>
        ) : data && data.users.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.users.map((u) => {
              const hasActions = u.role !== 'ADMIN';
              return (
                <div key={u.id} className={`rounded-2xl bg-[var(--neu-bg)] p-5 ${raised}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-[var(--neu-text-primary)]">{u.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-violet-100 text-violet-600' : 'bg-[var(--neu-card-alt)] text-[var(--neu-text-secondary)]'
                      }`}
                    >
                      {u.role}
                    </span>
                    {!u.isVerified && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Unverified
                      </span>
                    )}
                    {u.isDeleted ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        Deleted
                      </span>
                    ) : u.isBlocked ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Blocked
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="mt-1 break-all text-sm text-[var(--neu-text-secondary)]">{u.email}</p>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--neu-text-tertiary)]">
                    <span>
                      <span className="font-semibold text-[var(--neu-text-secondary)]">Status:</span> {u.status}
                    </span>
                    <span>
                      <span className="font-semibold text-[var(--neu-text-secondary)]">Joined:</span>{' '}
                      {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>
                      <span className="font-semibold text-[var(--neu-text-secondary)]">Last seen:</span>{' '}
                      {u.lastSeen
                        ? new Date(u.lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never'}
                    </span>
                    <span className="break-all">
                      <span className="font-semibold text-[var(--neu-text-secondary)]">ID:</span> {u.id}
                    </span>
                  </div>

                  {hasActions && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--neu-border)] pt-4">
                      {!u.isDeleted && (
                        <>
                          {u.isBlocked ? (
                            <button
                              onClick={() => unblock.mutate(u.id)}
                              className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-emerald-600 transition-transform active:scale-95 ${raised}`}
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => block.mutate(u.id)}
                              className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-amber-600 transition-transform active:scale-95 ${raised}`}
                            >
                              Block
                            </button>
                          )}
                        </>
                      )}
                      {u.isDeleted ? (
                        <button
                          onClick={() => restore.mutate(u.id)}
                          className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-emerald-600 transition-transform active:scale-95 ${raised}`}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${u.name}? This can be restored later.`)) {
                              softDelete.mutate(u.id);
                            }
                          }}
                          className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-red-500 transition-transform active:scale-95 ${raised}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-6 py-16 text-center ${raised}`}>
            <p className="text-sm text-[var(--neu-text-secondary)]">No users found</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--neu-text-secondary)]">
              Page {data.page} of {data.totalPages} — {data.total} users total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-[var(--neu-text-secondary)] transition-transform active:scale-95 disabled:opacity-30 ${raised}`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className={`rounded-xl bg-[var(--neu-bg)] px-4 py-2 text-xs font-bold text-[var(--neu-text-secondary)] transition-transform active:scale-95 disabled:opacity-30 ${raised}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}