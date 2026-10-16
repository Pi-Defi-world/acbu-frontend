import { useMemo } from 'react';
import type { RequestOptions } from '@/lib/api/client';
export { useApiError } from '@/hooks/use-api-error';

/**
 * Returns RequestOptions for use with API modules.
 *
 * Single Source of Truth: Authentication is handled entirely via httpOnly cookies
 * set by the backend upon login/2FA. The browser automatically includes these
 * cookies in all API requests via credentials: 'include'.
 *
 * Client-side session state in AuthContext tracks user ID and Stellar address
 * without storing credentials or sending an Authorization header.
 *
 * This hook is maintained for backward compatibility with API modules expecting
 * RequestOptions (e.g. signal, priority, retries) and returns an empty options object.
 */
export function useApiOpts(): RequestOptions {
  return useMemo(() => ({}), []);
}
