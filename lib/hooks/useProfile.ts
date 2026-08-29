// lib/hooks/useProfile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { SafeUser } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: { name?: string; profileImage?: string }) =>
      api.patch<SafeUser>('/users/me', payload),
    onSuccess: (user) => setUser(user),
  });
}

export function useUploadAvatar() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_URL}/users/me/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          // Do NOT set Content-Type here — the browser sets the correct
          // multipart/form-data boundary automatically when the body is
          // a FormData instance. Setting it manually breaks the upload.
        },
        credentials: 'include',
        body: formData,
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message ?? 'Upload failed');
      }
      return body.data as SafeUser;
    },
    onSuccess: (user) => setUser(user),
  });
}