// lib/settings.ts

export type Theme = 'light' | 'dark';

const SETTINGS_KEY = 'app-settings';
const SETTINGS_CHANGE_EVENT = 'app-settings-change';

export interface AppSettings {
  theme: Theme;
  notificationsEnabled: boolean;
  defaultWallpaper: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  notificationsEnabled: true,
  defaultWallpaper: 'default',
};

let cachedRaw: string | null | undefined;
let cachedSettings: AppSettings = DEFAULT_SETTINGS;

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  let raw: string | null;
  try {
    raw = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }

  if (raw === cachedRaw) return cachedSettings;

  cachedRaw = raw;
  if (!raw) {
    cachedSettings = DEFAULT_SETTINGS;
    return cachedSettings;
  }

  try {
    cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    cachedSettings = DEFAULT_SETTINGS;
  }

  return cachedSettings;
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial };
  if (typeof window !== 'undefined') {
    const raw = JSON.stringify(next);
    localStorage.setItem(SETTINGS_KEY, raw);
    cachedRaw = raw;
    cachedSettings = next;
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
  }
  return next;
}

export function subscribeSettings(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', listener);
  window.addEventListener(SETTINGS_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(SETTINGS_CHANGE_EVENT, listener);
  };
}
