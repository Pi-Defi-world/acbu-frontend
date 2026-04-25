'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, HandCoins, ShieldAlert, CheckCircle2, AlertCircle, Clock, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageContainer } from '@/components/layout/page-container';
import { useApiOpts } from '@/hooks/use-api';
import * as lendingApi from '@/lib/api/lending';
import * as userApi from '@/lib/api/user';
import { formatAmount } from '@/lib/utils';
import {
  listApplications,
  saveApplication,
  type StoredLoanApplication,
} from '@/lib/lending-store';

interface LoanProduct {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  ratePct: number;
  icon: LucideIcon;
}

const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'personal',
    name: 'Personal loan',
    description: 'Unsecured credit for general use',
    minAmount: 50,
    maxAmount: 5000,
    minTerm: 3,
    maxTerm: 24,
    ratePct: 12,
    icon: HandCoins,
  },
  {
    id: 'business',
    name: 'Business loan',
    description: 'Working capital for SMEs',
    minAmount: 500,
    maxAmount: 25000,
    minTerm: 6,
    maxTerm: 36,
    ratePct: 9,
    icon: Briefcase,
  },
  {
    id: 'emergency',
    name: 'Emergency loan',
    description: 'Fast short-term liquidity',
    minAmount: 25,
    maxAmount: 1000,
    minTerm: 1,
    maxTerm: 6,
    ratePct: 15,
    icon: ShieldAlert,
  },
];

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LendingPage() {
  const opts = useApiOpts();

  const [apiUser, setApiUser] = useState('');
  const [balance, setBalance] = useState<string | number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [productId, setProductId] = useState<string>(LOAN_PRODUCTS[0].id);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  const [applications, setApplications] = useState<StoredLoanApplication[]>([]);

  useEffect(() => {
    setApplications(listApplications());
  }, []);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getReceive(opts)
      .then((data) => {
        const uri = (data.pay_uri ?? data.alias) as string | undefined;
        if (!cancelled && uri) setApiUser(uri);
      })
      .catch(() => {
        /* ignore — lender identity falls back to empty */
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token]);

  useEffect(() => {
    if (!apiUser) return;
    let cancelled = false;
    setBalanceLoading(true);
    lendingApi
      .getLendingBalance(apiUser, opts)
      .then((res) => {
        if (!cancelled) setBalance(res.balance);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiUser, opts.token]);

  const selectedProduct = useMemo(
    () => LOAN_PRODUCTS.find((p) => p.id === productId) ?? LOAN_PRODUCTS[0],
    [productId]
  );

  const parsedAmount = parseFloat(amount);
  const parsedTerm = parseInt(term, 10);
  const amountValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount >= selectedProduct.minAmount &&
    parsedAmount <= selectedProduct.maxAmount;
  const termValid =
    Number.isFinite(parsedTerm) &&
    parsedTerm >= selectedProduct.minTerm &&
    parsedTerm <= selectedProduct.maxTerm;
  const canSubmit = amountValid && termValid && !submitting;

  const resetForm = () => {
    setAmount('');
    setTerm('');
    setPurpose('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    setWarningMessage('');

    if (!amountValid) {
      setFormError(
        `Amount must be between ACBU ${selectedProduct.minAmount} and ACBU ${selectedProduct.maxAmount}.`
      );
      return;
    }
    if (!termValid) {
      setFormError(
        `Term must be between ${selectedProduct.minTerm} and ${selectedProduct.maxTerm} months.`
      );
      return;
    }

    setSubmitting(true);

    let loanId = generateLocalId();
    let synced = false;
    let errorMessage: string | undefined;

    try {
      const res = await lendingApi.applyForLoan(
        {
          productId: selectedProduct.id,
          amount: parsedAmount,
          term: parsedTerm,
        },
        opts
      );
      if (res.loanId) loanId = res.loanId;
      synced = Boolean(res.success);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Backend sync failed';
    }

    const record: StoredLoanApplication = {
      id: loanId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      amount: parsedAmount,
      term: parsedTerm,
      purpose: purpose.trim() || undefined,
      applicantUser: apiUser || undefined,
      status: synced ? 'submitted' : 'pending',
      syncedWithBackend: synced,
      submittedAt: new Date().toISOString(),
      errorMessage,
    };

    const next = saveApplication(record);
    setApplications(next);
    resetForm();
    setSubmitting(false);

    if (synced) {
      setSuccessMessage(`Application submitted. Reference: ${loanId}`);
    } else {
      setSuccessMessage(`Application saved (ref ${loanId}).`);
      setWarningMessage(
        errorMessage
          ? `Pending backend sync — backoffice stub captured the submission. (${errorMessage})`
          : 'Pending backend sync — backoffice stub captured the submission.'
      );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Lending</h1>
            <p className="text-xs text-muted-foreground">Apply for a loan</p>
          </div>
          <Link
            href="/lending/admin"
            className="text-xs font-medium text-primary hover:underline"
          >
            Backoffice
          </Link>
        </div>
      </header>

      <PageContainer>
        <div className="space-y-6">
          <Card className="border-border bg-gradient-to-br from-amber-500/10 to-amber-600/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Lending position</h2>
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {balanceLoading
                ? '—'
                : apiUser
                  ? `ACBU ${formatAmount(balance ?? 0)}`
                  : 'Sign in to view'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {apiUser ? `Lender: ${apiUser}` : 'Lender identity unavailable'}
            </p>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Choose a product</h3>
            <div className="grid grid-cols-1 gap-3">
              {LOAN_PRODUCTS.map((product) => {
                const Icon = product.icon;
                const active = product.id === productId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setProductId(product.id)}
                    className={`w-full text-left rounded-xl border transition-all p-4 ${
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground">{product.name}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {product.ratePct}% APR
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {product.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          ACBU {product.minAmount}–{product.maxAmount} ·{' '}
                          {product.minTerm}–{product.maxTerm} months
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Application details
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="loan-amount" className="text-foreground">
                  Amount (ACBU)
                </Label>
                <Input
                  id="loan-amount"
                  type="number"
                  inputMode="decimal"
                  min={selectedProduct.minAmount}
                  max={selectedProduct.maxAmount}
                  step="any"
                  placeholder={`${selectedProduct.minAmount} – ${selectedProduct.maxAmount}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-term" className="text-foreground">
                  Term (months)
                </Label>
                <Input
                  id="loan-term"
                  type="number"
                  inputMode="numeric"
                  min={selectedProduct.minTerm}
                  max={selectedProduct.maxTerm}
                  step="1"
                  placeholder={`${selectedProduct.minTerm} – ${selectedProduct.maxTerm}`}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-purpose" className="text-foreground">
                  Purpose (optional)
                </Label>
                <Textarea
                  id="loan-purpose"
                  placeholder="How will you use the funds?"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="border-border"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}
              {successMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{successMessage}</p>
                </div>
              )}
              {warningMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{warningMessage}</p>
                </div>
              )}

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {submitting ? 'Submitting…' : 'Submit application'}
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Your applications</h3>
              <Link href="/lending/admin" className="text-xs text-primary font-medium">
                View all
              </Link>
            </div>
            {applications.length === 0 ? (
              <Card className="border-border p-4">
                <p className="text-sm text-muted-foreground">
                  No applications yet. Submit one above to see it here.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 5).map((app) => (
                  <Card key={app.id} className="border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">
                          {app.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ACBU {formatAmount(app.amount)} · {app.term} months
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          Ref: {app.id}
                        </p>
                      </div>
                      <Badge
                        variant={app.syncedWithBackend ? 'default' : 'secondary'}
                        className="text-[10px] capitalize"
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
