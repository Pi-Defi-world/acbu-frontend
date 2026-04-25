"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import { useApiError } from "@/hooks/use-api-error";
import { ApiErrorDisplay } from "@/components/ui/api-error-display";
import * as userApi from "@/lib/api/user";
import * as savingsApi from "@/lib/api/savings";
import { resolveRecipient } from "@/lib/api/recipient";

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

export default function SavingsDepositPage() {
    const opts = useApiOpts();
    const [user, setUser] = useState("");
    const [amount, setAmount] = useState("");
    const [termSeconds, setTermSeconds] = useState("0");
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [error, setError] = useState("");
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
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Failed to load receive address');
      }
    }).finally(() => {
      if (!cancelled) setResolving(false);
    });

    return () => { cancelled = true; };
  }, [opts.token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.trim() || !amount || parseFloat(amount) <= 0) return;
        setError("");
        setSuccess("");
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
            setApiError(e);
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
