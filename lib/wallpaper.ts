// lib/wallpaper.ts

export interface WallpaperPreset {
  id: string;
  label: string;
  swatch: string; // small preview color/gradient for the picker UI
  style: React.CSSProperties;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'default',
    label: 'Default',
    swatch: '#0a0a0a',
    style: {
      backgroundColor: '#0a0a0a',
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.035) 1px, transparent 0)`,
      backgroundSize: '28px 28px',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    swatch: '#0d1f17',
    style: {
      backgroundColor: '#0d1f17',
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)`,
      backgroundSize: '28px 28px',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    swatch: '#0b0f1f',
    style: {
      backgroundColor: '#0b0f1f',
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)`,
      backgroundSize: '28px 28px',
    },
  },
  {
    id: 'wine',
    label: 'Wine',
    swatch: '#1f0d14',
    style: {
      backgroundColor: '#1f0d14',
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)`,
      backgroundSize: '28px 28px',
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    swatch: '#15181d',
    style: {
      backgroundColor: '#15181d',
      backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.045) 1px, transparent 0)`,
      backgroundSize: '28px 28px',
    },
  },
];

interface WallpaperSetting {
  type: 'preset' | 'custom';
  value: string; // preset id, or image URL
}

const STORAGE_KEY_PREFIX = 'wallpaper:';

export function getConversationWallpaper(conversationId: string): WallpaperSetting {
  if (typeof window === 'undefined') return { type: 'preset', value: 'default' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + conversationId);
    if (!raw) return { type: 'preset', value: 'default' };
    return JSON.parse(raw) as WallpaperSetting;
  } catch {
    return { type: 'preset', value: 'default' };
  }
}

export function setConversationWallpaper(conversationId: string, setting: WallpaperSetting): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PREFIX + conversationId, JSON.stringify(setting));
}

export function resolveWallpaperStyle(
  setting: WallpaperSetting,
  resolveUrl: (path: string) => string | null
): React.CSSProperties {
  if (setting.type === 'custom') {
    const url = resolveUrl(setting.value);
    return {
      backgroundColor: '#0a0a0a',
      backgroundImage: url ? `url(${url})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  const preset = WALLPAPER_PRESETS.find((p) => p.id === setting.value) ?? WALLPAPER_PRESETS[0];
  return preset.style;
}