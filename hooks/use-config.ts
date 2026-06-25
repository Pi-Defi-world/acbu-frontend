'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAssetsConfig } from '@/lib/api/config';
import type { PublicAssetsConfig } from '@/lib/api/config';

// Globally cached config and the timestamp of when it was fetched
let cachedConfig: PublicAssetsConfig | null = null;
let lastFetched: number = 0;
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useConfig() {
  const [config, setConfig] = useState<PublicAssetsConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig || Date.now() - lastFetched > STALE_TIME);
  const [error, setError] = useState<string>('');
  const [tick, setTick] = useState(0);

  const fetchConfig = useCallback((force = false) => {
    const isStale = Date.now() - lastFetched > STALE_TIME;
    if (!force && cachedConfig && !isStale) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    getAssetsConfig()
      .then((data) => {
        cachedConfig = data;
        lastFetched = Date.now();
        setConfig(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to fetch config');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig, tick]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { config, loading, error, refresh };
}
