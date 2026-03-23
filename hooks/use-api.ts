import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiOpts } from '@/lib/api/client';
import type { RequestOptions } from '@/lib/api/client';

/**
 * Returns RequestOptions with the current auth token for use with API modules.
 * Use with: transfers.getTransfers(useApiOpts()), etc.
 */
export function useApiOpts(): RequestOptions {
  const { apiKey } = useAuth();
  return useMemo(() => apiOpts(apiKey), [apiKey]);
}
