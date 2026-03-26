import { useMemo } from 'react';
import type { RequestOptions } from '@/lib/api/client';

/**
 * Returns RequestOptions for use with API modules.
 * NOTE: API key is now transmitted via httpOnly cookie (set by backend on login).
 * Browser automatically includes it in all requests with credentials: 'include'.
 * This hook is maintained for backward compatibility but returns empty options.
 */
export function useApiOpts(): RequestOptions {
  return useMemo(() => ({}), []);
}
