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
  PiggyBank,
  TrendingUp,
  Target,
  Zap,
  CheckCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useRouter } from 'next/navigation';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';
import * as savingsApi from '@/lib/api/savings';
import { formatAmount } from '@/lib/utils';

interface SavingsAccount {
  id: string;
  name: string;
  apy: number;
  balance: number;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

const savingsAccounts: SavingsAccount[] = [
  {
    id: 'high-yield',
    name: 'High-Yield Savings',
    apy: 8.0,
    balance: 2500,
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'Best rates with instant access',
    color: 'from-green-500/10 to-green-600/10',
  },
  {
    id: 'goal-saver',
    name: 'Goal Saver',
    apy: 5.5,
    balance: 0,
    icon: <Target className="w-6 h-6" />,
    description: 'Save for specific goals',
    color: 'from-blue-500/10 to-blue-600/10',
  },
  {
    id: 'flex-saver',
    name: 'Flex Saver',
    apy: 4.2,
    balance: 0,
    icon: <Zap className="w-6 h-6" />,
    description: 'Flexible with quick withdrawals',
    color: 'from-amber-500/10 to-amber-600/10',
  },
];

const mockGoals: SavingsGoal[] = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetAmount: 5000,
    currentAmount: 2500,
    deadline: 'Dec 2024',
  },
  {
    id: '2',
    name: 'Business Startup',
    targetAmount: 10000,
    currentAmount: 3200,
    deadline: 'Jun 2025',
  },
];

/**
 * Savings management page.
 */
export default function SavingsPage() {
  const router = useRouter();
  const opts = useApiOpts();
  const [apiUser, setApiUser] = useState('');
  const [positionsBalance, setPositionsBalance] = useState<string | number | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositDialog, setShowDepositDialog] = useState(false);

  useEffect(() => {
    userApi.getReceive(opts).then((data) => {
      const uri = (data.pay_uri ?? data.alias) as string | undefined;
      if (uri && typeof uri === 'string') setApiUser(uri);
    }).catch(() => { });
  }, [opts.token]);
  useEffect(() => {
    if (!apiUser) return;
    setPositionsLoading(true);
    savingsApi.getSavingsPositions(apiUser, undefined, opts).then((res) => {
      setPositionsBalance(res.balance);
    }).catch(() => setPositionsBalance(null)).finally(() => setPositionsLoading(false));
  }, [apiUser, opts.token]);

  const handleSelectAccount = (account: SavingsAccount) => {
    setSelectedAccount(account);
    setShowDialog(true);
  };

  const handleDeposit = (account: SavingsAccount) => {
    setSelectedAccount(account);
    setShowDepositDialog(true);
  };

  const handleConfirmDeposit = () => {
    if (depositAmount && parseFloat(depositAmount) > 0) {
      console.log(
        `[v0] Deposit ${depositAmount} to ${selectedAccount?.name}`
      );
      setShowDepositDialog(false);
      setDepositAmount('');
    }
  };

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
            <h1 className="text-lg font-bold text-foreground">Savings</h1>
            <p className="text-xs text-muted-foreground">Grow your wealth</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PageContainer>
        <div className="space-y-6">
          {/* API balance */}
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-600/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">Savings balance (API)</h2>
              <PiggyBank className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{positionsLoading ? '—' : `ACBU ${formatAmount(positionsBalance)}`}</p>
            <div className="flex gap-2 mt-3">
              <Link href="/savings/deposit"><Button size="sm" variant="outline" className="border-border">Deposit</Button></Link>
              <Link href="/savings/withdraw"><Button size="sm" variant="outline" className="border-border">Withdraw</Button></Link>
            </div>
          </Card>

          {/* Overview Card */}
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-600/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">
                Total Savings
              </h2>
              <PiggyBank className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">ACBU 2,500.00</p>
            <p className="text-xs text-muted-foreground mb-3">
              Earning 8% APY interest
            </p>
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>+ACBU 16.67 this month</span>
            </div>
          </Card>

          {/* Savings Accounts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Savings Accounts
            </h3>
            {savingsAccounts.map((account) => {
              const percentage =
                account.balance > 0
                  ? (account.balance / (account.balance + 1000)) * 100
                  : 0;
              return (
                <div key={account.id}>
                  <button
                    onClick={() => handleSelectAccount(account)}
                    className="w-full text-left mb-2"
                  >
                    <Card
                      className={`border-border bg-gradient-to-br ${account.color} p-4 cursor-pointer hover:border-primary/50 transition-all`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-primary">{account.icon}</div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            {account.apy}%
                          </p>
                          <p className="text-xs text-muted-foreground">APY</p>
                        </div>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">
                        {account.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {account.description}
                      </p>
                    </Card>
                  </button>
                  {account.balance > 0 && (
                    <div className="px-1 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          ACBU {formatAmount(account.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(0)}%
                        </p>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => handleDeposit(account)}
                    variant="outline"
                    className="w-full border-border text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Deposit
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Savings Goals
              </h3>
              <Button size="sm" variant="outline" className="h-7 border-border bg-transparent">
                <Plus className="w-3 h-3 mr-1" />
                New Goal
              </Button>
            </div>

            {mockGoals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Card
                  key={goal.id}
                  className="border-border bg-card p-4 cursor-pointer hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {goal.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Target: ACBU {formatAmount(goal.targetAmount)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {goal.deadline}
                    </Badge>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        ACBU {formatAmount(goal.currentAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {progress.toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    ACBU {formatAmount(goal.targetAmount - goal.currentAmount)} to go
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Benefits Section */}
          <Card className="border-border bg-card p-5">
            <h4 className="font-semibold text-foreground mb-3">Why Save with Us?</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Competitive Rates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Up to 8% APY on savings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Instant Access
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Withdraw anytime, no penalties
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Goal Tracking
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Monitor progress toward your goals
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>

      {/* Account Details Dialog */}
      {selectedAccount && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md border-border">
            <DialogHeader>
              <DialogTitle>{selectedAccount.name}</DialogTitle>
              <DialogDescription>
                {selectedAccount.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">APY</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedAccount.apy}%
                  </p>
                </Card>
                <Card className="border-border bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    ACBU {formatAmount(selectedAccount.balance)}
                  </p>
                </Card>
              </div>

              <Card className="border-border bg-card p-3">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  How It Works
                </h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Deposit funds into your account</li>
                  <li>Earn interest daily on your balance</li>
                  <li>Withdraw anytime without penalties</li>
                  <li>Interest compounds automatically</li>
                </ol>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 border-border"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDialog(false);
                    handleDeposit(selectedAccount);
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Deposit Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader>
            <DialogTitle>Deposit to {selectedAccount?.name}</DialogTitle>
            <DialogDescription>
              Add funds to earn interest at {selectedAccount?.apy}% APY
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount" className="text-foreground">
                Amount to Deposit
              </Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground">ACBU</span>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="border-border text-lg font-semibold"
                />
              </div>
            </div>

            <Card className="border-border bg-muted p-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Monthly Interest*</span>
                <span className="font-medium text-foreground">
                  ACBU
                  {formatAmount(
                    (parseFloat(depositAmount || '0') *
                      (selectedAccount?.apy || 0)) /
                    12 /
                    100
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                *Estimated based on current APY
              </p>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDepositDialog(false)}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm Deposit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
