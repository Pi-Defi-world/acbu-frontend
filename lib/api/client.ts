/**
 * API client: base URL from env, Bearer token from opts.
 * All backend responses are JSON; errors throw with message/details.
 * 
 * 401 Handling: When API returns 401 (Unauthorized), a registered callback is invoked
 * to handle stale auth state (e.g., expired httpOnly cookie).
 */

let authErrorHandler: ((error: ApiError) => void) | null = null;
let currentToken: string | null = null;

/**
 * Set the global API key to be used for all requests.
 */
export function setToken(token: string | null): void {
  currentToken = token;
}

/**
 * Get the global API key.
 */
export function getToken(): string | null {
  return currentToken;
}

/**
 * Register a callback to be invoked when API returns 401 (Unauthorized).
 * Used by AuthContext to clear stale session state and redirect to login.
 */
export function onAuthError(callback: (error: ApiError) => void): void {
  authErrorHandler = callback;
}

const BASE = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL)
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL)!.replace(/\/$/, '')
  : '';

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(^|;\s*)XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[2]) : undefined;
}

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
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }
  
  const token = opts.token !== undefined ? opts.token : currentToken;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-api-key'] = token; // Also send as x-api-key for compatibility
  }

  let signal = opts.signal;
  if (!signal) {
    const controller = new AbortController();
    signal = controller.signal;
    setTimeout(() => controller.abort(), 30000); // 30 second timeout
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include', // Include httpOnly cookies in all requests
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError' && !opts.signal) {
      throw new Error('Request timed out after 30 seconds');
    }
    throw error;
  }
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
    
    // Invoke 401 handler if registered (e.g., clear auth state and redirect to login)
    if (res.status === 401 && authErrorHandler) {
      authErrorHandler(err);
    }
    
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

export function put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, body, opts);
}

export function del<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, opts);
}

export function apiOpts(token: string | null | undefined): RequestOptions {
  return { token: token || undefined };
}
