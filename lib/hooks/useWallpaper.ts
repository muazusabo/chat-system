// lib/hooks/useWallpaper.ts
import { useMutation } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export function useUploadWallpaper() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('wallpaper', file);

      const res = await fetch(`${API_URL}/users/me/wallpaper`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
        body: formData,
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message ?? 'Upload failed');
      }
      return body.data as { url: string };
    },
  });
}