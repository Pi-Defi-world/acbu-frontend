'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowRight, User, Settings, LogOut, Eye, Clock, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBalance } from '@/hooks/use-balance';
import { useApiOpts } from '@/hooks/use-api';
import { formatAmount } from '@/lib/utils';
import * as userApi from '@/lib/api/user';
import * as transactionsApi from '@/lib/api/transactions';
import type { UserMe } from '@/types/api';
import type { TransactionListItem } from '@/types/api';
import Link from 'next/link';

const menuItems = [
  { 
    section: 'Account', 
    items: [
      { title: 'Profile', icon: User, href: '/me/profile' }, 
      { title: 'Settings', icon: Settings, href: '/me/settings' }, 
      { title: 'Two-Factor Auth', icon: Shield, href: '/me/settings/security' }, 
      { title: 'Wallet', icon: Eye, href: '/wallet' }, 
      { title: 'Simulated Bank', icon: Building2, href: '/fiat' }
    ] 
  },
  { section: 'Support', items: [{ title: 'Activity History', icon: Clock, href: '/activity' }] },
];

/**
 * User profile and account summary page.
 */
export default function MePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { balance, loading: balanceLoading } = useBalance();
  const opts = useApiOpts();
  const [user, setUser] = useState<UserMe | null>(null);
  const [monthlyNet, setMonthlyNet] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getTransactionDelta = (transaction: TransactionListItem) => {
      if (transaction.status !== 'completed') return 0;

      if (transaction.type === 'mint') {
        return Number(transaction.amount_acbu ?? 0);
      }

      if (transaction.type === 'burn') {
        return -Number(transaction.acbu_amount_burned ?? transaction.amount_acbu ?? 0);
      }

      if (transaction.type === 'transfer') {
        return -Number(transaction.amount_acbu ?? 0);
      }

      return 0;
    };

    Promise.all([
      userApi.getMe(opts),
      transactionsApi.listTransactions({ limit: 100 }, opts),
    ]).then(([userData, transactionsData]) => {
      if (cancelled) return;

      const currentMonthTransactions = (transactionsData.transactions ?? []).filter((transaction) => {
        const createdAt = new Date(transaction.created_at);
        return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
      });

      const monthlyAggregate = currentMonthTransactions.reduce(
        (sum, transaction) => sum + getTransactionDelta(transaction),
        0,
      );

      setUser(userData);
      setMonthlyNet(monthlyAggregate);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace('/auth/signin');
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted" />
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <p className="text-destructive">{error}</p>
      </PageContainer>
    );
  }

  const displayName = user?.username || user?.email || user?.phone_e164 || 'Account';
  const initials = (displayName.slice(0, 2) || 'AB').toUpperCase();
  const monthlyNetPositive = (monthlyNet ?? 0) >= 0;

  return (
    <>
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border">
        <div className="px-4 py-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 text-white text-lg font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{displayName}</h1>
              <p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone_e164 || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <PageContainer>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Total Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {balanceLoading ? '...' : `ACBU ${formatAmount(balance)}`}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2 font-medium">This Month</p>
              <p className={`text-2xl font-bold ${monthlyNetPositive ? 'text-accent' : 'text-destructive'}`}>
                {loading ? '...' : monthlyNet === null ? '—' : `${monthlyNetPositive ? '+' : '-'}ACBU ${formatAmount(Math.abs(monthlyNet))}`}
              </p>
            </div>
          </div>

          {menuItems.map((section) => (
            <div key={section.section} className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{section.section}</h3>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className="w-full text-left transition-colors active:bg-muted">
                      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="font-medium text-foreground text-sm truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent mt-6" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut className="w-4 h-4 mr-2" />Sign Out
          </Button>
        </div>
      </PageContainer>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full max-w-md bg-card p-6 rounded-t-xl border-t border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">Sign Out</h3>
            <p className="text-sm text-muted-foreground mb-6">You'll be logged out of your account. You can log back in anytime.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border bg-transparent" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
              <Button className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleLogout}>Sign Out</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}