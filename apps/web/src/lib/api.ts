import { ApiError } from '@learnstack/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures session cookie is sent and received
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  let data: unknown = null;
  if (isJson) {
    try {
      const text = await response.text();
      data = text && text.trim() ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorData = data as ApiError | null;
    const message =
      errorData?.error?.message || response.statusText || 'Request failed';
    const code = errorData?.error?.code || 'UNKNOWN_ERROR';

    // Stale session (e.g. the user's org changed server-side): the cookie is
    // already cleared by the API, so force a clean re-login with a message
    // instead of leaving the user on a broken page.
    if (code === 'SESSION_ORG_MISMATCH' && typeof window !== 'undefined') {
      const path = window.location.pathname;
      const loginPath = path.startsWith('/admin') ? '/admin/login' : '/login';
      if (path !== loginPath) {
        try {
          sessionStorage.setItem(
            'session_expired_message',
            'Your session expired, please log in again'
          );
        } catch {
          // storage unavailable; still redirect
        }
        window.location.href = loginPath;
      }
    }

    throw new ApiRequestError(message, code, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
