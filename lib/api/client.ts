/**
 * API client: base URL from env, Bearer token from opts.
 * All backend responses are JSON; errors throw with message/details.
 */

const BASE = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')
  : '';


export interface RequestOptions {
  token?: string | null;
  signal?: AbortSignal;
}

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // CSRF cookie logic removed: backend does not guarantee XSRF-TOKEN pairing
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts.signal,
  });
  let data: { error?: string; message?: string; details?: unknown };
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    data = (await res.json()) as { error?: string; message?: string; details?: unknown };
  } else {
    data = { error: res.statusText || 'Request failed' };
  }
  if (!res.ok) {
    const err: ApiError = new Error(data.message || data.error || `HTTP ${res.status}`) as ApiError;
    err.status = res.status;
    err.details = data.details ?? data;
    throw err;
  }
  return data as T;
}

export function get<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, opts);
}

export function post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('POST', path, body, opts);
}

export function patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('PATCH', path, body, opts);
}

export function del<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, opts);
}

export function apiOpts(token: string | null | undefined): RequestOptions {
  return { token: token || undefined };
}
