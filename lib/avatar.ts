// lib/avatar.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

export function resolveAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}