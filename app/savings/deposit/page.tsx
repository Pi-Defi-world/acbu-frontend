"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import * as userApi from "@/lib/api/user";
import * as savingsApi from "@/lib/api/savings";

export default function SavingsDepositPage() {
    const opts = useApiOpts();
    const [user, setUser] = useState("");
    const [amount, setAmount] = useState("");
    const [termSeconds, setTermSeconds] = useState("0");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

  useEffect(() => {
    userApi.getReceive(opts).then((data) => {
      const uri = (data.pay_uri ?? data.alias) as string | undefined;
      if (uri && typeof uri === 'string') setUser(uri);
    }).catch((e) => {
      console.error(e instanceof Error ? e.message : 'Failed to load receive address');
    });
  }, [opts.token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.trim() || !amount || parseFloat(amount) <= 0) return;
        setError("");
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
            setError(e instanceof Error ? e.message : "Deposit failed");
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
                        <p className="text-destructive text-sm">{error}</p>
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
                                value={user}
                                readOnly
                                className="border-border font-mono text-sm bg-muted"
                            />
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
                            disabled={loading || !user.trim() || !amount}
                        >
                            Deposit
                        </Button>
                    </form>
                </Card>
            </PageContainer>
        </>
    );
}
