/**
 * API client: base URL from env, authentication via httpOnly cookies.
 * All backend responses are JSON; errors throw with message/details.
 * * 401 Handling: When API returns 401 (Unauthorized), a registered callback is invoked
 * to handle stale auth state (e.g., expired httpOnly cookie).
 * * Timeout: Requests timeout after NEXT_PUBLIC_API_TIMEOUT ms (default 30000).
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

// Helper utility to introduce delays between retry attempts
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

/**
 * Maps HTTP status codes to user-friendly, actionable messages.
 * Handles 429 (Rate Limit), 503 (Service Unavailable), and 402 (Payment Required)
 * with specific guidance. Falls back to the raw error message for all other codes.
 */
export function mapApiError(e: unknown): string {
  const status = (e as ApiError)?.status;
  switch (status) {
    case 429:
      return 'Too many requests — please wait a moment and try again.';
    case 503:
      return 'Service temporarily unavailable. Please try again in a few minutes.';
    case 402:
      return 'Payment required — your account may need funding or a plan upgrade before proceeding.';
    default:
      return getApiErrorMessage(e);
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** @deprecated Auth is via httpOnly cookies; this field is unused. */
  token?: string;
  /** Number of retry attempts on 5xx errors or network drops. Defaults to 3. */
  retries?: number;
  /** Base delay time in milliseconds for exponential backoff retry logic. */
  retryDelay?: number;
  /** Fetch Priority API hint. Pass 'high' for above-the-fold critical requests. */
  priority?: RequestPriority;
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
  const { retries = 3, retryDelay = 1000 } = opts;

  if (!path.startsWith('http') && !BASE.trim()) {
    throw new Error(
      "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL (or NEXT_PUBLIC_API_URL) " +
        "to your backend root, including the API prefix — e.g. https://acbu-backend.onrender.com/api/v1 " +
        "(no trailing slash). Without this, requests hit the Next.js app and return 405 for POST /auth/*.",
    );
  }
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { 'Accept-Encoding': 'gzip' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
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

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    clearTimeout(timeoutId);
    throw new Error(
      'You appear to be offline. Please check your internet connection and try again.',
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include',
      ...(opts.priority !== undefined && { priority: opts.priority }),
    });
  } catch (error) {
    clearTimeout(timeoutId);

    // Differentiate aborts from connection breaks
    if (error instanceof Error && error.name === 'AbortError') {
      if (timedOut) {
        if (retries > 0) {
          console.warn(`[API Client] Timeout on ${method} ${path}. Retrying in ${retryDelay}ms... (${retries} left)`);