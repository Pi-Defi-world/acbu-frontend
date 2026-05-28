import { useMemo } from 'react';
import type { RequestOptions } from '@/lib/api/client';
<<<<<<< HEAD
export { useApiError } from '@/hooks/use-api-error';
=======
import { getApiErrorMessage } from '@/lib/api/client';
>>>>>>> origin/dev

/**
 * Returns RequestOptions for use with API modules.
 * NOTE: API key is now transmitted via httpOnly cookie (set by backend on login).
 * Browser automatically includes it in all requests with credentials: 'include'.
 * This hook is maintained for backward compatibility but returns empty options.
 */
export function useApiOpts(): RequestOptions {
  return useMemo(() => ({}), []);
}
<<<<<<< HEAD
=======

/**
 * Provides consistent error state management for API calls.
 * Maps HTTP status codes 429, 503, and 402 to user-friendly, actionable messages.
 *
 * Usage:
 *   const { error, setError, clearError, handleError } = useApiError();
 *   // In a catch block:
 *   handleError(e);
 *   // To clear before a new operation:
 *   clearError();
 */
export function useApiError() {
  const [error, setErrorState] = useState('');

  const clearError = useCallback(() => setErrorState(''), []);

  const handleError = useCallback((e: unknown) => {
    setErrorState(getApiErrorMessage(e));
  }, []);

  const setError = useCallback((msg: string) => setErrorState(msg), []);

  return { error, setError, clearError, handleError };
}
>>>>>>> origin/dev
