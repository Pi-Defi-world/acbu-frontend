'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Briefcase,
  CreditCard,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Coins,
  Clock,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { EmptyState } from '@/components/ui/empty-state';
import { useApiOpts } from '@/hooks/use-api';
import { useBalance } from '@/hooks/use-balance';
import * as transfersApi from '@/lib/api/transfers';
import type { TransferItem } from '@/types/api';
import { cn, formatAmount } from '@/lib/utils';

const features = [
  { title: 'Send', description: 'Transfer money', icon: Send, href: '/send', color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
  { title: 'Mint', description: 'Create ACBU', icon: Coins, href: '/mint', color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  { title: 'Business', description: 'Business tools', icon: Briefcase, href: '/business', color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { title: 'Bills', description: 'Pay bills', icon: CreditCard, href: '/bills', color: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
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
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    transfersApi.getTransfers(opts).then((data) => {
      if (!cancelled) setTransfers(data.transfers ?? []);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load activity');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

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
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Balance</p>
                <h2 className="text-3xl font-bold text-foreground">
                  {!showBalance
                    ? '••••••'
                    : balanceLoading
                      ? '...'
                      : `ACBU ${formatAmount(balance)}`}
                </h2>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 hover:bg-muted rounded-full transition-colors flex-shrink-0"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            {showBalance && balanceError && (
              <div className="flex items-center gap-1 text-xs text-destructive">
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
            ) : transfers.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-10 h-10" />}
                title="No recent transfers"
                action={
                  <Link href="/send" className="text-xs text-primary font-medium">
                    Send money
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {transfers.slice(0, 5).map((t) => (
                  <Link key={t.transaction_id} href={`/send/${t.transaction_id}`} className="block rounded-lg border border-border bg-card p-3 transition-colors active:bg-muted">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
                        <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Transfer</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-11">
                      <p className="text-sm font-semibold text-foreground">- ACBU {formatAmount(t.amount_acbu)}</p>
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
