'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';

interface UseBalanceReturn {
  balance: number | null;
  /** When Soroban mint fails, backend may surface DB ledger while Horizon is 0. */
  balanceSource?: string;
  loading: boolean;
  error: string;
  refresh: () => void;
}

/**
 * Fetches the authenticated user's ACBU wallet balance from GET /users/me/balance.
 * Returns a numeric balance (null while unknown), loading flag, error string, and refresh fn.
 */
export function useBalance(): UseBalanceReturn {
  const opts = useApiOpts();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceSource, setBalanceSource] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    userApi
      .getBalance(opts)
      .then((data) => {
        if (cancelled) return;
        const raw = data.balance;
        const num = typeof raw === 'number' ? raw : parseFloat(raw);
        setBalance(Number.isNaN(num) ? null : num);
        setBalanceSource(data.balance_source);
      })
      .catch((e) => {
        if (cancelled) return;
        setBalance(null);
        setBalanceSource(undefined);
        setError(e instanceof Error ? e.message : 'Failed to load balance');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opts.token, tick]);

  return { balance, balanceSource, loading, error, refresh };
}
