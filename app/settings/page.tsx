// app/settings/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/hooks/useSettings';
import { useTheme } from '@/lib/hooks/useTheme';
import { WALLPAPER_PRESETS } from '@/lib/wallpaper';

const raised = 'shadow-[5px_5px_10px_var(--neu-shadow-dark),-5px_-5px_10px_var(--neu-shadow-light)]';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, update } = useSettings();
  const { theme, setTheme } = useTheme();

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
          <h1 className="text-2xl font-bold text-[var(--neu-text-primary)]">Settings</h1>
        </div>

        {/* Theme */}
        <div className={`mb-5 rounded-2xl bg-[var(--neu-bg)] p-5 ${raised}`}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--neu-text-secondary)]">Appearance</p>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                  theme === t
                    ? 'bg-[var(--neu-bg)] text-red-500 shadow-[inset_3px_3px_6px_var(--neu-shadow-dark),inset_-3px_-3px_6px_var(--neu-shadow-light)]'
                    : 'bg-[var(--neu-bg)] text-[var(--neu-text-secondary)] shadow-[3px_3px_6px_var(--neu-shadow-dark),-3px_-3px_6px_var(--neu-shadow-light)]'
                }`}
              >
                {t === 'light' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                )}
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--neu-text-tertiary)]">
            Applies instantly across the app.
          </p>
        </div>

        {/* Notifications */}
        <div className={`mb-5 rounded-2xl bg-[var(--neu-bg)] p-5 ${raised}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--neu-text-primary)]">Notifications</p>
              <p className="mt-0.5 text-xs text-[var(--neu-text-secondary)]">
                Show badges and live updates for new activity
              </p>
            </div>
            <button
              onClick={() => update({ notificationsEnabled: !settings.notificationsEnabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-[var(--neu-card-alt)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Default wallpaper */}
        <div className={`mb-5 rounded-2xl bg-[var(--neu-bg)] p-5 ${raised}`}>
          <p className="mb-1 text-sm font-semibold text-[var(--neu-text-primary)]">Default chat wallpaper</p>
          <p className="mb-3 text-xs text-[var(--neu-text-secondary)]">
            Used for any chat that doesn&apos;t have its own wallpaper set
          </p>
          <div className="grid grid-cols-5 gap-3">
            {WALLPAPER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => update({ defaultWallpaper: preset.id })}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`h-12 w-12 rounded-xl border-2 ${
                    settings.defaultWallpaper === preset.id ? 'border-red-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.swatch }}
                />
                <span className="text-[10px] text-[var(--neu-text-secondary)]">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--neu-text-tertiary)]">
          Settings are saved on this device. Chats with their own wallpaper (set from inside the chat) keep that
          instead of this default.
        </p>
      </div>
    </div>
  );
}
