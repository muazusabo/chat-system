// lib/hooks/useSettings.ts
'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  subscribeSettings,
  updateSettings,
  type AppSettings,
} from '@/lib/settings';

export function useSettings() {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS);

  const update = useCallback((partial: Partial<AppSettings>) => {
    updateSettings(partial);
  }, []);

  return { settings, update };
}
