'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApiOpts } from '@/hooks/use-api';
import * as ratesApi from '@/lib/api/rates';
import type { RatesResponse } from '@/types/api';

// Globally cached rates and the timestamp of when they were fetched
let cachedRates: RatesResponse | null = null;
let lastFetched: number = 0;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useRates() {
  const opts = useApiOpts();
  const [rates, setRates] = useState<RatesResponse | null>(cachedRates);
  const [loading, setLoading] = useState(!cachedRates || Date.now() - lastFetched > STALE_TIME);
  const [error, setError] = useState<string>('');
  const [tick, setTick] = useState(0);

  const fetchRates = useCallback((force = false) => {
    const isStale = Date.now() - lastFetched > STALE_TIME;
    if (!force && cachedRates && !isStale) {
      setRates(cachedRates);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    ratesApi
      .getRates(opts)
      .then((data) => {
        cachedRates = data;
        lastFetched = Date.now();
        setRates(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch rates');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [opts]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates, tick]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { rates, loading, error, refresh };
}
