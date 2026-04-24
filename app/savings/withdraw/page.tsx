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
import * as recipientApi from "@/lib/api/recipient";
import type { RecipientResponse } from "@/types/api";

export default function SavingsWithdrawPage() {
    const opts = useApiOpts();
    const [homeRecipient, setHomeRecipient] = useState("");
    const [recipient, setRecipient] = useState("");
    const [termSeconds, setTermSeconds] = useState("0");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
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
        userApi
            .getReceive(opts)
            .then((data) => {
                const uri = (data.pay_uri ?? data.alias) as string | undefined;
                if (uri && typeof uri === "string") {
                    setHomeRecipient(uri);
                    setRecipient(uri);
                }
            })
            .catch((e) => {
                console.error(
                    e instanceof Error
                        ? e.message
                        : "Failed to load receive address",
                );
            });
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
        const targetRecipient = isRecipientChanged
            ? resolvedRecipientIdentifier || recipient.trim()
            : homeRecipient.trim();

        if (!targetRecipient || !amount || parseFloat(amount) <= 0) return;

        if (isRecipientChanged && !confirmDifferentRecipient) {
            setError(
                "Please confirm that you want to withdraw to a different recipient.",
            );
            return;
        }

        if (isRecipientChanged && !isRecipientResolved) {
            setError("Cannot submit until recipient is resolved.");
            return;
        }

        setError("");
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
            setError(e instanceof Error ? e.message : "Withdraw failed");
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
                        <p className="text-destructive text-sm">{error}</p>
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
                                id="withdraw-recipient"
                                value={recipient}
                                readOnly={!editingRecipient}
                                onChange={(e) => handleRecipientChange(e.target.value)}
                                onBlur={() => {
                                    if (isRecipientChanged) void validateRecipient(recipient.trim());
                                }}
                                className={`border-border font-mono text-sm ${editingRecipient ? '' : 'bg-muted'}`}
                                placeholder="Enter recipient ID or alias"
                            />
                            {!editingRecipient ? (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Your default receive account is locked by default. Click change to withdraw to another recipient.
                                </p>
                            ) : null}
                            {recipientValidationLoading && (
                                <p className="text-xs text-muted-foreground mt-2">Validating recipient…</p>
                            )}
                            {recipientValidationError && (
                                <p className="text-xs text-destructive mt-2">{recipientValidationError}</p>
                            )}
                            {isRecipientChanged && isRecipientResolved && (
                                <p className="text-xs text-foreground mt-2">
                                    Resolved recipient: {resolvedRecipientIdentifier || recipient.trim()}
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
                            disabled={
                                loading ||
                                !recipient.trim() ||
                                !amount ||
                                parseFloat(amount) <= 0 ||
                                (isRecipientChanged && (!confirmDifferentRecipient || !isRecipientResolved))
                            }
                        >
                            Withdraw
                        </Button>
                    </form>
                </Card>
            </PageContainer>
        </>
    );
}
