// lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL as string;

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors: string[];
}

export class ApiRequestError extends Error {
  statusCode: number;
  errors: string[];

  constructor(body: ApiError) {
    super(body.message);
    this.statusCode = body.statusCode;
    this.errors = body.errors ?? [];
  }
}

// Swappable in-memory token store, wired up by AuthProvider.
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

// Set by AuthProvider so we can trigger a logout/redirect if refresh fails.
let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(cb: () => void) {
  onAuthFailure = cb;
}

interface RequestOptions extends RequestInit {
  skipAuthRetry?: boolean; // prevents infinite loop when calling /auth/refresh itself
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRetry, headers, ...rest } = options;

  const doFetch = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      credentials: 'include', // needed for /auth/* cookie handling
    });

  let res = await doFetch();

  // Auto-retry once on 401 by refreshing the access token
  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      onAuthFailure?.();
    }
  }

  const body = await res.json().catch(() => null);

    if (!res.ok || !body?.success) {
console.log('API ERROR BODY:', JSON.stringify(body, null, 2));    throw new ApiRequestError(
      body ?? { success: false, statusCode: res.status, message: 'Request failed', errors: [] }
    );
  }

  return (body as ApiSuccess<T>).data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      skipAuthRetry: true,
    });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};