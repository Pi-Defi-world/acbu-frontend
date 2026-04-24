'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  TrendingUp,
  Eye,
  EyeOff,
  Coins,
  Clock,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { EmptyState } from '@/components/ui/empty-state';
import { useApiOpts } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import * as transactionsApi from '@/lib/api/transactions';
import * as fiatApi from '@/lib/api/fiat';
import * as ratesApi from '@/lib/api/rates';
import type { TransactionListItem, RatesResponse } from '@/types/api';
import { formatAcbu, formatAmount } from '@/lib/utils';

function parsePositiveNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseNonNegativeAmount(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** USD notional for one ACBU (from oracle / rates). */
function getUsdPerAcbu(rates: RatesResponse | null): number | null {
  return parsePositiveNumber(rates?.acbu_usd ?? null);
}

/** Local currency units per 1 ACBU (same convention as backend mint path). */
function getLocalPerAcbu(currency: string, rates: RatesResponse | null): number | null {
  if (!rates) return null;
  const key = `acbu_${currency.trim().toLowerCase()}` as keyof RatesResponse;
  return parsePositiveNumber(rates[key] as string | number | null | undefined);
}

function acbuBalanceToUsd(
  acbu: number | null,
  rates: RatesResponse | null,
): number | null {
  if (acbu == null) return null;
  const usdPerAcbu = getUsdPerAcbu(rates);
  if (usdPerAcbu == null) return null;
  return acbu * usdPerAcbu;
}

/** Converts each simulated bank balance (local units) to USD via ACBU cross rates. */
function sumSimulatedFiatUsd(
  accounts: fiatApi.FiatAccount[],
  rates: RatesResponse | null,
): { usd: number; partial: boolean } {
  const usdPerAcbu = getUsdPerAcbu(rates);
  if (!accounts.length) return { usd: 0, partial: false };
  if (usdPerAcbu == null) return { usd: 0, partial: true };

  let total = 0;
  let partial = false;
  for (const acc of accounts) {
    const bal = parseNonNegativeAmount(acc.balance);
    if (bal === 0) continue;
    const localPerAcbu = getLocalPerAcbu(acc.currency, rates);
    if (localPerAcbu == null) {
      partial = true;
      continue;
    }
    const acbuEq = bal / localPerAcbu;
    total += acbuEq * usdPerAcbu;
  }
  return { usd: total, partial };
}

const features = [
  { title: 'Send', description: 'Transfer money', icon: Send, href: '/send', color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { title: 'Mint', description: 'Create ACBU', icon: Coins, href: '/mint', color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  { title: 'Simulated Bank', description: 'Demo Fiat', icon: Building2, href: '/fiat', color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { title: 'Rates', description: 'Market rates', icon: TrendingUp, href: '/rates', color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

/**
 * Home dashboard page showing balance and recent activity.
 */
export default function Home() {
  const [showBalance, setShowBalance] = useState(true);
  const { balance, loading: balanceLoading, error: balanceError } = useBalance();
  const opts = useApiOpts();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fiatAccounts, setFiatAccounts] = useState<fiatApi.FiatAccount[]>([]);
  const [fiatLoading, setFiatLoading] = useState(true);
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    ratesApi
      .getRates(opts)
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {
        if (!cancelled) setRates(null);
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token]);

  useEffect(() => {
    let cancelled = false;
    setFiatLoading(true);
    fiatApi
      .getFiatAccounts(opts)
      .then((data) => {
        if (!cancelled) setFiatAccounts(data.accounts ?? []);
      })
      .catch(() => {
        if (!cancelled) setFiatAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setFiatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token]);

  useEffect(() => {
    let cancelled = false;
    transactionsApi.listTransactions({ limit: 20 }, opts).then((data) => {
      if (!cancelled) setTransactions(data.transactions ?? []);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load activity');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  const acbuUsd =
    showBalance && !balanceLoading && balance != null
      ? acbuBalanceToUsd(balance, rates)
      : null;
  const fiatUsdInfo = showBalance ? sumSimulatedFiatUsd(fiatAccounts, rates) : null;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-base font-bold text-foreground">Welcome back</h1>
              <p className="text-xs text-muted-foreground">Manage your finances</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </header>

      <PageContainer>
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent p-5 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors flex-shrink-0 z-10"
              aria-label={showBalance ? 'Hide balances' : 'Show balances'}
            >
              {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="flex items-start gap-3 pr-12 mb-1">
              <div className="flex-1 min-w-0 border-r border-border/60 pr-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  ACBU
                </p>
                <p className="text-[10px] text-muted-foreground mb-1">Wallet balance</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                  {!showBalance
                    ? '••••••'
                    : balanceLoading
                      ? '...'
                      : `ACBU ${formatAmount(balance)}`}
                </h2>
                {!showBalance ? (
                  <p className="text-sm text-muted-foreground mt-1.5 tabular-nums">••••••</p>
                ) : balanceLoading || ratesLoading ? (
                  <p className="text-sm text-muted-foreground mt-1.5">≈ USD ...</p>
                ) : balance == null ? (
                  <p className="text-sm text-muted-foreground mt-1.5">≈ USD —</p>
                ) : acbuUsd != null ? (
                  <p className="text-sm text-muted-foreground mt-1.5 tabular-nums">
                    ≈ USD {formatAmount(acbuUsd, 2)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1.5">≈ USD —</p>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Fiat
                </p>
                <p className="text-[10px] text-muted-foreground mb-1">Simulated · USD equivalent</p>
                <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums space-y-1">
                  {!showBalance ? (
                    <p>••••••</p>
                  ) : fiatLoading || ratesLoading ? (
                    <p>...</p>
                  ) : (
                    <>
                      <p>
                        ≈ USD{' '}
                        {formatAmount(fiatUsdInfo?.usd ?? 0, 2)}
                      </p>
                      {fiatUsdInfo?.partial && fiatAccounts.length > 0 && (
                        <p className="text-[10px] font-normal text-muted-foreground">
                          Some currencies missing a rate
                        </p>
                      )}
                      {!fiatAccounts.length && (
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          <Link href="/fiat" className="text-primary font-medium underline-offset-2 hover:underline">
                            Add demo funds
                          </Link>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {showBalance && balanceError && (
              <div className="flex items-center gap-1 text-xs text-destructive mt-2">
                <span>{balanceError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href} className="block">
                  <div className={`${feature.color} rounded-lg border border-border/50 p-4 h-full transition-all active:scale-95`}>
                    <Icon className={`w-6 h-6 ${feature.iconColor} mb-2`} />
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              <Link href="/activity" className="text-xs text-primary font-medium">View all</Link>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading ? (
              <SkeletonList count={3} itemHeight="h-20" />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-10 h-10" />}
                title="No recent activity"
                action={
                  <Link href="/send" className="text-xs text-primary font-medium">
                    Send money
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 5).map((t) => (
                  <Link key={t.transaction_id} href={`/transactions/${t.transaction_id}`} className="block rounded-lg border border-border bg-card p-3 transition-colors active:bg-muted">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-full flex-shrink-0 ${
                          t.type === 'mint'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : t.type === 'burn'
                              ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      >
                        <ArrowUpRight
                          className={`w-4 h-4 ${
                            t.type === 'mint'
                              ? 'text-green-600 dark:text-green-400'
                              : t.type === 'burn'
                                ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.type === 'mint' ? 'Mint' : t.type === 'burn' ? 'Burn' : 'Transfer'}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-11">
                      <p className="text-sm font-semibold text-foreground">
                        {t.type === 'burn'
                          ? `- ACBU ${formatAcbu(t.acbu_amount_burned ?? t.amount_acbu)}`
                          : t.type === 'mint'
                            ? t.amount_acbu != null
                              ? `+ ACBU ${formatAcbu(t.amount_acbu)}`
                              : t.local_currency && t.local_amount
                                ? `+ ${t.local_currency} ${formatAmount(t.local_amount)}`
                                : '—'
                            : `ACBU ${formatAcbu(t.amount_acbu)}`}
                      </p>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
