"use client";

import type { Metadata } from 'next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = {
  title: 'Mint & Burn | ACBU',
  description: 'Mint ACBU tokens by depositing fiat currency, or burn ACBU to withdraw to your bank account.',
};
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
import { SkeletonList } from '@/components/ui/skeleton-list';
import { BalanceSkeleton } from '@/components/ui/balance-skeleton';
import { ArrowDown, ArrowUp, ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import { useApiError } from '@/hooks/use-api-error';
import { ApiErrorDisplay } from '@/components/ui/api-error-display';
import { RetryErrorBlock } from '@/components/ui/retry-error-block';
import { useBalance } from '@/hooks/use-balance';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getWalletSecretAnyLocal } from '@/lib/wallet-storage';
import { ensureAcbuTrustlineClient } from '@/lib/stellar/trustlines';
import { useStellarWalletsKit } from '@/lib/stellar-wallets-kit';
import { submitBurnRedeemSingleClient } from '@/lib/stellar/burning';
import { Keypair } from '@stellar/stellar-sdk';
import { useRates } from '@/lib/api/rates';
import * as fiatApi from '@/lib/api/fiat';
import type { RatesResponse } from '@/types/api';
import { formatAmount } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useI18n } from '@/contexts/i18n-context';
import { useNavigationGuard } from '@/contexts/navigation-guard-context';

function formatRate(rate: number | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—';
  return rate.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** `acbu_*` from API = local currency units per 1 ACBU → ACBU = fiat / localPerAcbu. */
function estimateAcbuFromFiat(
  fiatAmount: string,
  currency: string,
  rates: RatesResponse | null,
): number | null {
  if (!rates || !currency || !fiatAmount) return null;
  const n = parseFloat(fiatAmount);
  if (!(n > 0)) return null;
  const key = `acbu_${currency.toLowerCase()}` as keyof RatesResponse;
  const raw = rates[key];
  if (raw == null || raw === "") return null;
  const localPerAcbu = parseFloat(String(raw));
  if (!(localPerAcbu > 0)) return null;
  return n / localPerAcbu;
}

/**
 * Mint and Burn page for ACBU tokens.
 */
export default function MintPage() {
  const opts = useApiOpts();
  const router = useRouter();
  const { userId, stellarAddress } = useAuth();
  const { t } = useI18n();
  const {
    balance,
    balanceSource,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance();
  const kit = useStellarWalletsKit();
  const { uiError: mintUiError, setApiError: setMintApiError, clearError: clearMintError, isSubmitDisabled: isMintDisabled } = useApiError();
  const { uiError: burnUiError, setApiError: setBurnApiError, clearError: clearBurnError, isSubmitDisabled: isBurnDisabled } = useApiError();
  const [activeTab, setActiveTab] = useState<'mint' | 'burn' | 'rates'>('mint');
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [burnAmount, setBurnAmount] = useState('');
  const [burnError, setBurnError] = useState('');
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [mintError, setMintError] = useState('');
  const [txId, setTxId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const { setHasUnsavedChanges } = useNavigationGuard();

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return (step === 'input' && (fiatAmount || burnAmount)) || step === 'confirm';
  }, [step, fiatAmount, burnAmount]);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    return () => setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);
  const [fiatAccounts, setFiatAccounts] = useState<fiatApi.FiatAccount[]>([]);
  const [fiatAccountsLoading, setFiatAccountsLoading] = useState(true);
  const [selectedFiatCurrency, setSelectedFiatCurrency] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const debouncedFiatAmount = useDebounce(fiatAmount, 300);
  const debouncedBurnAmount = useDebounce(burnAmount, 300);
  const [mintQuoteRates, setMintQuoteRates] = useState<RatesResponse | null>(null);
  const [mintAcbuReceived, setMintAcbuReceived] = useState<number | null>(null);

  const {
    data: mintQuoteRates,
    error: mintQuoteRatesError,
    refetch: refetchQuoteRates,
  } = useRates(opts);

  const {
    data: rates,
    loading: ratesLoading,
    error: ratesError,
    refetch: refetchRates,
  } = useRates(activeTab === 'rates' ? opts : undefined);
  const rateRows = Array.isArray((rates as { rates?: Array<{ currency?: string; rate?: number }> } | null)?.rates)
    ? ((rates as { rates?: Array<{ currency?: string; rate?: number }> }).rates ?? [])
    : [];

  const estimatedMintAcbu = useMemo(
    () => estimateAcbuFromFiat(fiatAmount, selectedFiatCurrency, mintQuoteRates),
    [fiatAmount, selectedFiatCurrency, mintQuoteRates],
  );

  useEffect(() => {
    fiatApi
      .getFiatAccounts(opts)
      .then((res) => {
        setFiatAccounts(res.accounts || []);
        if (res.accounts?.length > 0) {
          setSelectedFiatCurrency(res.accounts[0].currency);
        }
      })
      .catch((e) => logger.error('Failed to get fiat accounts', e))
      .finally(() => setFiatAccountsLoading(false));
  }, [opts.token]);

    useEffect(() => {
        if (activeTab !== "rates") return;
        setRatesLoading(true);
        ratesApi
            .getRates(opts)
            .then(setRates)
            .catch(() => setRates(null))
            .finally(() => setRatesLoading(false));
    }, [activeTab, opts.token]);

    const handleFiatCurrencyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFiatCurrency(e.target.value);
    }, []);

    const handleFiatAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFiatAmount(e.target.value);
    }, []);

    const handleBurnAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setBurnAmount(e.target.value);
    }, []);

    const handleMintConfirm = () => {
        clearMintError();
        setStep("confirm");
    };
    const handleBurnConfirm = () => {
        router.push(`/burn?amount=${burnAmount}&currency=${selectedFiatCurrency}`);
    };
    const handleExecuteMint = async () => {
        if (!fiatAmount || parseFloat(fiatAmount) <= 0 || !selectedFiatCurrency)
            return;
        clearMintError();
        setExecuting(true);
        try {
            // Default setup: make sure the recipient trusts the ACBU asset
            // before the backend tries to mint. Without this the minting
            // contract fails with "trustline entry is missing for account".
            // We add it client-side using the local wallet seed and then
            // wait for Horizon to confirm the trustline before calling the
            // backend — Soroban simulation reads the ledger's current state,
            // so an unconfirmed trustline would still fail the mint.
            if (!userId) {
                throw new Error(
                    "Not signed in — refresh and try again.",
                );
            }
            const secret = await getWalletSecretAnyLocal(userId, stellarAddress);

            let accountId: string;
            let trust:
              | Awaited<ReturnType<typeof ensureAcbuTrustlineClient>>
              | null = null;

            if (secret) {
              // Guard: the locally stored seed MUST derive to the public key the
              // backend treats as this user's Stellar account, otherwise we'd
              // keep adding trustlines to the wrong account forever while the
              // mint contract tries to deposit into the real recipient.
              accountId = Keypair.fromSecret(secret).publicKey();
              if (stellarAddress && accountId !== stellarAddress) {
                  throw new Error(
                      `Local wallet (${accountId.slice(0, 6)}…${accountId.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Re-import the correct seed from Settings, or update the wallet address, then retry.`,
                  );
              }
              trust = await ensureAcbuTrustlineClient({ userSecret: secret });
            } else {
              if (!kit) {
                throw new Error(
                  "Your wallet secret isn't available on this device and the wallet connector isn't ready yet. Please wait a moment and retry.",
                );
              }
              accountId = await new Promise<string>((resolve, reject) => {
                kit
                  .openModal({
                    onWalletSelected: async (selectedOption: { id: string }) => {
                      try {
                        kit.setWallet(selectedOption.id);
                        const { address } = await kit.getAddress();
                        resolve(address);
                      } catch (err) {
                        reject(err);
                      }
                    },
                  })
                  .catch(reject);
              });

              if (stellarAddress && accountId !== stellarAddress) {
                throw new Error(
                  `Connected wallet (${accountId.slice(0, 6)}…${accountId.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Connect the correct wallet (or update your linked wallet), then retry.`,
                );
              }

              trust = await ensureAcbuTrustlineClient({
                external: { kit, address: accountId },
              });
            }

            logger.info("[mint] ACBU trustline ensured", {
                account: accountId,
                added: trust?.added,
                visible: trust?.visible,
                txHash: trust?.txHash,
            });
            if (trust?.added && !trust.visible) {
                throw new Error(
                    "ACBU trustline was submitted but hasn't appeared on Horizon yet. Please retry the mint in a few seconds.",
                );
            }

            const res = await fiatApi.postOnRamp(
                fiatAmount,
                selectedFiatCurrency,
                opts,
            );
            setTxId(
                res.blockchain_tx_hash ||
                    res.transaction_id ||
                    res.transactionId ||
                    null,
            );
            const acbu =
                res.acbuAmount ??
                (typeof res.acbu_amount === "number" ? res.acbu_amount : undefined);
            setMintAcbuReceived(
                typeof acbu === "number" && Number.isFinite(acbu) ? acbu : null,
            );
            refetchBalance();
            setStep("success");
        } catch (e) {
            setMintApiError(e);
        } finally {
            setExecuting(false);
        }
    };
    const handleExecuteBurn = async () => {
        if (!burnAmount || parseFloat(burnAmount) <= 0 || !selectedFiatCurrency)
            return;
        clearBurnError();
        setExecuting(true);
        try {
            if (!userId) {
                throw new Error("Not signed in — refresh and try again.");
            }
            if (!stellarAddress) {
                throw new Error("No linked Stellar wallet address.");
            }
            const secret = await getWalletSecretAnyLocal(userId, stellarAddress);
            let burnTxHash: string;
            if (secret) {
                const localPubKey = Keypair.fromSecret(secret).publicKey();
                if (stellarAddress && localPubKey !== stellarAddress) {
                    throw new Error(
                        `Local wallet (${localPubKey.slice(0, 6)}…${localPubKey.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Re-import the correct seed from Settings, or update the wallet address, then retry.`,
                    );
                }
                const submit = await submitBurnRedeemSingleClient({
                    userAddress: stellarAddress,
                    amountAcbu: burnAmount,
                    currency: selectedFiatCurrency,
                    userSecret: secret,
                });
                burnTxHash = submit.transactionHash;
            } else {
                if (!kit) {
                    throw new Error(
                        "Your wallet secret isn't available on this device and the wallet connector isn't ready yet. Please wait a moment and retry.",
                    );
                }
                const address = await new Promise<string>((resolve, reject) => {
                    kit
                        .openModal({
                            onWalletSelected: async (selectedOption: { id: string }) => {
                                try {
                                    kit.setWallet(selectedOption.id);
                                    const { address } = await kit.getAddress();
                                    resolve(address);
                                } catch (err) {
                                    reject(err);
                                }
                            },
                        })
                        .catch(reject);
                });
                if (stellarAddress && address !== stellarAddress) {
                    throw new Error(
                        `Connected wallet (${address.slice(0, 6)}…${address.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Connect the correct wallet (or update your linked wallet), then retry.`,
                    );
                }
                const submit = await submitBurnRedeemSingleClient({
                    userAddress: stellarAddress,
                    amountAcbu: burnAmount,
                    currency: selectedFiatCurrency,
                    external: { kit, address },
                });
                burnTxHash = submit.transactionHash;
            }
            const res = await fiatApi.postOffRamp(
                burnAmount,
                selectedFiatCurrency,
                burnTxHash,
                opts,
            );
            setTxId(res.transaction_id || res.transactionId || null);
            setStep("success");
        } catch (e) {
            setBurnApiError(e);
        } finally {
            setExecuting(false);
        }
    };
    const handleExecute = async () => {
        // Burn is handled by deep-linking to /burn — only mint uses this dialog.
        if (activeTab === "mint") {
            await handleExecuteMint();
        }
    };
    const resetForm = () => {
        setStep("input");
        setFiatAmount("");
        setBurnAmount("");
        clearBurnError();
        clearMintError();
        setTxId(null);
        setMintAcbuReceived(null);
    };

  return (
    <>
      <header className="page-header">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-muted rounded transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="page-title">{t('mint.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('mint.subtitle')}</p>
          </div>
        </div>
      </header>

            <PageContainer>
                <div className="mb-6">
                    <Card className="border-border bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
                        <p className="text-sm font-medium opacity-90">
                            {t('mint.acbuBalance')}
                        </p>
                        {balanceLoading ? (
                            <BalanceSkeleton variant="compact" className="mb-2 opacity-60" />
                        ) : (
                            <p className="text-3xl font-bold mb-2">
                                ACBU {formatAmount(balance)}
                            </p>
                        )}
                        <p className="text-xs opacity-75">
                            {balanceSource === "stellar"
                                ? t('mint.balanceFromHorizon')
                                : t('mint.linkWallet')}
                        </p>
                        {balanceError && (
                          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                            <p className="font-medium">{balanceError}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={refetchBalance}
                            >
                              Retry
                            </Button>
                          </div>
                        )}
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
                            {t('mint.mint')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="burn"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            {t('mint.burn')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="rates"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                        >
                            {t('mint.rates')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="mint" className="py-6 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                {t('mint.mintDescription')}
                            </p>
                            {mintUiError && (
                                <ApiErrorDisplay error={mintUiError} onDismiss={clearMintError} className="mb-2" />
                            )}
                            <div>
                                <label
                                    htmlFor="fiat-account"
                                    className="form-label"
                                >
                                    {t('mint.basketCurrency')}
                                </label>
                                {fiatAccountsLoading ? (
                                    <SkeletonList count={1} itemHeight="h-10" />
                                ) : (
                                <select
                                    id="fiat-account"
                                    value={selectedFiatCurrency}
                                    onChange={(e) => setSelectedFiatCurrency(e.target.value)}
                                    autoComplete="transaction-currency"
                                    onChange={handleFiatCurrencyChange}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                                >
                                    {fiatAccounts.length === 0 ? (
                                        <option value="" disabled>No currencies available</option>
                                    ) : (
                                        fiatAccounts.map(acc => (
                                            <option key={acc.id} value={acc.currency}>
                                                {acc.currency} — {acc.bank_name}
                                            </option>
                                        ))
                                    )}
                                </select>
                                )}
                            </div>
                            <div className="mt-4">
                                <label
                                    htmlFor="fiat-amount"
                                    className="form-label"
                                >
                                    {t('mint.amountToExchange')}
                                </label>
                                <div className="flex gap-2">
                                    <span className="flex items-center text-muted-foreground font-medium">
                                        {selectedFiatCurrency || "FIAT"}
                                    </span>
                                    <Input
                                        id="fiat-amount"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        min="0"
                                        step="any"
                                        autoComplete="transaction-amount"
                                        value={fiatAmount}
                                        onChange={handleFiatAmountChange}
                                        className="border-border text-lg font-semibold"
                                    />
                                </div>
                            </div>
                            {estimatedMintAcbu != null && (
                                <Card className="border-border bg-muted/80 p-3 mt-3">
                                    <p className="text-xs text-muted-foreground mb-1 break-words">
                                        Estimated ACBU (from latest rates)
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        {t('mint.estimatedAcbu')}
                                    </p>
                                    <p className="text-lg font-semibold text-foreground">
                                        ≈ {formatAmount(estimatedMintAcbu)} ACBU
                                    </p>
                                </Card>
                            )}
                            {mintQuoteRatesError && (
                              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive mt-3">
                                <p className="font-medium">{mintQuoteRatesError}</p>
                                <div className="mt-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={refetchQuoteRates}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              </div>
                            )}
                            <Card className="border-border bg-muted p-3 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('mint.networkFee')}
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {t('mint.estimatedAtConfirmation')}
                                    </span>
                                </div>
                            </Card>
                            <Button
                                onClick={handleMintConfirm}
                                disabled={
                                    !fiatAmount ||
                                    parseFloat(fiatAmount) <= 0 ||
                                    !selectedFiatCurrency
                                }
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                            >
                                <ArrowDown className="w-4 h-4 mr-2" />
                                {t('mint.mintAcbu')}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="burn" className="py-6 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                {t('mint.burnDescription')}
                            </p>
                            {burnUiError && (
                                <ApiErrorDisplay error={burnUiError} onDismiss={clearBurnError} className="mb-2" />
                            )}
                            <div>
                                <label
                                    htmlFor="burn-fiat-account"
                                    className="form-label"
                                >
                                    {t('mint.basketCurrency')}
                                </label>
                                {fiatAccountsLoading ? (
                                    <SkeletonList count={1} itemHeight="h-10" />
                                ) : (
                                <select
                                    id="burn-fiat-account"
                                    value={selectedFiatCurrency}
                                    onChange={(e) => setSelectedFiatCurrency(e.target.value)}
                                    autoComplete="transaction-currency"
                                    onChange={handleFiatCurrencyChange}
                                    className="w-full px-3 py-2 border border-border rounded-lg text-sm font-medium bg-background"
                                >
                                    {fiatAccounts.length === 0 ? (
                                        <option value="" disabled>No currencies available</option>
                                    ) : (
                                        fiatAccounts.map(acc => (
                                            <option key={acc.id} value={acc.currency}>
                                                {acc.currency} — {acc.bank_name}
                                            </option>
                                        ))
                                    )}
                                </select>
                                )}
                            </div>
                            <div className="mt-4">
                                <label
                                    htmlFor="burn-amount"
                                    className="form-label"
                                >
                                    {t('mint.amountToBurn')}
                                </label>
                                <div className="flex gap-2">
                                    <span className="flex items-center text-muted-foreground font-medium">
                                        ACBU
                                    </span>
                                    <Input
                                        id="burn-amount"
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        autoComplete="transaction-amount"
                                        value={burnAmount}
                                        onChange={handleBurnAmountChange}
                                        className="border-border text-lg font-semibold"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {t('mint.available')}: ACBU{" "}
                                    {balanceLoading ? <span className="inline-block h-3 w-16 bg-accent animate-pulse rounded align-middle" /> : formatAmount(balance)}
                                </p>
                            </div>
                            <Card className="border-border bg-muted p-3 mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">
                                        {t('mint.youWillReceive')}
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {burnAmount && selectedFiatCurrency
                                            ? `~ ${selectedFiatCurrency} (based on current rate)`
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {t('mint.processingFee')}
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {t('mint.estimatedAtConfirmation')}
                                    </span>
                                </div>
                            </Card>
                            <Button
                                onClick={handleBurnConfirm}
                                disabled={
                                    !burnAmount ||
                                    parseFloat(burnAmount) <= 0 ||
                                    !selectedFiatCurrency
                                }
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                            >
                                <ArrowUp className="w-4 h-4 mr-2" />
                                Burn & Redeem
                                {t('mint.continueToBurn')}
                            </Button>
                        </div>
                    </TabsContent>

          <TabsContent value="rates" className="py-6 space-y-4">
            <div className="space-y-3">
              {ratesError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <p className="font-medium">{ratesError}</p>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={refetchRates}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              {ratesLoading ? (
                <SkeletonList count={3} itemHeight="h-16" />
              ) : rateRows.length ? (
                rateRows.map((r) => (
                  <Card key={r.currency} className="border-border p-4">
                    <div className="flex justify-between">
                      <p className="font-semibold text-foreground">ACBU/{r.currency}</p>
                      <p className="text-lg font-bold text-primary">{formatRate(r.rate)}</p>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="border-border p-4"><p className="text-muted-foreground">No rates available.</p></Card>
              )}
              <Card className="border-border bg-muted p-4 mt-6"><p className="text-sm font-semibold text-foreground mb-2">{t('mint.howItWorks')}</p><ul className="text-xs text-muted-foreground space-y-2"><li>• {t('mint.howItWorks1')}</li><li>• {t('mint.howItWorks2')}</li><li>• {t('mint.howItWorks3')}</li></ul></Card>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>

            <AlertDialog open={step === "confirm"}>
                <AlertDialogContent className="max-w-md border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {activeTab === "mint"
                                ? t('mint.confirmMint')
                                : t('mint.confirmBurn')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {activeTab === "mint" &&
                                t('mint.mintConfirmDescription', {
                                    currency: selectedFiatCurrency,
                                    amount: formatAmount(fiatAmount),
                                    estimate: estimatedMintAcbu != null
                                        ? ` (≈ ${formatAmount(estimatedMintAcbu)} ACBU at current rates)`
                                        : '',
                                })}
                            {activeTab === "burn" &&
                                t('mint.burnConfirmDescription', { amount: formatAmount(burnAmount) })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {t('mint.amount')}:
                            </span>
                            <span className="font-medium text-foreground">
                                {activeTab === "mint"
                                    ? `${selectedFiatCurrency} ${fiatAmount}`
                                    : `ACBU ${formatAmount(burnAmount)}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <AlertDialogCancel
                            onClick={() => setStep("input")}
                            disabled={executing}
                        >
                            {t('mint.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleExecute}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={executing || (activeTab === 'mint' ? isMintDisabled : isBurnDisabled)}
                        >
                            {executing ? t('mint.processing') : t('mint.confirm')}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={step === "success"}>
                <AlertDialogContent className="max-w-md border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('mint.operationComplete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('mint.operationSubmitted', { operation: activeTab })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {t('mint.transactionId')}: {txId ?? "—"}
                        </p>
                        {activeTab === "mint" && mintAcbuReceived != null && (
                            <p className="text-sm font-medium text-foreground">
                                {t('mint.acbuCredited', { amount: formatAmount(mintAcbuReceived) })}
                            </p>
                        )}
                        {activeTab === "mint" && (
                            <p className="text-xs text-muted-foreground">
                                {t('mint.mintDisclaimer')}
                            </p>
                        )}
                    </div>
                    <AlertDialogAction
                        onClick={resetForm}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {t('mint.done')}
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
