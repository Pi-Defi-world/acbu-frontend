/**
 * API client: base URL from env, authentication via httpOnly cookies.
 * All backend responses are JSON; errors throw with message/details.
 * 
 * 401 Handling: When API returns 401 (Unauthorized), a registered callback is invoked
 * to handle stale auth state (e.g., expired httpOnly cookie).
 * 
 * Timeout: Requests timeout after NEXT_PUBLIC_API_TIMEOUT ms (default 30000).
 * If caller provides AbortSignal, it aborts on either timeout or caller's signal.
 */

let authErrorHandler: ((error: ApiError) => void) | null = null;

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

const DEFAULT_TIMEOUT = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_TIMEOUT
  ? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10) || 30000
  : 30000;

/** Backend often returns `{ error: { message, statusCode } }` (AppError); avoid `[object Object]`. */
function messageFromErrorBody(
  data: { message?: string; error?: string | { message?: string } },
  httpStatus: number,
): string {
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  const e = data.error;
  if (typeof e === 'string' && e.trim()) {
    return e;
  }
  if (e && typeof e === 'object' && typeof (e as { message?: string }).message === 'string') {
    const m = (e as { message: string }).message;
    if (m.trim()) return m;
  }
  return `Request failed (HTTP ${httpStatus})`;
}

/** Safe message for any thrown API/network value. */
export function getApiErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong';
}

export interface RequestOptions {
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
  if (!path.startsWith('http') && !BASE.trim()) {
    throw new Error(
      "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL (or NEXT_PUBLIC_API_URL) " +
        "to your backend root, including the API prefix — e.g. https://acbu-backend.onrender.com/api/v1 " +
        "(no trailing slash). Without this, requests hit the Next.js app and return 405 for POST /auth/*.",
    );
  }
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // CSRF cookie logic removed: backend does not guarantee XSRF-TOKEN pairing

  const token = opts.token !== undefined ? opts.token : currentToken;
  if (token) {
    // Send only the Authorization header per backend contract.
    // The former x-api-key duplicate has been removed to eliminate the redundant
    // secret channel that could surface in proxy logs (F-007).
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Create our own AbortController for timeout, independent of caller's signal
  const controller = new AbortController();
  const signal = controller.signal;
  let timedOut = false;

  // If caller provides signal, abort our controller when caller's aborts
  if (opts.signal) {
    opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  // Set timeout
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, DEFAULT_TIMEOUT);

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
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      if (timedOut) {
        throw new Error(`Request timed out after ${DEFAULT_TIMEOUT / 1000} seconds`, { cause: error });
      }
      // If not timed out, it was aborted by caller's signal, rethrow
      throw error;
    }
    throw error;
  }
  clearTimeout(timeoutId);
  let data: { error?: string | { message?: string }; message?: string; details?: unknown };
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    data = (await res.json()) as {
      error?: string | { message?: string };
      message?: string;
      details?: unknown;
    };
  } else {
    data = { error: res.statusText || 'Request failed' };
  }
  if (!res.ok) {
    const err: ApiError = new Error(
      messageFromErrorBody(data, res.status),
    ) as ApiError;
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
