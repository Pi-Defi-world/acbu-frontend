'use client';

import type { Metadata } from 'next';
import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = {
  title: 'My Account | ACBU',
  description: 'Manage your ACBU account, profile, and settings.',
};
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowRight, User, Settings, LogOut, Eye, Clock, Building2, Shield, HelpCircle, CheckCircle2, Clock3, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBalance } from '@/hooks/use-balance';
import { useApiOpts } from '@/hooks/use-api';
import { formatAmount, parseUtcDate } from '@/lib/utils';
import * as userApi from '@/lib/api/user';
import * as transactionsApi from '@/lib/api/transactions';
import type { UserMe } from '@/types/api';
import type { TransactionListItem } from '@/types/api';
import Link from 'next/link';
import { RetryErrorBlock } from '@/components/ui/retry-error-block';

// ---------------------------------------------------------------------------
// KYC polling constants
// ---------------------------------------------------------------------------

/** Statuses where KYC has reached a final state — polling must stop. */
const TERMINAL_KYC_STATUSES = new Set([
  "verified",
  "approved",
  "rejected",
  "failed",
  "not_started",
]);

// ---------------------------------------------------------------------------
// KYC badge helpers
// ---------------------------------------------------------------------------

type KycStatus =
  | "verified"
  | "approved"
  | "pending"
  | "under_review"
  | "submitted"
  | "rejected"
  | "failed"
  | "not_started"
  | string;

interface KycBadgeConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  Icon: React.ElementType;
}

function getKycBadgeConfig(
  status: KycStatus | undefined | null,
): KycBadgeConfig {
  switch (status?.toLowerCase()) {
    case "verified":
    case "approved":
      return {
        label: "KYC Verified",
        variant: "default",
        className:
          "bg-accent/20 text-accent border-accent/30 hover:bg-accent/20",
        Icon: CheckCircle2,
      };
    case "pending":
    case "under_review":
    case "submitted":
      return {
        label: "KYC Pending",
        variant: "secondary",
        className:
          "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/15 dark:text-yellow-400",
        Icon: Clock3,
      };
    case "rejected":
    case "failed":
      return {
        label: "KYC Rejected",
        variant: "destructive",
        className:
          "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15",
        Icon: XCircle,
      };
    default:
      return {
        label: "KYC Required",
        variant: "outline",
        className:
          "bg-muted/50 text-muted-foreground border-border hover:bg-muted/50",
        Icon: AlertCircle,
      };
  }
}

function LocalKycBadge({
  status,
  loading,
}: {
  status: KycStatus | undefined | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="bg-muted h-5 w-24 animate-pulse rounded-full" />;
  }
  const { label, className, Icon } = getKycBadgeConfig(status);
  return (
    <Badge
      variant="outline"
      className={`gap-1 px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {label}
    </Badge>
  );
}

const menuItems = [
  {
    section: "Account",
    items: [
      { title: "Profile", icon: User, href: "/me/profile" },
      { title: "Settings", icon: Settings, href: "/me/settings" },
      { title: "Two-Factor Auth", icon: Shield, href: "/me/settings/security" },
      { title: "Wallet", icon: Eye, href: "/wallet" },
      { title: "Simulated Bank", icon: Building2, href: "/fiat" },
    ],
  },
  {
    section: "Support",
    items: [
      { title: "Activity History", icon: Clock, href: "/activity" },
      { title: "Help Center", icon: HelpCircle, href: "/help" },
    ],
  },
];

export default function MePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance();
  const opts = useApiOpts();
  const [user, setUser] = useState<UserMe | null>(null);
  const [monthlyNet, setMonthlyNet] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  // Backoff Polling States
  const [pollingDelay, setPollingDelay] = useState<number>(3000); // Start with 3 seconds
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Main page initializer data fetch
  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getTransactionDelta = (transaction: TransactionListItem) => {
      if (transaction.status !== "completed") return 0;
      if (transaction.type === "mint")
        return Number(transaction.amount_acbu ?? 0);
      if (transaction.type === "burn")
        return -Number(
          transaction.acbu_amount_burned ?? transaction.amount_acbu ?? 0,
        );
      if (transaction.type === "transfer")
        return -Number(transaction.amount_acbu ?? 0);
      return 0;
    };

    Promise.all([
      userApi.getMe(opts),
      transactionsApi.listTransactions({ limit: 100 }, opts),
    ])
      .then(([userData, transactionsData]) => {
        if (cancelled) return;

        const currentMonthTransactions = (
          transactionsData.transactions ?? []
        ).filter((transaction) => {
          const createdAt = parseUtcDate(transaction.created_at);
          return (
            createdAt.getMonth() === currentMonth &&
            createdAt.getFullYear() === currentYear
          );
        });

        const monthlyAggregate = currentMonthTransactions.reduce(
          (sum, transaction) => sum + getTransactionDelta(transaction),
          0,
        );

        setUser(userData);
        setMonthlyNet(monthlyAggregate);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opts.token, tick]);

  // SMART POLL IMPLEMENTATION: Handles the dynamic KYC verification state loop
  useEffect(() => {
    // If user layout is loading, or we don't have user metrics yet, do nothing
    if (loading || !user) return;

    const currentStatus = user.kyc_status?.toLowerCase() || "";

    // If it hits a terminal status, stop scheduling timeouts entirely!
    if (TERMINAL_KYC_STATUSES.has(currentStatus)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const pollKycStatus = async () => {
      try {
        const freshUserData = await userApi.getMe(opts);
        const nextStatus = freshUserData.kyc_status?.toLowerCase() || "";

        setUser(freshUserData);

        if (TERMINAL_KYC_STATUSES.has(nextStatus)) {
          // Found success or rejection! End cycle loop.
          return;
        }

        // Keep searching, but double the interval delay (Cap at 60 seconds max)
        setPollingDelay((prev: number) => Math.min(prev * 2, 60000));
      } catch (err) {
        console.error("KYC polling attempt failed:", err);
        // On server error, backoff anyway to prevent loop thrashing
        setPollingDelay((prev: number) => Math.min(prev * 2, 60000));
      }
    };

    // Queue up the process iteration dynamically
    timerRef.current = setTimeout(pollKycStatus, pollingDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.kyc_status, pollingDelay, loading, opts.token]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace("/auth/signin");
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-14 w-14 rounded-full" />
          <div className="bg-muted h-5 w-32 rounded" />
          <div className="bg-muted h-4 w-48 rounded" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <RetryErrorBlock message={error} onRetry={refetch} className="p-4" />
      </PageContainer>
    );
  }

  const displayName =
    user?.username || user?.email || user?.phone_e164 || "Account";
  const initials = (displayName.slice(0, 2) || "AB").toUpperCase();
  const monthlyNetPositive = (monthlyNet ?? 0) >= 0;

  return (
    <>
      <div className="from-primary/10 to-background border-border border-b bg-gradient-to-b">
        <div className="space-y-4 px-4 py-6 md:mx-auto md:max-w-4xl md:px-6 md:py-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="from-primary to-secondary flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white md:h-20 md:w-20 md:text-2xl">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <h1
                  className="page-title truncate md:text-2xl"
                  title={displayName}
                >
                  {displayName}
                </h1>
                <LocalKycBadge status={user?.kyc_status} loading={loading} />
              </div>
              <p
                className="text-muted-foreground truncate text-xs md:text-sm"
                title={user?.email || user?.phone_e164 || "—"}
              >
                {user?.email || user?.phone_e164 || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <PageContainer>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="border-border bg-card rounded-lg border p-4 text-center md:p-6">
              <p className="text-muted-foreground mb-2 text-xs font-medium md:text-sm">
                Total Balance
              </p>
              <p className="text-foreground text-2xl font-bold md:text-3xl">
                {balanceLoading ? "..." : `ACBU ${formatAmount(balance)}`}
              </p>
              <RetryErrorBlock
                message={balanceError}
                onRetry={refetchBalance}
                className="bg-destructive/5 mt-2 text-xs"
              />
            </div>
            <div className="border-border bg-card rounded-lg border p-4 text-center md:p-6">
              <p className="text-muted-foreground mb-2 text-xs font-medium md:text-sm">
                This Month
              </p>
              <p
                className={`text-2xl font-bold md:text-3xl ${monthlyNetPositive ? "text-accent" : "text-destructive"}`}
              >
                {loading
                  ? "..."
                  : monthlyNet === null
                    ? "—"
                    : `${monthlyNetPositive ? "+" : "-"}ACBU ${formatAmount(Math.abs(monthlyNet))}`}
              </p>
            </div>
          </div>

          {menuItems.map((section) => (
            <div key={section.section} className="space-y-2 md:space-y-3">
              <h3 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase md:text-sm">
                {section.section}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className="active:bg-muted w-full text-left transition-colors"
                    >
                      <div className="border-border bg-card flex items-center justify-between gap-3 rounded-lg border p-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Icon className="text-primary h-5 w-5 flex-shrink-0" />
                          <span
                            className="text-foreground truncate text-sm font-medium"
                            title={item.title}
                          >
                            {item.title}
                          </span>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <ArrowRight className="text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 mt-6 w-full bg-transparent"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </PageContainer>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="bg-card border-border w-full max-w-md rounded-t-xl border-t p-6">
            <h3 className="page-title mb-2">Sign Out</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              You'll be logged out of your account. You can log back in anytime.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-border flex-1 bg-transparent"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
