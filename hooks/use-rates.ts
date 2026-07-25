'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApiOpts } from '@/hooks/use-api';
import * as ratesApi from '@/lib/api/rates';
import type { RatesResponse } from '@/types/api';

/**
 * Stale-while-revalidate cache for exchange rates.
 *
 * Rates change infrequently (hourly at most), so a 5-minute staleTime
 * eliminates redundant network requests when components remount.
 * The cache is shared across all component instances via module scope.
 */
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

let cachedRates: RatesResponse | null = null;
let cachedAt = 0;
let inFlightPromise: Promise<RatesResponse> | null = null;

function isFresh(): boolean {
  return cachedRates !== null && Date.now() - cachedAt < STALE_TIME;
}

interface UseRatesReturn {
  rates: RatesResponse | null;
  loading: boolean;
  error: string;
  refresh: () => void;
}

/**
 * Fetches exchange rates with a 5-minute stale-while-revalidate cache.
 *
 * - On mount: returns cached data instantly if fresh, otherwise fetches.
 * - `refresh()`: forces a network fetch regardless of cache freshness.
 * - Cache is module-scoped and shared across all consumers.
 */
export function useRates(): UseRatesReturn {
  const opts = useApiOpts();
  const [rates, setRates] = useState<RatesResponse | null>(cachedRates);
  const [loading, setLoading] = useState(!isFresh());
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // If cache is fresh and this isn't a forced refresh, skip the fetch
    if (isFresh() && tick === 0) {
      setRates(cachedRates);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    // Deduplicate concurrent requests
    const promise =
      inFlightPromise ??
      (inFlightPromise = ratesApi.getRates(opts).finally(() => {
        inFlightPromise = null;
      }));

    promise
      .then((data) => {
        cachedRates = data;
        cachedAt = Date.now();
        if (!cancelled) setRates(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load rates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opts.token, tick]);

  return { rates, loading, error, refresh };
}
