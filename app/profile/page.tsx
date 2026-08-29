// app/profile/page.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useUpdateProfile, useUploadAvatar } from '@/lib/hooks/useProfile';
import { useLogout } from '@/lib/hooks/useAuth';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Spinner } from '@/components/ui/Spinner';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';
const inset = 'shadow-[inset_5px_5px_10px_var(--neu-shadow-dark),inset_-5px_-5px_10px_var(--neu-shadow-light)]';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const logout = useLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const currentImage = preview ?? resolveAvatarUrl(user?.profileImage);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WEBP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);

    uploadAvatar.mutate(file, {
      onError: (err) => {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        setPreview(null);
      },
      onSuccess: () => {
        setPreview(null);
      },
    });
  }

  function handleSaveName() {
    setSaveMessage(null);
    if (!name.trim() || name === user?.name) return;
    updateProfile.mutate(
      { name: name.trim() },
      {
        onSuccess: () => setSaveMessage('Saved'),
        onError: () => setSaveMessage('Failed to save'),
      }
    );
  }

  return (
    <div className="min-h-screen bg-[var(--neu-bg)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="mx-auto max-w-lg px-5 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] transition-transform active:scale-95 ${raised}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-[var(--neu-text-primary)]">Profile</h1>
        </div>

        {/* Avatar */}
        <div className={`mb-6 flex flex-col items-center gap-4 rounded-3xl bg-[var(--neu-bg)] p-8 ${raised}`}>
          <div className="relative">
            <div
              className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[var(--neu-bg)] text-3xl font-bold text-[var(--neu-text-secondary)]"
              style={{ boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)' }}
            >
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentImage} alt={user?.name ?? ''} className="h-full w-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>

            {uploadAvatar.isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                <Spinner size={24} />
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className={`absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--neu-bg)] text-red-500 transition-transform hover:scale-105 disabled:opacity-50 ${raised}`}
              title="Change photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        </div>

        {/* Name */}
        <div className={`mb-6 flex flex-col gap-3 rounded-3xl bg-[var(--neu-bg)] p-6 ${raised}`}>
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--neu-text-secondary)]">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-2xl bg-[var(--neu-bg)] px-4 py-3 text-sm text-[var(--neu-text-primary)] outline-none ${inset}`}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={!name.trim() || name === user?.name || updateProfile.isPending}
              className={`flex items-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-5 py-2.5 text-xs font-bold tracking-wide text-red-500 transition-transform active:scale-95 disabled:opacity-40 ${raised}`}
            >
              {updateProfile.isPending && <Spinner size={14} />}
              SAVE
            </button>
            {saveMessage && (
              <span className={`text-xs font-medium ${saveMessage === 'Saved' ? 'text-emerald-600' : 'text-red-500'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        {/* Read-only info */}
        <div className={`mb-6 flex flex-col gap-5 rounded-3xl bg-[var(--neu-bg)] p-6 ${raised}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--neu-text-secondary)]">Email</p>
            <p className="mt-1 text-sm text-[var(--neu-text-primary)]">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--neu-text-secondary)]">Member since</p>
            <p className="mt-1 text-sm text-[var(--neu-text-primary)]">
              {user?.createdAt && new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--neu-bg)] px-4 py-3.5 text-sm font-bold text-red-500 transition-transform active:scale-95 ${raised}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Log out
        </button>
      </div>
    </div>
  );
}