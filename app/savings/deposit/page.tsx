"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useApiOpts, useApiError } from "@/hooks/use-api";
import * as userApi from "@/lib/api/user";
import * as savingsApi from "@/lib/api/savings";
import { logger } from "@/lib/logger";

export default function SavingsDepositPage() {
    const opts = useApiOpts();
    const [user, setUser] = useState("");
    const [amount, setAmount] = useState("");
    const [termSeconds, setTermSeconds] = useState("0");
    const [loading, setLoading] = useState(false);
    const { error, clearError, handleError } = useApiError();
    const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    setError("");

    userApi.getReceive(opts).then(async (data) => {
      const uri = (data.pay_uri ?? data.alias) as string | undefined;
      if (!uri || typeof uri !== 'string') {
        if (!cancelled) setResolving(false);
        return;
      }

      // Resolve through backend recipient resolver so phone-based IDs,
      // aliases, and other non-Stellar identifiers are accepted.
      const resolved = await resolveUserUri(uri, opts);
      if (!cancelled) setUser(resolved);
    }).catch((e) => {
      logger.error(e instanceof Error ? e.message : 'Failed to load receive address');
    });

    return () => { cancelled = true; };
  }, [opts.token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.trim() || !amount || parseFloat(amount) <= 0) return;
        clearError();
        setLoading(true);
        try {
            await savingsApi.savingsDeposit(
                {
                    user: user.trim(),
                    amount,
                    term_seconds: parseInt(termSeconds, 10) || 0,
                },
                opts,
            );
            setSuccess("Deposit submitted.");
        } catch (e) {
            handleError(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="px-4 py-3 flex items-center gap-3">
                    <Link href="/savings">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">
                        Deposit
                    </h1>
                </div>
            </div>
            <PageContainer>
                <Card className="border-border p-4 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                    {success && (
                        <p className="text-green-600 text-sm">{success}</p>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="deposit-account"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Your account
                            </label>
                            <Input
                                id="deposit-account"
                                value={resolving ? "Resolving…" : user}
                                readOnly
                                className="border-border font-mono text-sm bg-muted"
                            />
                            {resolving && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Verifying account identifier…
                                </p>
                            )}
                        </div>
                        <div>
                            <label
                                htmlFor="deposit-amount"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Amount
                            </label>
                            <Input
                                id="deposit-amount"
                                type="number"
                                min="0"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="border-border"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="deposit-term"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Term (seconds)
                            </label>
                            <Input
                                id="deposit-term"
                                type="number"
                                min="0"
                                value={termSeconds}
                                onChange={(e) => setTermSeconds(e.target.value)}
                                className="border-border"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || resolving || !user.trim() || !amount}
                        >
                            {loading ? "Depositing…" : "Deposit"}
                        </Button>
                    </form>
                </Card>
            </PageContainer>
        </>
    );
}
