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

export default function SavingsWithdrawPage() {
    const opts = useApiOpts();
    const [homeRecipient, setHomeRecipient] = useState("");
    const [recipient, setRecipient] = useState("");
    const [termSeconds, setTermSeconds] = useState("0");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const { error, clearError, handleError } = useApiError();
    const [success, setSuccess] = useState("");
    const [editingRecipient, setEditingRecipient] = useState(false);
    const [resolvedRecipient, setResolvedRecipient] = useState<RecipientResponse | null>(null);
    const [recipientValidationLoading, setRecipientValidationLoading] = useState(false);
    const [recipientValidationError, setRecipientValidationError] = useState("");
    const [confirmDifferentRecipient, setConfirmDifferentRecipient] = useState(false);

    const isRecipientChanged = recipient.trim() !== homeRecipient.trim();
    const resolvedRecipientIdentifier = resolvedRecipient?.pay_uri || resolvedRecipient?.alias || '';
    const isRecipientResolved = Boolean(
        resolvedRecipient?.resolved || resolvedRecipientIdentifier,
    );

    useEffect(() => {
        let cancelled = false;
        setResolving(true);
        setError("");

        userApi
            .getReceive(opts)
            .then(async (data) => {
                const uri = (data.pay_uri ?? data.alias) as string | undefined;
                if (!uri || typeof uri !== "string") {
                    if (!cancelled) setResolving(false);
                    return;
                }

                // Resolve through backend recipient resolver so phone-based IDs,
                // aliases, and other non-Stellar identifiers are accepted.
                const resolved = await resolveUserUri(uri, opts);
                if (!cancelled) setUser(resolved);
            })
            .catch((e) => {
                logger.error(
                    e instanceof Error
                        ? e.message
                        : "Failed to load receive address",
                );
            });

        return () => { cancelled = true; };
    }, [opts.token]);

    const validateRecipient = async (value: string) => {
        setRecipientValidationError("");
        setRecipientValidationLoading(true);
        setResolvedRecipient(null);

        try {
            const result = await recipientApi.resolveRecipient(value, opts);
            setResolvedRecipient(result);
            if (!result.resolved && !result.pay_uri && !result.alias) {
                setRecipientValidationError("Recipient could not be resolved. Please enter a valid ID or alias.");
            }
        } catch (e) {
            setRecipientValidationError(
                e instanceof Error
                    ? e.message
                    : "Unable to validate recipient",
            );
        } finally {
            setRecipientValidationLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.trim() || !amount || parseFloat(amount) <= 0) return;
        clearError();
        setLoading(true);

        try {
            await savingsApi.savingsWithdraw(
                {
                    user: targetRecipient,
                    term_seconds: parseInt(termSeconds, 10) || 0,
                    amount,
                },
                opts,
            );
            setSuccess("Withdrawal submitted.");
        } catch (e) {
            handleError(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRecipientChange = (nextValue: string) => {
        setRecipient(nextValue);
        setConfirmDifferentRecipient(false);
        setResolvedRecipient(null);
        setRecipientValidationError("");
    };

    const handleToggleEdit = () => {
        if (editingRecipient) {
            setRecipient(homeRecipient);
            setConfirmDifferentRecipient(false);
            setResolvedRecipient(null);
            setRecipientValidationError("");
        }
        setEditingRecipient(!editingRecipient);
    };

    return (
        <>
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
                <div className="px-4 py-3 flex items-center gap-3">
                    <Link href="/savings">
                        <ArrowLeft className="w-5 h-5 text-primary" />
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">
                        Withdraw
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
                            <div className="flex items-center justify-between gap-3">
                                <label
                                    htmlFor="withdraw-recipient"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Recipient
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToggleEdit}
                                >
                                    {editingRecipient ? 'Reset' : 'Change'}
                                </Button>
                            </div>
                            <Input
                                id="withdraw-account"
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
                                htmlFor="withdraw-term"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Term (seconds)
                            </label>
                            <Input
                                id="withdraw-term"
                                type="number"
                                min="0"
                                value={termSeconds}
                                onChange={(e) => setTermSeconds(e.target.value)}
                                className="border-border"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="withdraw-amount"
                                className="text-sm font-medium text-foreground mb-2 block"
                            >
                                Amount
                            </label>
                            <Input
                                id="withdraw-amount"
                                type="number"
                                min="0"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="border-border"
                            />
                        </div>
                        {isRecipientChanged && (
                            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3">
                                <input
                                    type="checkbox"
                                    id="confirm-different-recipient"
                                    checked={confirmDifferentRecipient}
                                    onChange={(e) => setConfirmDifferentRecipient(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <label htmlFor="confirm-different-recipient" className="text-sm text-foreground">
                                    I confirm I want to withdraw to a different recipient than my default receive account.
                                </label>
                            </div>
                        )}
                        <Button
                            type="submit"
                            disabled={loading || resolving || !user.trim() || !amount}
                        >
                            {loading ? "Withdrawing…" : "Withdraw"}
                        </Button>
                    </form>
                </Card>
            </PageContainer>
        </>
    );
}
