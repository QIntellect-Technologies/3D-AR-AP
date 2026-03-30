import { getAccessToken } from './auth';

const BASE = 'http://localhost:4000/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(
  path: string,
  opts: { method?: Method; body?: any; headers?: Record<string, string> } = {}
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

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}
