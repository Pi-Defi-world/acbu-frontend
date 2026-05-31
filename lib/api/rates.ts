import { get } from './client';
import type { RequestOptions } from './client';
import type { RatesResponse, QuoteResponse } from '@/types/api';
import { useCallback, useEffect, useState } from 'react';

const RATES_TTL_MS = 60_000; // 1 minute

let cachedRates: RatesResponse | null = null;
let cacheToken: string | undefined;
let cacheExpiry = 0;

export async function getRates(opts?: RequestOptions): Promise<RatesResponse> {
  const now = Date.now();
  if (cachedRates && opts?.token === cacheToken && now < cacheExpiry) {
    return cachedRates;
  }
  const data = await get<RatesResponse>('/rates', opts);
  cachedRates = data;
  cacheToken = opts?.token;
  cacheExpiry = now + RATES_TTL_MS;
  return data;
}

export interface UseRatesResult {
  data: RatesResponse | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

/**
 * Lightweight rates fetch hook (non-React-Query).
 * Provides an `{ error, refetch }` shape for UI retry.
 */
export function useRates(opts?: RequestOptions): UseRatesResult {
  const [data, setData] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getRates(opts)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e instanceof Error ? e.message : 'Failed to load rates');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, opts?.token]);

  return { data, loading, error, refetch };
}

export async function getQuote(
  amount: number | string,
  currency?: string,
  opts?: RequestOptions
): Promise<QuoteResponse> {
  const params = new URLSearchParams({ amount: String(amount) });
  if (currency) params.set('currency', currency);
  return get<QuoteResponse>(`/rates/quote?${params.toString()}`, opts);
}
