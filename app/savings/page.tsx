"use client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Savings | ACBU",
  description:
    "Grow your wealth with ACBU savings accounts. Earn competitive APY interest and set savings goals.",
};

import { logger } from "@/lib/logger";
import React, { useState, useEffect, useCallback } from "react";
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
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { useApiOpts } from "@/hooks/use-api";
import * as userApi from "@/lib/api/user";
import * as savingsApi from "@/lib/api/savings";
import { formatAmount } from "@/lib/utils";
import type { SavingsGoal } from "@/types/api";

/**
 * Savings management page.
 *
 * Goals are fetched from and persisted to the backend (/savings/goals).
 * The previous implementation stored goals only in local React state,
 * which caused them to vanish on refresh and never reach the server.
 */
export default function SavingsPage() {
  const opts = useApiOpts();
  const [apiUser, setApiUser] = useState("");
  const [positionsBalance, setPositionsBalance] = useState<
    string | number | null
  >(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  // Goals state — sourced from backend, not a local initializer
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState("");
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");

  const isNewGoalFormValid =
    newGoalName.trim().length > 0 &&
    newGoalTarget.trim().length > 0 &&
    !Number.isNaN(Number.parseFloat(newGoalTarget)) &&
    Number.parseFloat(newGoalTarget) > 0 &&
    newGoalDeadline.length > 0;

  const resetNewGoalForm = () => {
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalDeadline("");
  };

  /** Fetch goals from the backend and refresh local state. */
  const loadGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError("");
    try {
      const fetched = await savingsApi.getSavingsGoals(opts);
      setGoals(fetched);
    } catch (e) {
      logger.error("Failed to load savings goals", e);
      setGoalsError(
        e instanceof Error ? e.message : "Failed to load savings goals",
      );
    } finally {
      setGoalsLoading(false);
    }
    // opts is a new object each render; opts.token is the stable auth identity signal
  }, [opts.token]);

  /** POST new goal to backend, optimistically append, then reconcile. */
  const handleCreateGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isNewGoalFormValid || goalSubmitting) return;

    setGoalSubmitting(true);
    setGoalsError("");
    try {
      const created = await savingsApi.createSavingsGoal(
        {
          name: newGoalName.trim(),
          target_amount: Number.parseFloat(newGoalTarget),
          deadline: newGoalDeadline,
        },
        opts,
      );
      setGoals((prev) => [...prev, created]);
      setShowNewGoalDialog(false);
      resetNewGoalForm();
      // Full refresh to pick up any server-assigned fields
      await loadGoals();
    } catch (e) {
      logger.error("Failed to create savings goal", e);
      setGoalsError(
        e instanceof Error ? e.message : "Failed to create savings goal",
      );
    } finally {
      setGoalSubmitting(false);
    }
  };

  useEffect(() => {
    setReceiveError("");
    userApi
      .getReceive(opts)
      .then((data) => {
        const uri = (data.pay_uri ?? data.alias) as string | undefined;
        if (uri && typeof uri === "string") setApiUser(uri);
        setReceiveError("");
      })
      .catch((e) => {
        logger.error("Failed to load user info", e);
        setReceiveError(
          e instanceof Error ? e.message : "Failed to load user info",
        );
      });
  }, [opts.token]);

  useEffect(() => {
    if (!apiUser) return;
    setPositionsLoading(true);
    setReceiveError("");
    savingsApi
      .getSavingsPositions(apiUser, undefined, opts)
      .then((res) => {
        setPositionsBalance(res.balance);
        setReceiveError("");
      })
      .catch((e) => {
        logger.error("Failed to load savings balance", e);
        setPositionsBalance(null);
        setReceiveError(
          e instanceof Error ? e.message : "Failed to load savings balance",
        );
      })
      .finally(() => setPositionsLoading(false));
  }, [apiUser, opts.token]);

  // Load goals once auth token is available
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const apiBalance =
    typeof positionsBalance === "number"
      ? positionsBalance
      : typeof positionsBalance === "string"
        ? parseFloat(positionsBalance) || 0
        : 0;
  const totalSavings = apiBalance;

  return (
    <>
      <header className="page-header">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link
            href="/"
            className="hover:bg-muted rounded p-2 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="page-title">Savings</h1>
            <p className="text-muted-foreground text-xs">Grow your wealth</p>
          </div>
        </div>
      </header>

      <PageContainer>
        <div className="space-y-6">
          {receiveError && (
            <div className="border-destructive/20 bg-destructive/5 text-destructive mb-6 flex items-center gap-2 rounded-xl border p-4 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="font-medium">{receiveError}</p>
            </div>
          )}

          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-600/10 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="page-title">Savings balance (API)</h2>
              <PiggyBank className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-foreground mb-1 text-3xl font-bold">
              {positionsLoading
                ? "—"
                : `ACBU ${formatAmount(positionsBalance)}`}
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/savings/deposit">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-transparent"
                >
                  Deposit
                </Button>
              </Link>
              <Link href="/savings/withdraw">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border bg-transparent"
                >
                  Withdraw
                </Button>
              </Link>
            </div>
          </Card>

          {/* Overview Card */}
          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-600/10 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="page-title">Total Savings</h2>
              <PiggyBank className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-foreground mb-1 text-3xl font-bold">
              {positionsLoading ? "—" : `ACBU ${formatAmount(totalSavings)}`}
            </p>
            <p className="text-muted-foreground mb-3 text-xs">
              Earning 8% APY interest
            </p>
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>
                +ACBU {formatAmount((totalSavings * 0.08) / 12)} this month
              </span>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground text-sm font-semibold">
                Savings Goals
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="border-border h-7 bg-transparent"
                onClick={() => setShowNewGoalDialog(true)}
              >
                <Plus className="mr-1 h-3 w-3" /> New Goal
              </Button>
            </div>

            {goalsError && (
              <div className="border-destructive/20 bg-destructive/5 text-destructive flex items-center gap-2 rounded-xl border p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{goalsError}</p>
              </div>
            )}

            {goalsLoading ? (
              <div className="text-muted-foreground flex items-center justify-center py-8">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-sm">Loading goals…</span>
              </div>
            ) : goals.length === 0 && !goalsError ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No savings goals yet. Create one to get started!
              </p>
            ) : (
              goals.map((goal) => {
                const progress =
                  goal.target_amount > 0
                    ? (goal.current_amount / goal.target_amount) * 100
                    : 0;
                return (
                  <Card key={goal.id} className="border-border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-foreground font-semibold">
                          {goal.name}
                        </h4>
                        <p className="text-muted-foreground text-xs">
                          Target: ACBU {formatAmount(goal.target_amount)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {goal.deadline}
                      </Badge>
                    </div>
                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-foreground text-sm font-medium">
                          ACBU {formatAmount(goal.current_amount)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {progress.toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </PageContainer>

      <Dialog
        open={showNewGoalDialog}
        onOpenChange={(open) => {
          setShowNewGoalDialog(open);
          if (!open) {
            resetNewGoalForm();
            setGoalsError("");
          }
        }}
      >
        <DialogContent className="border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Set a savings target to work towards
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateGoal}>
            {goalsError && (
              <div className="border-destructive/20 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{goalsError}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-goal-name" className="text-foreground">
                Goal Name
              </Label>
              <Input
                id="new-goal-name"
                placeholder="e.g. Emergency Fund"
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-goal-target" className="text-foreground">
                Target Amount (ACBU)
              </Label>
              <Input
                id="new-goal-target"
                type="number"
                placeholder="0.00"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-goal-deadline" className="text-foreground">
                Deadline
              </Label>
              <Input
                id="new-goal-deadline"
                type="month"
                value={newGoalDeadline}
                onChange={(e) => setNewGoalDeadline(e.target.value)}
                className="border-border"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewGoalDialog(false)}
                className="border-border flex-1"
                disabled={goalSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isNewGoalFormValid || goalSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
              >
                {goalSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Create Goal"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
