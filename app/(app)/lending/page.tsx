'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  CreditCard,
  TrendingDown,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useRouter } from 'next/navigation';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';
import * as lendingApi from '@/lib/api/lending';
import { formatAmount } from '@/lib/utils';

interface LoanProduct {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  minRate: number;
  maxRate: number;
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  color: string;
}

interface ActiveLoan {
  id: string;
  name: string;
  amount: number;
  rate: number;
  balance: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  remainingTerm: number;
}

const loanProducts: LoanProduct[] = [
  {
    id: 'personal',
    name: 'Personal Loan',
    description: 'Flexible loans for any purpose',
    icon: <CreditCard className="w-6 h-6" />,
    minRate: 5.5,
    maxRate: 12.0,
    minAmount: 500,
    maxAmount: 50000,
    minTerm: 6,
    maxTerm: 60,
    color: 'from-blue-500/10 to-blue-600/10',
  },
  {
    id: 'business',
    name: 'Business Loan',
    description: 'Grow your business with capital',
    icon: <TrendingDown className="w-6 h-6" />,
    minRate: 4.5,
    maxRate: 10.0,
    minAmount: 1000,
    maxAmount: 100000,
    minTerm: 12,
    maxTerm: 84,
    color: 'from-purple-500/10 to-purple-600/10',
  },
  {
    id: 'emergency',
    name: 'Emergency Loan',
    description: 'Quick funds when you need them',
    icon: <Zap className="w-6 h-6" />,
    minRate: 8.0,
    maxRate: 15.0,
    minAmount: 100,
    maxAmount: 5000,
    minTerm: 3,
    maxTerm: 24,
    color: 'from-amber-500/10 to-amber-600/10',
  },
];

const mockActiveLoan: ActiveLoan = {
  id: '1',
  name: 'Personal Loan',
  amount: 5000,
  rate: 7.5,
  balance: 3200,
  monthlyPayment: 120,
  nextPaymentDate: 'Feb 15, 2026',
  remainingTerm: 18,
};

/**
 * Lending and loan management page.
 */
export default function LendingPage() {
  const router = useRouter();
  const opts = useApiOpts();
  const [apiLender, setApiLender] = useState('');
  const [lendingBalance, setLendingBalance] = useState<string | number | null>(null);
  const [lendingLoading, setLendingLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(
    null
  );
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanTerm, setLoanTerm] = useState('');
  const [selectedLoanProduct, setSelectedLoanProduct] =
    useState<LoanProduct | null>(null);

  useEffect(() => {
    userApi.getReceive(opts).then((data) => {
      const uri = (data.pay_uri ?? data.alias) as string | undefined;
      if (uri && typeof uri === 'string') setApiLender(uri);
    }).catch(() => {});
  }, [opts.token]);
  useEffect(() => {
    if (!apiLender) return;
    setLendingLoading(true);
    lendingApi.getLendingBalance(apiLender, opts).then((res) => {
      setLendingBalance(res.balance);
    }).catch(() => setLendingBalance(null)).finally(() => setLendingLoading(false));
  }, [apiLender, opts.token]);

  const handleSelectProduct = (product: LoanProduct) => {
    setSelectedProduct(product);
    setShowProductDialog(true);
  };

  const handleApplyForLoan = (product: LoanProduct) => {
    setSelectedLoanProduct(product);
    setShowProductDialog(false);
    setShowApplicationDialog(true);
  };

  const estimateMonthlyPayment = () => {
    if (!loanAmount || !loanTerm || !selectedLoanProduct) return 0;
    const principal = parseFloat(loanAmount);
    const monthlyRate = selectedLoanProduct.minRate / 100 / 12;
    const months = parseInt(loanTerm);
    if (monthlyRate === 0) return principal / months;
    return (
      (principal *
        (monthlyRate * Math.pow(1 + monthlyRate, months))) /
      (Math.pow(1 + monthlyRate, months) - 1)
    );
  };

  const handleSubmitApplication = () => {
    if (loanAmount && loanTerm && selectedLoanProduct) {
      console.log('[v0] Loan application submitted:', {
        product: selectedLoanProduct.name,
        amount: loanAmount,
        term: loanTerm,
      });
      setShowApplicationDialog(false);
      setLoanAmount('');
      setLoanTerm('');
      setSelectedLoanProduct(null);
    }
  };

  const monthlyPayment = estimateMonthlyPayment();

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Borrow</h1>
            <p className="text-xs text-muted-foreground">Loans & credit</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PageContainer>
        <div className="space-y-6">
        {/* Lending balance (API) */}
        {(lendingLoading || lendingBalance != null) && (
          <Card className="border-border bg-gradient-to-br from-primary/20 to-secondary/10 p-5 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Lender balance (API)</h3>
            <p className="text-2xl font-bold text-foreground">{lendingLoading ? '—' : formatAmount(lendingBalance)}</p>
            <div className="flex gap-2 mt-3">
              <Link href="/lending/deposit"><Button size="sm" variant="outline" className="border-border">Deposit</Button></Link>
              <Link href="/lending/withdraw"><Button size="sm" variant="outline" className="border-border">Withdraw</Button></Link>
            </div>
          </Card>
        )}

        {/* Active Loan Card */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Active Loan
          </h3>
          <Card className="border-border bg-gradient-to-br from-primary/20 to-secondary/10 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  {mockActiveLoan.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  APR: {mockActiveLoan.rate}%
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Remaining Balance
                </p>
                <p className="text-lg font-bold text-foreground">
                  ACBU {formatAmount(mockActiveLoan.balance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Monthly Payment
                </p>
                <p className="text-lg font-bold text-foreground">
                  ACBU {formatAmount(mockActiveLoan.monthlyPayment)}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payoff Progress</span>
                <span className="font-medium text-foreground">
                  {(
                    ((mockActiveLoan.amount - mockActiveLoan.balance) /
                      mockActiveLoan.amount) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      ((mockActiveLoan.amount - mockActiveLoan.balance) /
                        mockActiveLoan.amount) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
              <CalendarDays className="w-4 h-4" />
              <span>Next payment due {mockActiveLoan.nextPaymentDate}</span>
            </div>
          </Card>
        </div>

        {/* Loan Products */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Borrow More
          </h3>
          {loanProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="w-full text-left"
            >
              <Card
                className={`border-border bg-gradient-to-br ${product.color} p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-primary">{product.icon}</div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">
                  {product.name}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {product.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.minRate}% - {product.maxRate}% APR
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    ACBU {formatAmount(product.minAmount)} - ACBU
                    {formatAmount(product.maxAmount)}
                  </Badge>
                </div>
              </Card>
            </button>
          ))}
        </div>

        {/* How It Works */}
        <Card className="border-border bg-card p-5">
          <h4 className="font-semibold text-foreground mb-3">How It Works</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Choose a loan type
                </p>
                <p className="text-xs text-muted-foreground">
                  Select the loan that fits your needs
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Apply in minutes
                </p>
                <p className="text-xs text-muted-foreground">
                  Quick application process
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Get approved
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive funds within 24 hours
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* FAQ */}
        <Card className="border-border bg-muted p-4">
          <h4 className="font-semibold text-foreground mb-3 text-sm">FAQ</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-foreground">
                What credit score do I need?
              </p>
              <p className="text-xs text-muted-foreground">
                Minimum 300 credit score. Some products require higher scores.
              </p>
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-foreground">
                Are there early repayment penalties?
              </p>
              <p className="text-xs text-muted-foreground">
                No penalties for early repayment.
              </p>
            </div>
          </div>
        </Card>
        </div>
      </PageContainer>

      {/* Product Details Dialog */}
      {selectedProduct && (
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="max-w-md border-border">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
              <DialogDescription>
                {selectedProduct.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Key Terms */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Interest Rate
                  </p>
                  <p className="font-bold text-foreground">
                    {selectedProduct.minRate}%{' '}
                    <span className="text-xs">-</span> {selectedProduct.maxRate}
                    %
                  </p>
                </Card>
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Loan Term
                  </p>
                  <p className="font-bold text-foreground">
                    {selectedProduct.minTerm}{' '}
                    <span className="text-xs">-</span> {selectedProduct.maxTerm}{' '}
                    mo
                  </p>
                </Card>
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Min Amount
                  </p>
                  <p className="font-bold text-foreground">
                    ACBU {formatAmount(selectedProduct.minAmount)}
                  </p>
                </Card>
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Max Amount
                  </p>
                  <p className="font-bold text-foreground">
                    ACBU {formatAmount(selectedProduct.maxAmount)}
                  </p>
                </Card>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Requirements
                </h4>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Minimum 18 years old</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Valid ID required</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Income verification</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Credit check</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowProductDialog(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleApplyForLoan(selectedProduct)}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Loan Application Dialog */}
      {selectedLoanProduct && (
        <Dialog
          open={showApplicationDialog}
          onOpenChange={setShowApplicationDialog}
        >
          <DialogContent className="max-w-md border-border">
            <DialogHeader>
              <DialogTitle>Apply for {selectedLoanProduct.name}</DialogTitle>
              <DialogDescription>
                Quick application - takes about 5 minutes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Loan Amount */}
              <div className="space-y-2">
                <Label htmlFor="loan-amount" className="text-foreground">
                  Loan Amount
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground">
                    ACBU
                  </span>
                  <Input
                    id="loan-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="border-border text-lg font-semibold"
                    min={selectedLoanProduct.minAmount}
                    max={selectedLoanProduct.maxAmount}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ACBU {formatAmount(selectedLoanProduct.minAmount)} -{' '}
                  ACBU {formatAmount(selectedLoanProduct.maxAmount)}
                </p>
              </div>

              {/* Loan Term */}
              <div className="space-y-2">
                <Label htmlFor="loan-term" className="text-foreground">
                  Loan Term (months)
                </Label>
                <Input
                  id="loan-term"
                  type="number"
                  placeholder="Enter term"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                  className="border-border"
                  min={selectedLoanProduct.minTerm}
                  max={selectedLoanProduct.maxTerm}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedLoanProduct.minTerm} -{' '}
                  {selectedLoanProduct.maxTerm} months
                </p>
              </div>

              {/* Payment Estimate */}
              {monthlyPayment > 0 && (
                <Card className="border-border bg-muted p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Est. Monthly Payment</span>
                    <span className="font-bold text-foreground">
                      ACBU {formatAmount(monthlyPayment)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At {selectedLoanProduct.minRate}% APR
                  </p>
                </Card>
              )}

              {/* Info Alert */}
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You'll need to provide income verification and consent to a credit check.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowApplicationDialog(false)}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitApplication}
                  disabled={!loanAmount || !loanTerm}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
