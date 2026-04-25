"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { useApiOpts } from "@/hooks/use-api";
import { useApiError } from "@/hooks/use-api-error";
import { ApiErrorDisplay } from "@/components/ui/api-error-display";
import * as mintApi from "@/lib/api/mint";
import * as burnApi from "@/lib/api/burn";
import * as ratesApi from "@/lib/api/rates";
import type { MintResponse, BurnResponse, RatesResponse } from "@/types/api";
import { featureFlags } from "@/lib/features";

/** Local currency units per 1 ACBU from the `/rates` oracle, or null if missing. */
function localPerAcbu(currency: string, rates: RatesResponse | null): number | null {
  if (!rates || !currency) return null;
  const key = `acbu_${currency.trim().toLowerCase()}` as keyof RatesResponse;
  const raw = rates[key];
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** ACBU received when minting `usd` dollars: usd / (USD per ACBU). */
function estimateAcbuFromUsd(usd: number, rates: RatesResponse | null): number | null {
  const perAcbu = localPerAcbu("USD", rates);
  if (perAcbu == null || !(usd > 0)) return null;
  return usd / perAcbu;
}

/** Local currency received when burning `acbu` units to `currency`. */
function estimateLocalFromAcbu(
  acbu: number,
  currency: string,
  rates: RatesResponse | null,
): number | null {
  const perAcbu = localPerAcbu(currency, rates);
  if (perAcbu == null || !(acbu > 0)) return null;
  return acbu * perAcbu;
}

/**
 * Currency management hub.
 */
export default function CurrencyPage() {
  const opts = useApiOpts();
  const { uiError, setApiError, clearError, isSubmitDisabled } = useApiError();

  const [activeTab, setActiveTab] = useState<"mint" | "burn" | "international">(
    "mint",
  );
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [submitting, setSubmitting] = useState(false);
  const [lastTxId, setLastTxId] = useState("");
  const [lastResponse, setLastResponse] = useState<
    MintResponse | BurnResponse | null
  >(null);

  const [rates, setRates] = useState<RatesResponse | null>(null);

  // Mint state
  const [mintAmount, setMintAmount] = useState("");
  const [mintSource, setMintSource] = useState("usdc");
  const [mintWalletAddress, setMintWalletAddress] = useState("");

  // Burn state
  const [burnAmount, setBurnAmount] = useState("");
  const [burnDestination, setBurnDestination] = useState("bank");
  const [burnAccountNumber, setBurnAccountNumber] = useState("");
  const [burnBankCode, setBurnBankCode] = useState("");
  const [burnAccountName, setBurnAccountName] = useState("");

  // International state
  const [intlAmount, setIntlAmount] = useState("");
  const [intlCurrency, setIntlCurrency] = useState("USD");
  const [intlCountry, setIntlCountry] = useState("US");
  const [intlAccountNumber, setIntlAccountNumber] = useState("");
  const [intlBankCode, setIntlBankCode] = useState("");
  const [intlAccountName, setIntlAccountName] = useState("");

  useEffect(() => {
    let cancelled = false;
    ratesApi
      .getRates(opts)
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch(() => {
        if (!cancelled) setRates(null);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token]);

  const usdPerAcbu = useMemo(() => localPerAcbu("USD", rates), [rates]);
  const ngnPerAcbu = useMemo(() => localPerAcbu("NGN", rates), [rates]);
  const intlPerAcbu = useMemo(
    () => localPerAcbu(intlCurrency, rates),
    [intlCurrency, rates],
  );

  const availableBalance = balance ?? 0;
  const burnNumeric = parseFloat(burnAmount || "0");
  const intlNumeric = parseFloat(intlAmount || "0");
  const mintNumeric = parseFloat(mintAmount || "0");

  const estimatedMintAcbu = estimateAcbuFromUsd(mintNumeric, rates);
  const estimatedBurnNgn = estimateLocalFromAcbu(burnNumeric, "NGN", rates);
  const estimatedIntlLocal = estimateLocalFromAcbu(intlNumeric, intlCurrency, rates);

  const handleMintConfirm = () => setStep("confirm");
  const handleBurnConfirm = () => setStep("confirm");

  const handleExecute = async () => {
    clearError();
    setSubmitting(true);
    try {
      if (activeTab === "mint") {
        const res = await mintApi.mintFromUsdc(
          mintAmount,
          mintWalletAddress.trim(),
          "auto",
          opts,
        );
        setLastTxId(res.transaction_id);
        setLastResponse(res);
        toast({
          title: "Mint submitted",
          description: `Transaction ${res.transaction_id} · status ${res.status}`,
        });
      } else if (activeTab === "burn") {
        const recipientType =
          burnDestination === "bank"
            ? "bank"
            : burnDestination === "mobile"
              ? "mobile_money"
              : undefined;
        const res = await burnApi.burnAcbu(
          burnAmount,
          "NGN",
          {
            type: recipientType as "bank" | "mobile_money" | undefined,
            account_number: burnAccountNumber.trim(),
            bank_code: burnBankCode.trim(),
            account_name: burnAccountName.trim(),
          },
          opts,
        );
        setLastTxId(res.transaction_id);
        setLastResponse(res);
        toast({
          title: "Burn submitted",
          description: `Transaction ${res.transaction_id} · status ${res.status}`,
        });
      } else {
        const res = await burnApi.burnAcbu(
          intlAmount,
          intlCurrency,
          {
            account_number: intlAccountNumber.trim(),
            bank_code: intlBankCode.trim(),
            account_name: intlAccountName.trim(),
          },
          opts,
        );
        setLastTxId(res.transaction_id);
        setLastResponse(res);
        toast({
          title: "International transfer submitted",
          description: `Transaction ${res.transaction_id} · status ${res.status}`,
        });
      }
      setStep("success");
      refreshBalance();
    } catch (e) {
      setApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("input");
    setMintAmount("");
    setMintWalletAddress("");
    setBurnAmount("");
    setBurnAccountNumber("");
    setBurnBankCode("");
    setBurnAccountName("");
    setIntlAmount("");
    setIntlAccountNumber("");
    setIntlBankCode("");
    setIntlAccountName("");
    clearError();
    setLastTxId("");
    setLastResponse(null);
  };

  return (
    <>
      <div className="border-b border-border">
        <div className="px-4 pt-6 pb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Currency Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Convert, mint, and manage your digital assets
          </p>
        </div>
      </div>

      <PageContainer>
        {/* Balance Card */}
        <div className="mb-6">
          <Card className="border-border bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
            <p className="text-sm font-medium opacity-90">ACBU Balance</p>
            <p className="text-3xl font-bold mb-2">
              {balanceLoading || balance == null
                ? "ACBU —"
                : `ACBU ${formatAmount(balance)}`}
            </p>
            <p className="text-xs opacity-75">
              {balanceLoading || balance == null || ngnPerAcbu == null
                ? "≈ ₦ —"
                : `≈ ₦${formatAmount(balance * ngnPerAcbu, 0)}`}
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue="mint"
          className="w-full"
          onValueChange={(v) =>
            setActiveTab(v as "mint" | "burn" | "international")
          }
        >
          <TabsList className="grid w-full grid-cols-3 px-4 gap-2 bg-transparent border-b border-border rounded-none">
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
            {featureFlags.internationalTransfers && (
              <TabsTrigger
                value="international"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                International
              </TabsTrigger>
            )}
          </TabsList>

          {/* Mint Tab */}
          <TabsContent value="mint" className="px-4 py-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Convert USDC to ACBU on Stellar
              </p>
              <Card className="border-border p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <select
                  value={mintSource}
                  onChange={(e) => setMintSource(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                >
                  <option value="usdc">USDC (Ethereum)</option>
                  <option value="usdc-polygon">USDC (Polygon)</option>
                </select>
              </Card>

              <div className="mb-4">
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Amount to Mint
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="border-border text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You'll receive:{" "}
                  {estimatedMintAcbu != null
                    ? `ACBU ${formatAmount(estimatedMintAcbu)}`
                    : mintNumeric > 0
                      ? "ACBU — (rate unavailable)"
                      : "ACBU 0.00"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Destination Wallet Address
                </Label>
                <Input
                  type="text"
                  placeholder="GXXXXXXXX... (Stellar address)"
                  value={mintWalletAddress}
                  onChange={(e) => setMintWalletAddress(e.target.value)}
                  className="border-border"
                />
              </div>

              <Card className="border-border bg-muted p-3 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-foreground">
                    Calculated at confirmation
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Rate (ACBU per USD)
                  </span>
                  <span className="font-medium text-foreground">
                    {usdPerAcbu != null
                      ? formatAmount(1 / usdPerAcbu, 4)
                      : "—"}
                  </span>
                </div>
              </Card>

              <Button
                onClick={handleMintConfirm}
                disabled={
                  !mintAmount ||
                  parseFloat(mintAmount) <= 0 ||
                  !mintWalletAddress.trim()
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
              >
                <ArrowDown className="w-4 h-4 mr-2" />
                Mint ACBU
              </Button>
            </div>
          </TabsContent>

          {/* Burn Tab */}
          <TabsContent value="burn" className="px-4 py-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Convert ACBU to fiat and withdraw
              </p>
              <Card className="border-border p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Destination
                </p>
                <select
                  value={burnDestination}
                  onChange={(e) => setBurnDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="wallet">Digital Wallet</option>
                </select>
              </Card>

              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Amount to Burn
                </Label>
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground">
                    ACBU
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    className="border-border text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Available:{" "}
                  {balanceLoading || balance == null
                    ? "—"
                    : `ACBU ${formatAmount(balance)}`}
                </p>
                {balance != null && burnNumeric > availableBalance && (
                  <p className="text-xs text-destructive mt-1">
                    Insufficient balance
                  </p>
                )}
              </div>

              <Card className="border-border p-4 mt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  Recipient Account
                </p>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1 block">
                    Account Number
                  </Label>
                  <Input
                    type="text"
                    placeholder="0123456789"
                    value={burnAccountNumber}
                    onChange={(e) => setBurnAccountNumber(e.target.value)}
                    className="border-border"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1 block">
                    Bank Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="044"
                    value={burnBankCode}
                    onChange={(e) => setBurnBankCode(e.target.value)}
                    className="border-border"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1 block">
                    Account Name
                  </Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={burnAccountName}
                    onChange={(e) => setBurnAccountName(e.target.value)}
                    className="border-border"
                  />
                </div>
              </Card>

              <Card className="border-border bg-muted p-3 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">You'll receive</span>
                  <span className="font-medium text-foreground">
                    {estimatedBurnNgn != null
                      ? `₦${formatAmount(estimatedBurnNgn, 2)}`
                      : burnNumeric > 0
                        ? "₦ — (rate unavailable)"
                        : "₦0.00"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-foreground">
                    Calculated at confirmation
                  </span>
                </div>
              </Card>

              <Button
                onClick={handleBurnConfirm}
                disabled={
                  !burnAmount ||
                  burnNumeric <= 0 ||
                  (balance != null && burnNumeric > availableBalance) ||
                  !burnAccountNumber.trim() ||
                  !burnBankCode.trim() ||
                  !burnAccountName.trim()
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Burn & Withdraw
              </Button>
            </div>
          </TabsContent>

          {/* International Tab */}
          {featureFlags.internationalTransfers && (
          <TabsContent value="international" className="px-4 py-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Send money internationally with real-time rates
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Recipient Country
                  </label>
                  <select
                    value={intlCountry}
                    onChange={(e) => setIntlCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                  >
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="GH">Ghana</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Currency
                  </label>
                  <select
                    value={intlCurrency}
                    onChange={(e) => setIntlCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                  >
                    <option value="USD">USD (US Dollar)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="NGN">NGN (Nigerian Naira)</option>
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="GHS">GHS (Ghanaian Cedi)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Amount (ACBU)
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-muted-foreground">
                      ACBU
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={intlAmount}
                      onChange={(e) => setIntlAmount(e.target.value)}
                      className="border-border text-lg font-semibold"
                    />
                  </div>
                </div>

                <Card className="border-border p-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Recipient Account
                  </p>
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">
                      Account Number
                    </Label>
                    <Input
                      type="text"
                      placeholder="0123456789"
                      value={intlAccountNumber}
                      onChange={(e) => setIntlAccountNumber(e.target.value)}
                      className="border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">
                      Bank Code / SWIFT
                    </Label>
                    <Input
                      type="text"
                      placeholder="BOFAUS3N"
                      value={intlBankCode}
                      onChange={(e) => setIntlBankCode(e.target.value)}
                      className="border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-1 block">
                      Account Name
                    </Label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={intlAccountName}
                      onChange={(e) => setIntlAccountName(e.target.value)}
                      className="border-border"
                    />
                  </div>
                </Card>

                <Card className="border-border bg-muted p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {estimatedIntlLocal != null
                          ? `${intlCurrency} ${formatAmount(estimatedIntlLocal)}`
                          : intlNumeric > 0
                            ? `${intlCurrency} — (rate unavailable)`
                            : `${intlCurrency} 0.00`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {intlPerAcbu != null
                          ? `at ${intlCurrency} ${formatAmount(intlPerAcbu, 4)} per ACBU`
                          : `rate unavailable for ${intlCurrency}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fee: calculated at confirmation
                  </div>
                </Card>

                <Button
                  onClick={() => setStep("confirm")}
                  disabled={
                    !intlAmount ||
                    parseFloat(intlAmount) <= 0 ||
                    !intlAccountNumber.trim() ||
                    !intlBankCode.trim() ||
                    !intlAccountName.trim()
                  }
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </Button>
              </div>
            </div>
          </TabsContent>
          )}
        </Tabs>
      </PageContainer>

      {/* Confirmation Dialog */}
      <AlertDialog open={step === "confirm"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTab === "mint" && "Confirm Mint"}
              {activeTab === "burn" && "Confirm Burn & Withdrawal"}
              {activeTab === "international" && "Confirm Transfer"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTab === 'mint' &&
                (estimatedMintAcbu != null
                  ? `Mint ACBU ${formatAmount(estimatedMintAcbu)} from USDC`
                  : `Mint from $${mintAmount || '0'} USDC (ACBU amount calculated by backend)`)}
              {activeTab === 'burn' &&
                `Burn ACBU ${formatAmount(burnAmount)} and withdraw to ${burnDestination}`}
              {activeTab === 'international' &&
                `Send ACBU ${formatAmount(intlAmount)} to ${intlCountry} (${intlCurrency})`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium text-foreground">
                {activeTab === 'mint' && `$${mintAmount}`}
                {activeTab === 'burn' && `ACBU ${formatAmount(burnAmount)}`}
                {activeTab === 'international' && `ACBU ${formatAmount(intlAmount)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Processing fee:</span>
              <span className="font-medium text-foreground">
                Calculated by backend
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel
              onClick={() => setStep("input")}
              disabled={submitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecute}
              disabled={submitting || isSubmitDisabled}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </div>
          {uiError && (
            <ApiErrorDisplay error={uiError} onDismiss={clearError} className="mt-2" />
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={step === "success"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Operation Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              The backend accepted your {activeTab} request.
              {lastResponse?.status &&
                ` Current status: ${lastResponse.status}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-foreground truncate max-w-[60%]">
                {lastTxId}
              </span>
            </div>
            {lastResponse && "fee" in lastResponse && lastResponse.fee && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee:</span>
                <span className="font-medium text-foreground">
                  {lastResponse.fee}
                </span>
              </div>
            )}
            {lastResponse &&
              "acbu_amount" in lastResponse &&
              lastResponse.acbu_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ACBU received:</span>
                  <span className="font-medium text-foreground">
                    ACBU {formatAmount(lastResponse.acbu_amount)}
                  </span>
                </div>
              )}
            {lastResponse &&
              "local_amount" in lastResponse &&
              lastResponse.local_amount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You'll receive:</span>
                  <span className="font-medium text-foreground">
                    {lastResponse.currency} {lastResponse.local_amount}
                  </span>
                </div>
              )}
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
