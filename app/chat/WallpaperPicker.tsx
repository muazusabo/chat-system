// app/chat/WallpaperPicker.tsx
'use client';

import { useRef, useState } from 'react';
import { WALLPAPER_PRESETS, getConversationWallpaper, setConversationWallpaper } from '@/lib/wallpaper';
import { useUploadWallpaper } from '@/lib/hooks/useWallpaper';
import { resolveAvatarUrl } from '@/lib/avatar';
import { Spinner } from '@/components/ui/Spinner';

export function WallpaperPicker({
  conversationId,
  onClose,
  onChange,
}: {
  conversationId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const current = getConversationWallpaper(conversationId);
  const [selected, setSelected] = useState(current);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadWallpaper = useUploadWallpaper();

  function applyPreset(id: string) {
    const next = { type: 'preset' as const, value: id };
    setSelected(next);
    setConversationWallpaper(conversationId, next);
    onChange();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    uploadWallpaper.mutate(file, {
      onSuccess: (data) => {
        const next = { type: 'custom' as const, value: data.url };
        setSelected(next);
        setConversationWallpaper(conversationId, next);
        onChange();
      },
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl border border-neutral-800 bg-neutral-900 p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Chat wallpaper</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {WALLPAPER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`flex flex-col items-center gap-1.5 ${
                selected.type === 'preset' && selected.value === preset.id ? '' : ''
              }`}
            >
              <div
                className={`h-14 w-14 rounded-xl border-2 ${
                  selected.type === 'preset' && selected.value === preset.id
                    ? 'border-emerald-500'
                    : 'border-neutral-700'
                }`}
                style={{ backgroundColor: preset.swatch }}
              />
              <span className="text-[11px] text-neutral-400">{preset.label}</span>
            </button>
          ))}

          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 ${
                selected.type === 'custom' ? 'border-emerald-500' : 'border-dashed border-neutral-700'
              } text-neutral-400`}
            >
              {uploadWallpaper.isPending ? (
                <Spinner size={16} />
              ) : selected.type === 'custom' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveAvatarUrl(selected.value) ?? ''}
                  alt="Custom wallpaper"
                  className="h-full w-full rounded-[10px] object-cover"
                />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <span className="text-[11px] text-neutral-400">Custom</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadWallpaper.isError && (
          <p className="mt-3 text-xs text-red-400">Upload failed — try a different image.</p>
        )}
      </div>
    </div>
  );
}