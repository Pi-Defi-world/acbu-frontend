"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  PiggyBank,
  TrendingUp,
  Plus,
  AlertCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { useApiOpts } from "@/hooks/use-api";
import * as userApi from "@/lib/api/user";
import * as savingsApi from "@/lib/api/savings";
import { resolveRecipient } from "@/lib/api/recipient";
import { formatAmount } from "@/lib/utils";

/**
 * Resolve any user identifier (Stellar address, phone, alias, pay URI)
 * through the backend recipient resolver to obtain the canonical pay_uri.
 * Falls back to the raw value when the resolver is unavailable so that
 * Stellar-format addresses still work offline.
 */
async function resolveUserUri(
  raw: string,
  opts: Parameters<typeof resolveRecipient>[1],
): Promise<string> {
  try {
    const resolved = await resolveRecipient(raw, opts);
    if (resolved.pay_uri) return resolved.pay_uri;
    if (resolved.alias) return resolved.alias;
  } catch {
    // Resolver unavailable — fall through to raw value.
  }
  return raw;
}

interface SavingsAccount {
    id: string;
    name: string;
    apy: number;
    balance: number;
    icon: LucideIcon;
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

const initialGoals: SavingsGoal[] = [
  {
    id: "1",
    name: "Emergency Fund",
    targetAmount: 5000,
    currentAmount: 2500,
    deadline: "Dec 2024",
  },
  {
    id: "2",
    name: "Business Startup",
    targetAmount: 10000,
    currentAmount: 3200,
    deadline: "Jun 2025",
  },
];


/**
 * Savings management page.
 */
export default function SavingsPage() {
  const opts = useApiOpts();
  const [apiUser, setApiUser] = useState("");
  const [positionsBalance, setPositionsBalance] = useState<string | number | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [receiveError, setReceiveError] = useState("");
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);

  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReceiveError("");
    userApi.getReceive(opts).then(async (data) => {
      const uri = (data.pay_uri ?? data.alias) as string | undefined;
      if (uri && typeof uri === "string") {
        // Resolve through backend recipient resolver so phone-based IDs,
        // aliases, and other non-Stellar identifiers are accepted.
        const resolved = await resolveUserUri(uri, opts);
        if (!cancelled) setApiUser(resolved);
      }
      if (!cancelled) setReceiveError("");
    }).catch((e) => {
      if (!cancelled) setReceiveError(e instanceof Error ? e.message : "Failed to load user info");
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  useEffect(() => {
    if (!apiUser) return;
    setPositionsLoading(true);
    setReceiveError("");
    savingsApi.getSavingsPositions(apiUser, undefined, opts).then((res) => {
      setPositionsBalance(res.balance);
      setReceiveError("");
    }).catch((e) => {
      setPositionsBalance(null);
      setReceiveError(e instanceof Error ? e.message : "Failed to load savings balance");
    }).finally(() => setPositionsLoading(false));
  }, [apiUser, opts.token]);

  const apiBalance = typeof positionsBalance === "number" ? positionsBalance : typeof positionsBalance === "string" ? parseFloat(positionsBalance) || 0 : 0;
  const totalSavings = apiBalance;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-md px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Savings</h1>
            <p className="text-xs text-muted-foreground">Grow your wealth</p>
          </div>
        </div>
      </header>

      <PageContainer>
        <div className="space-y-6">
          {receiveError && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium">{receiveError}</p>
            </div>
          )}

          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-600/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-foreground">Savings balance (API)</h2>
              <PiggyBank className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {positionsLoading ? "—" : `ACBU ${formatAmount(positionsBalance)}`}
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/savings/deposit">
                <Button size="sm" variant="outline" className="border-border bg-transparent">Deposit</Button>
              </Link>
              <Link href="/savings/withdraw">
                <Button size="sm" variant="outline" className="border-border bg-transparent">Withdraw</Button>
              </Link>
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
            {/* AFTER */}
            <p className="text-3xl font-bold text-foreground mb-1">
              {positionsLoading ? "—" : `ACBU ${formatAmount(totalSavings)}`}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Earning 8% APY interest
            </p>
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3" />
            <span>+ACBU {formatAmount((totalSavings * 0.08) / 12)} this month</span>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Savings Goals</h3>
              <Button size="sm" variant="outline" className="h-7 border-border bg-transparent" onClick={() => setShowNewGoalDialog(true)}>
                <Plus className="w-3 h-3 mr-1" /> New Goal
              </Button>
            </div>
            {goals.map((goal) => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <Card key={goal.id} className="border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-foreground">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground">Target: ACBU {formatAmount(goal.targetAmount)}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{goal.deadline}</Badge>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">ACBU {formatAmount(goal.currentAmount)}</p>
                      <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </PageContainer>

      <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>Set a savings target to work towards</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Goal Name</Label>
              <Input placeholder="e.g. Emergency Fund" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} className="border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Target Amount (ACBU)</Label>
              <Input type="number" placeholder="0.00" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} className="border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Deadline</Label>
              <Input type="month" value={newGoalDeadline} onChange={(e) => setNewGoalDeadline(e.target.value)} className="border-border" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowNewGoalDialog(false)} className="flex-1 border-border">Cancel</Button>
              <Button 
                disabled={!newGoalName || !newGoalTarget || parseFloat(newGoalTarget) <= 0 || isNaN(parseFloat(newGoalTarget)) || !newGoalDeadline} 
                onClick={() => {
                  const parsedAmount = parseFloat(newGoalTarget);
                  const newGoal: SavingsGoal = {
                    id: crypto.randomUUID(),
                    name: newGoalName,
                    targetAmount: parsedAmount,
                    currentAmount: 0,
                    deadline: newGoalDeadline,
                  };
                  setGoals((prev) => [...prev, newGoal]);
                  setShowNewGoalDialog(false);
                  setNewGoalName("");
                  setNewGoalTarget("");
                  setNewGoalDeadline("");
                }} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
