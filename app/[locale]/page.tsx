'use client';

import React, { useState, useEffect } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | ACBU',
  description: 'View your ACBU wallet balance, recent transactions, and access key features like sending money, minting tokens, and managing savings.',
};
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useTranslations, useFormatter } from 'next-intl';
import {
  Send,
  TrendingUp,
  Eye,
  EyeOff,
  Coins,
  Clock,
  Building2,
  ArrowUpRight,
  HandCoins,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { EmptyState } from '@/components/ui/empty-state';
import { BalanceSkeleton } from '@/components/ui/balance-skeleton';
import { Button } from '@/components/ui/button';
import { RetryErrorBlock } from '@/components/ui/retry-error-block';
import { useApiOpts } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import * as transactionsApi from '@/lib/api/transactions';
import * as fiatApi from '@/lib/api/fiat';
import { useRates } from '@/lib/api/rates';
import type { TransactionListItem, RatesResponse } from '@/types/api';
import { formatAcbu, formatAmount, parseUtcDate } from '@/lib/utils';

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

function formatDate(iso: string) {
  const d = parseUtcDate(iso);
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
  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance();
  const opts = useApiOpts();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fiatAccounts, setFiatAccounts] = useState<fiatApi.FiatAccount[]>([]);
  const [fiatLoading, setFiatLoading] = useState(true);
  const {
    data: rates,
    loading: ratesLoading,
    error: ratesError,
    refetch: refetchRates,
  } = useRates(opts);

<<<<<<< HEAD:app/[locale]/page.tsx
  const t = useTranslations('home');
  const format = useFormatter();

  const features = [
    { title: t('features.send.title'), description: t('features.send.description'), icon: Send, href: '/send', color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
    { title: t('features.mint.title'), description: t('features.mint.description'), icon: Coins, href: '/mint', color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
    { title: t('features.simulated_bank.title'), description: t('features.simulated_bank.description'), icon: Building2, href: '/fiat', color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
    { title: t('features.rates.title'), description: t('features.rates.description'), icon: TrendingUp, href: '/rates', color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  ];
=======
  useScrollRestoration('/', !loading);
>>>>>>> origin/dev:app/page.tsx

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
      <header className="page-header">
        <div className="px-4 py-3 md:px-6 md:py-4 md:max-w-4xl md:mx-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-base font-bold text-foreground md:text-lg">Welcome back</h1>
              <p className="text-xs text-muted-foreground md:text-sm">Manage your finances</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 md:w-12 md:h-12">
              <div className="w-7 h-7 rounded-full bg-primary md:w-10 md:h-10" />
            </div>
          </div>
        </div>
      </header>

      <PageContainer>
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent p-5 relative overflow-hidden md:p-6">
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors flex-shrink-0 z-10 md:p-2 md:top-5 md:right-5"
              aria-label={showBalance ? 'Hide balances' : 'Show balances'}
            >
              {showBalance ? <Eye className="w-4 h-4 text-muted-foreground md:w-5 md:h-5" /> : <EyeOff className="w-4 h-4 text-muted-foreground md:w-5 md:h-5" />}
            </button>
            <div className="flex items-start gap-3 pr-12 mb-1 md:gap-6 md:pr-16">
              <div className="flex-1 min-w-0 border-r border-border/60 pr-3 md:pr-6">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 md:text-xs">
                  ACBU
                </p>
                <p className="text-[10px] text-muted-foreground mb-1 md:text-xs">Wallet balance</p>
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  role="region"
                  aria-label="Your ACBU wallet balance"
                  className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums md:text-4xl"
                >
                  {!showBalance
                    ? '••••••'
                    : balanceLoading
                      ? '...'
                      : `ACBU ${balance != null ? format.number(balance, { minimumFractionDigits: 0, maximumFractionDigits: 7 }) : '—'}`}
                </div>
                {!showBalance ? (
                  <p className="text-sm text-muted-foreground mt-1.5 md:text-base">••••••</p>
                ) : balanceLoading || ratesLoading ? (
                  <p className="text-sm text-muted-foreground mt-1.5 md:text-base"><BalanceSkeleton variant="compact" /></p>
                ) : acbuUsd != null ? (
                  <p
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-sm text-muted-foreground mt-1.5 tabular-nums md:text-base"
                  >
                    ≈ USD {formatAmount(acbuUsd, 2)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1.5 md:text-base">≈ USD —</p>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 md:text-xs">
                  Fiat
                </p>
                <p className="text-[10px] text-muted-foreground mb-1 md:text-xs">Simulated · USD equivalent</p>
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  role="region"
                  aria-label="Simulated fiat account USD equivalent"
                  className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums space-y-1 md:text-4xl"
                >
                  {!showBalance ? (
                    <p>••••••</p>
                  ) : fiatLoading || ratesLoading ? (
                    <p>...</p>
                  ) : (
                    <>
                      <p>
                        ≈ USD{' '}
                        {format.number(fiatUsdInfo?.usd ?? 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      {fiatUsdInfo?.partial && fiatAccounts.length > 0 && (
                        <p className="text-[10px] font-normal text-muted-foreground md:text-xs">
                          Some currencies missing a rate
                        </p>
                      )}
                      {!fiatAccounts.length && (
                        <p className="text-sm font-normal text-muted-foreground mt-1 md:text-base">
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
            {showBalance && (balanceError || ratesError) && (
              <RetryErrorBlock
                className="mt-3 text-xs"
                message={balanceError || ratesError}
                onRetry={() => {
                  if (balanceError) refetchBalance();
                  if (ratesError) refetchRates();
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href} className="block">
                  <div className={`${feature.color} rounded-lg border border-border/50 p-4 h-full transition-all active:scale-95 md:p-5`}>
                    <Icon className={`w-6 h-6 ${feature.iconColor} mb-2 md:w-7 md:h-7 md:mb-3`} />
                    <h3 className="text-sm font-semibold text-foreground mb-0.5 md:text-base">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground md:text-sm">{feature.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between px-1">
<<<<<<< HEAD:app/[locale]/page.tsx
              <h3 className="text-sm font-semibold text-foreground">{t('recent_activity')}</h3>
              <Link href="/activity" className="text-xs text-primary font-medium">{t('view_all')}</Link>
=======
              <h3 className="text-sm font-semibold text-foreground md:text-base">Recent Activity</h3>
              <Link href="/activity" className="text-xs text-primary font-medium md:text-sm">View all</Link>
>>>>>>> upstream/dev:app/page.tsx
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {loading ? (
              <SkeletonList count={3} itemHeight="h-20" />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-10 h-10" />}
                title={t('no_recent_activity')}
                action={
                  <Link href="/send" className="text-xs text-primary font-medium">
                    {t('send_money')}
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2 md:space-y-3">
                {transactions.slice(0, 5).map((t) => (
                  <Link key={t.transaction_id} href={`/transactions/${t.transaction_id}`} className="block rounded-lg border border-border bg-card p-3 transition-colors active:bg-muted md:p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-full flex-shrink-0 md:p-3 ${
                          t.type === 'mint'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : t.type === 'burn'
                              ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      >
                        <ArrowUpRight
                          className={`w-4 h-4 md:w-5 md:h-5 ${
                            t.type === 'mint'
                              ? 'text-green-600 dark:text-green-400'
                              : t.type === 'burn'
                                ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate md:text-base" title={t.type === 'mint' ? 'Mint' : t.type === 'burn' ? 'Burn' : 'Transfer'}>
                          {t.type === 'mint' ? 'Mint' : t.type === 'burn' ? 'Burn' : 'Transfer'}
                        </p>
                        <p className="text-xs text-muted-foreground md:text-sm">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-11 md:pl-14">
                      <p className="text-sm font-semibold text-foreground md:text-base">
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
                      <Badge variant="outline" className="text-xs md:text-sm">{t.status}</Badge>
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
