"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as ratesApi from '@/lib/api/rates';
import * as mintApi from '@/lib/api/mint';
import * as burnApi from '@/lib/api/burn';
import type { RatesResponse } from '@/types/api';
import { formatAmount } from '@/lib/utils';

const BALANCE_PLACEHOLDER = "—";
const MINT_NETWORK_FEE_TEXT = "Estimated at confirmation";
const BURN_PROCESSING_FEE_TEXT = "Estimated at confirmation";

/**
 * Mint and Burn page for ACBU tokens.
 */
export default function MintPage() {
  const opts = useApiOpts();
  const [activeTab, setActiveTab] = useState<'mint' | 'burn' | 'rates'>('mint');
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [burnDestination, setBurnDestination] = useState('bank');
  const [burnAccountNumber, setBurnAccountNumber] = useState('');
  const [burnError, setBurnError] = useState('');
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [mintError, setMintError] = useState('');
  const [txId, setTxId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

    useEffect(() => {
        if (activeTab !== "rates") return;
        setRatesLoading(true);
        ratesApi
            .getRates(opts)
            .then(setRates)
            .catch(() => setRates(null))
            .finally(() => setRatesLoading(false));
    }, [activeTab, opts.token]);

    const handleMintConfirm = () => {
        setMintError("");
        setStep("confirm");
    };
    const handleBurnConfirm = () => setStep("confirm");
    const handleExecuteMint = async () => {
        if (!usdcAmount || parseFloat(usdcAmount) <= 0 || !walletAddress.trim())
            return;
        if (!/^G[a-zA-Z0-9]{55}$/.test(walletAddress.trim())) {
            setMintError(
                "Wallet address must be a Stellar address (G..., 56 characters)",
            );
            return;
        }
        setMintError("");
        setExecuting(true);
        try {
            const res = await mintApi.mintFromUsdc(
                usdcAmount,
                walletAddress.trim(),
                undefined,
                opts,
            );
            setTxId(res.transaction_id);
            setStep("success");
        } catch (e) {
            setMintError(e instanceof Error ? e.message : "Mint failed");
        } finally {
            setExecuting(false);
        }
    };
    const handleExecuteBurn = async () => {
        setBurnError("");
        setExecuting(true);
        try {
            const res = await burnApi.burnAcbu(
                burnAmount,
                "USD",
                {
                    account_number: burnAccountNumber.trim(),
                    type:
                        burnDestination === "mobile" ? "mobile_money" : "bank",
                },
                opts,
            );
            setTxId(res.transaction_id);
            setStep("success");
        } catch (e) {
            setBurnError(e instanceof Error ? e.message : "Burn failed");
            setStep("input");
        } finally {
            setExecuting(false);
        }
    };
    const handleExecute = async () => {
        if (activeTab === "mint") {
            await handleExecuteMint();
        } else {
            await handleExecuteBurn();
        }
    };
    const resetForm = () => {
        setStep("input");
        setUsdcAmount("");
        setWalletAddress("");
        setBurnAmount("");
        setBurnAccountNumber("");
        setBurnError("");
        setTxId(null);
    };

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Mint & Burn</h1>
            <p className="text-xs text-muted-foreground">Create and redeem AFK</p>
          </div>
        </div>
      </header>

            <PageContainer>
                <div className="mb-6">
                    <Card className="border-border bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
                        <p className="text-sm font-medium opacity-90">
                            AFK Balance
                        </p>
                        <p className="text-3xl font-bold mb-2">
                            AFK {formatAmount(BALANCE_PLACEHOLDER)}
                        </p>
                        <p className="text-xs opacity-75">
                            Native ACBU Currency
                        </p>
                    </Card>
                </div>

                <Tabs
                    defaultValue="mint"
                    className="w-full"
                    onValueChange={(v) =>
                        setActiveTab(v as "mint" | "burn" | "rates")
                    }
                >
                    <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent border-b border-border rounded-none">
                        <TabsTrigger
                            value="mint"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            Mint
                        </TabsTrigger>
                        <TabsTrigger
                            value="burn"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            Burn
                        </TabsTrigger>
                        <TabsTrigger
                            value="rates"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            Rates
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="mint" className="py-6 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Convert USDC to AFK on Stellar network
                            </p>
                            {mintError && (
                                <p className="text-sm text-destructive mb-2">
                                    {mintError}
                                </p>
                            )}
                            <div>
                                <label
                                    htmlFor="mint-amount"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    USDC amount
                                </label>
                                <Input
                                    id="mint-amount"
                                    type="number"
                                    placeholder="0.00"
                                    min="0"
                                    step="any"
                                    value={usdcAmount}
                                    onChange={(e) =>
                                        setUsdcAmount(e.target.value)
                                    }
                                    className="border-border text-lg font-semibold"
                                />
                            </div>
                            <div className="mt-4">
                                <label
                                    htmlFor="mint-wallet-address"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Stellar wallet address (G...)
                                </label>
                                <Input
                                    id="mint-wallet-address"
                                    placeholder="G..."
                                    value={walletAddress}
                                    onChange={(e) =>
                                        setWalletAddress(e.target.value)
                                    }
                                    className="border-border font-mono text-sm"
                                    maxLength={56}
                                />
                            </div>
                            <Card className="border-border bg-muted p-3 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Network Fee
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {MINT_NETWORK_FEE_TEXT}
                                    </span>
                                </div>
                            </Card>
                            <Button
                                onClick={handleMintConfirm}
                                disabled={
                                    !usdcAmount ||
                                    parseFloat(usdcAmount) <= 0 ||
                                    !walletAddress.trim()
                                }
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                            >
                                <ArrowDown className="w-4 h-4 mr-2" />
                                Mint AFK
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="burn" className="py-6 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Redeem AFK for fiat withdrawal
                            </p>
                            {burnError && (
                                <p className="text-sm text-destructive mb-2">
                                    {burnError}
                                </p>
                            )}
                            <div>
                                <label
                                    htmlFor="burn-destination"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Destination
                                </label>
                                <select
                                    id="burn-destination"
                                    value={burnDestination}
                                    onChange={(e) =>
                                        setBurnDestination(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                                >
                                    <option value="bank">Bank Transfer</option>
                                    <option value="mobile">Mobile Money</option>
                                    <option value="wallet">
                                        Digital Wallet
                                    </option>
                                </select>
                            </div>
                            <div className="mt-4">
                                <label
                                    htmlFor="burn-account-number"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Account Number
                                </label>
                                <Input
                                    id="burn-account-number"
                                    placeholder="Account / phone number"
                                    value={burnAccountNumber}
                                    onChange={(e) =>
                                        setBurnAccountNumber(e.target.value)
                                    }
                                    className="border-border"
                                />
                            </div>
                            <div className="mt-4">
                                <label
                                    htmlFor="burn-amount"
                                    className="text-sm font-medium text-foreground mb-2 block"
                                >
                                    Amount to Burn
                                </label>
                                <div className="flex gap-2">
                                    <span className="flex items-center text-muted-foreground font-medium">
                                        AFK
                                    </span>
                                    <Input
                                        id="burn-amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={burnAmount}
                                        onChange={(e) =>
                                            setBurnAmount(e.target.value)
                                        }
                                        className="border-border text-lg font-semibold"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Available: AFK{" "}
                                    {formatAmount(BALANCE_PLACEHOLDER)}
                                </p>
                            </div>
                            <Card className="border-border bg-muted p-3 mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">
                                        You'll receive
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {burnAmount
                                            ? `Local currency (see /burn for details)`
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Processing Fee
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {BURN_PROCESSING_FEE_TEXT}
                                    </span>
                                </div>
                            </Card>
                            <Button
                                onClick={handleBurnConfirm}
                                disabled={
                                    !burnAmount ||
                                    parseFloat(burnAmount) <= 0 ||
                                    !burnAccountNumber.trim()
                                }
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                            >
                                <ArrowUp className="w-4 h-4 mr-2" />
                                Burn & Redeem
                            </Button>
                        </div>
                    </TabsContent>

          <TabsContent value="rates" className="py-6 space-y-4">
            <div className="space-y-3">
              {ratesLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : rates?.rates?.length ? (
                rates.rates.map((r: { currency?: string; rate?: number }) => (
                  <Card key={r.currency ?? r.rate} className="border-border p-4">
                    <div className="flex justify-between">
                      <p className="font-semibold text-foreground">{r.currency ?? 'Rate'}</p>
                      <p className="text-lg font-bold text-primary">{r.rate != null ? String(r.rate) : '—'}</p>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="border-border p-4"><p className="text-muted-foreground">No rates available. Use the API to load rates.</p></Card>
              )}
              <Card className="border-border bg-muted p-4 mt-6"><p className="text-sm font-semibold text-foreground mb-2">How it works</p><ul className="text-xs text-muted-foreground space-y-2"><li>• Mint converts USDC to native AFK</li><li>• Burn redeems AFK for fiat</li><li>• Rates from backend</li></ul></Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>

            <AlertDialog open={step === "confirm"}>
                <AlertDialogContent className="max-w-md border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {activeTab === "mint"
                                ? "Confirm Mint"
                                : "Confirm Burn"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {activeTab === "mint" &&
                                `Mint ACBU ${formatAmount(usdcAmount)} from USDC`}
                            {activeTab === "burn" &&
                                `Burn ACBU ${formatAmount(burnAmount)} and withdraw to bank account`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Amount:
                            </span>
                            <span className="font-medium text-foreground">
                                {activeTab === "mint"
                                    ? `USDC ${usdcAmount}`
                                    : `AFK ${formatAmount(burnAmount)}`}
                            </span>
                        </div>
                        {activeTab === "mint" && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Wallet:
                                </span>
                                <span className="font-mono text-xs truncate max-w-[200px]">
                                    {walletAddress}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <AlertDialogCancel
                            onClick={() => setStep("input")}
                            disabled={executing}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleExecute}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={executing}
                        >
                            {executing ? "Processing..." : "Confirm"}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={step === "success"}>
                <AlertDialogContent className="max-w-md border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Operation Complete</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your {activeTab} operation has been submitted
                            successfully.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Transaction ID: {txId ?? "—"}
                        </p>
                    </div>
                    <AlertDialogAction
                        onClick={resetForm}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Done
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
