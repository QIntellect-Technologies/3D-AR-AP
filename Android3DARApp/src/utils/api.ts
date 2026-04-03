import { getAccessToken, refreshSession } from './auth';

const BASE = 'http://192.168.204.139:4000/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(
  path: string,
  opts: { method?: Method; body?: any; headers?: Record<string, string> } = {},
  retry = true // 👈 Add retry flag
): Promise<T> {
  const token = await getAccessToken();
  console.log('🔑 Token being sent:', token);
  console.log('apiFetch token exists?', !!token);
  console.log('apiFetch base URL =', BASE);

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  // If unauthorized (401) and we haven't retried yet
  if (res.status === 401 && retry) {
    console.log('🔄 Token expired, refreshing...');

    // Refresh the session
    const refreshed = await refreshSession();

    if (refreshed) {
      console.log('✅ Token refreshed, retrying request...');
      // Retry the request with retry=false to avoid infinite loop
      return api<T>(path, opts, false);
    } else {
      console.log('❌ Failed to refresh token');
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}
