"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ApiErrorDisplay } from "@/components/ui/api-error-display";
import { Plus, Check, AlertCircle, ArrowRight } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import { useApiError } from "@/hooks/use-api-error";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/i18n-context";
import { useBalance } from "@/hooks/use-balance";
import { RetryErrorBlock } from "@/components/ui/retry-error-block";
import { useAuth } from "@/contexts/auth-context";
import * as transfersApi from "@/lib/api/transfers";
import * as userApi from "@/lib/api/user";
import type { TransferItem, ContactItem } from "@/types/api";
import { formatAmount, parseUtcDate } from "@/lib/utils";
import { getWalletSecretAnyLocal } from "@/lib/wallet-storage";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import {
  looksLikeStellarAddress,
  submitAcbuPaymentClient,
} from "@/lib/stellar/payments";
import { Keypair } from "@stellar/stellar-sdk";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";

function formatDate(iso: string) {
  const d = parseUtcDate(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "pending":
      return "text-amber-600";
    default:
      return "text-gray-600";
  }
}

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "completed":
      return "border-green-600 text-green-600";
    case "pending":
      return "border-amber-600 text-amber-600";
    default:
      return "border-gray-600 text-gray-600";
  }
}

/**
 * Page component for sending ACBU tokens.
 */
export default function SendPage() {
  const opts = useApiOpts();
  const { userId, stellarAddress } = useAuth();
  const { ensureSession } = useSessionGuard();
  const kit = useStellarWalletsKit();
  const { toast } = useToast();
  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance();
  const { uiError, setApiError, clearError, isSubmitDisabled } = useApiError();
  const [activeTab, setActiveTab] = useState("send");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmedAmount, setConfirmedAmount] = useState("");
  const [lastSentAmount, setLastSentAmount] = useState("");
  const [note, setNote] = useState("");
  const [customRecipient, setCustomRecipient] = useState("");
  const [useContact, setUseContact] = useState(true);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [transfersError, setTransfersError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");

  const virtualizedContacts = useMemo(() => {
    return contacts.map((c) => (
      <SelectItem key={c.id} value={c.id}>
        {c.alias ?? c.pay_uri ?? c.id}
      </SelectItem>
    ));
  }, [contacts]);

  const loadTransfers = useCallback(async () => {
    setLoadError("");
    try {
      const data = await transfersApi.getTransfers(opts);
      setTransfers(data.transfers ?? []);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load transfers");
    } finally {
      setLoadingTransfers(false);
    }
  }, [opts]);

  const loadContacts = useCallback(async () => {
    setLoadError("");
    try {
      const data = await userApi.getContacts(opts);
      setContacts(data.contacts ?? []);
      setContactsError("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load contacts";
      setContactsError(message);
      setLoadError(message);
    } finally {
      setLoadingContacts(false);
    }
  }, [opts]);

  useEffect(() => {
    loadTransfers();
    loadContacts();
  }, [loadTransfers, loadContacts, opts.token]);

  const handleShowSendDialog = useCallback(() => setShowSendDialog(true), []);
  const handleSendDialogChange = useCallback((open: boolean) => setShowSendDialog(open), []);
  const handleConfirmDialogChange = useCallback((open: boolean) => {
    if (!open && !sending) {
      setConfirmedAmount("");
    }
    setShowConfirmDialog(open);
  }, [sending]);
  const handleSuccessDialogChange = useCallback((open: boolean) => setShowSuccessDialog(open), []);
  const handleTabChange = useCallback((value: string) => setActiveTab(value), []);
  const handleUseContactChange = useCallback((v: string) => setUseContact(v === "contact"), []);
  const handleContactSelect = useCallback((id: string) => {
    const c = contacts.find((x: ContactItem) => x.id === id);
    if (c) setSelectedContact(c);
  }, [contacts]);
  const handleCustomRecipientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCustomRecipient(e.target.value), []);
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d*$/.test(v)) {
      setAmount(v);
    }
  }, []);
  const debouncedAmount = useDebounce(amount, 300);
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value), []);
  const handleSendDialogClose = useCallback(() => setShowSendDialog(false), []);
  const handleShowConfirmDialog = useCallback(() => {
    setConfirmedAmount(amount);
    setShowConfirmDialog(true);
  }, [amount]);

  const getToValue = useCallback(() =>
    useContact && selectedContact
      ? selectedContact.pay_uri || selectedContact.alias || selectedContact.id
      : customRecipient.trim(),
    [useContact, selectedContact, customRecipient]
  );

  const handleConfirmTransfer = useCallback(async () => {
    const to = getToValue();
    if (!confirmedAmount || parseFloat(confirmedAmount) <= 0 || !to) return;
    setSubmitError("");
    setSending(true);

    // Pre-flight session check: validate the session is still active before
    // making a write request (fixes #313 — silent 401 after session expiry).
    const sessionOk = await ensureSession();
    if (!sessionOk) {
      setSending(false);
      return;
    }
    
    try {
      let blockchainTxHash: string | undefined;

      if (looksLikeStellarAddress(to)) {
        if (!userId) throw new Error("Not logged in");
        
        const secret = await getWalletSecretAnyLocal(userId, stellarAddress);
        
        if (secret) {
          const sourceAddress = Keypair.fromSecret(secret).publicKey();
          if (stellarAddress && sourceAddress !== stellarAddress) {
            throw new Error(
              `Local wallet (${sourceAddress.slice(0, 6)}…${sourceAddress.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Re-import the correct seed from Settings, or update the wallet address, then retry.`,
            );
          }
          const submit = await submitAcbuPaymentClient({
            destination: to,
            amount: confirmedAmount,
            userSecret: secret,
          });
          blockchainTxHash = submit.transactionHash;
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
          const submit = await submitAcbuPaymentClient({
            destination: to,
            amount: confirmedAmount,
            external: { kit, address },
          });
          blockchainTxHash = submit.transactionHash;
        }
      }

      await transfersApi.createTransfer(
        { to, amount_acbu: confirmedAmount, note, ...(blockchainTxHash ? { blockchain_tx_hash: blockchainTxHash } : {}) },
        opts,
      );
      
      loadTransfers();
      refetchBalance();
      setShowConfirmDialog(false);
      setShowSendDialog(false);
      setLastSentAmount(confirmedAmount);
      setShowSuccessDialog(true);
      
      setTimeout(() => {
        setShowSuccessDialog(false);
        setAmount("");
        setConfirmedAmount("");
        setNote("");
        setCustomRecipient("");
        setSelectedContact(null);
      }, 2500);
      
    } catch (e) {
      setApiError(e);
    } finally {
      setSending(false);
    }
  }, [confirmedAmount, getToValue, note, userId, stellarAddress, kit, opts, loadTransfers, refreshBalance]);

  const exceedsBalance =
    balance !== null && amount !== "" && parseFloat(amount) > balance;

  const isValid = useMemo(() => {
    return amount &&
      parseFloat(amount) > 0 &&
      !exceedsBalance &&
      ((useContact && selectedContact) || (!useContact && customRecipient.trim()));
  }, [amount, exceedsBalance, useContact, selectedContact, customRecipient]);

  const transfersList = useMemo(() => {
    if (loadingTransfers) {
      return <SkeletonList count={2} itemHeight="h-14" />;
    }
    if (transfers.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('send.noTransfersYet')}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {transfers.map((t: TransferItem) => (
          <Link
            key={t.transaction_id}
            href={`/send/${t.transaction_id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors active:bg-muted"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate" title={t('send.transferLabel')}>
                {t('send.transferLabel')}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(t.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">
                ACBU {formatAmount(t.amount_acbu)}
              </p>
              <Badge
                variant="outline"
                className={`mt-1 text-xs ${getStatusColor(t.status)}`}
              >
                {t.status === "completed" && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                {t.status === "pending" && (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : t('common.unknown')}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    );
  }, [transfers, loadingTransfers]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="page-title mb-3">
            {t('send.title')}
          </h1>
          <TabsList className="bg-muted inline-flex h-10 items-center justify-start rounded-lg p-1 text-muted-foreground">
            <TabsTrigger value="send" className="px-4 py-1.5 rounded-md font-medium text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              {t('send.send')}
            </TabsTrigger>
            <TabsTrigger value="history" className="px-4 py-1.5 rounded-md font-medium text-sm transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              {t('send.history')}
            </TabsTrigger>
          </TabsList>
        </div>
      </header>

      <div className="px-4 py-4">
        {loadError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="font-medium">{loadError}</p>
          </div>
        )}

        <TabsContent value="send" className="space-y-4 outline-none mt-0">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setShowSendDialog(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto flex-col py-4"
            >
              <Plus className="mb-2 h-5 w-5" />
              <span>{t('send.newTransfer')}</span>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-border hover:bg-muted h-auto flex-col py-4 bg-transparent w-full"
            >
              <Link href="/me/settings/contacts">
                <Plus className="mb-2 h-5 w-5" />
                <span>{t('send.addContact')}</span>
              </Link>
            </Button>
          </div>
        </TabsContent>

          <TabsContent 
            value="history" 
            id="panel-history"
            role="tabpanel"
            aria-labelledby="tab-history"
            className="space-y-3"
          >
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Recent Transfers
              </h3>
              {loadingTransfers ? (
                <SkeletonList count={2} itemHeight="h-14" />
              ) : transfers.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">No transfers yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transfers.map((t: TransferItem) => (
                    <Link
                      key={t.transaction_id}
                      href={`/send/${t.transaction_id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors active:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label={`Transfer of ${t.amount_acbu} ACBU, status ${t.status}, created ${formatDate(t.created_at)}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate" title="Transfer">
                          Transfer
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          ACBU {formatAmount(t.amount_acbu)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs ${getStatusBadgeClassName(t.status)}`}
                        >
                          {t.status === "completed" && (
                            <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                          )}
                          {t.status === "pending" && (
                            <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                          )}
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader>
            <DialogTitle>{t('send.title')}</DialogTitle>
            <DialogDescription>{t('send.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">{t('send.recipient')}</Label>
              <Tabs
                value={useContact ? "contact" : "custom"}
                onValueChange={(v) => setUseContact(v === "contact")}
              >
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="contact">{t('send.fromContacts')}</TabsTrigger>
                  <TabsTrigger value="custom">{t('send.newAddress')}</TabsTrigger>
                </TabsList>
                <TabsContent value="contact" className="mt-3">
                  {loadingContacts ? (
                    <SkeletonList count={3} itemHeight="h-9" />
                  ) : (
                  <Select
                    value={selectedContact?.id || ""}
                    onValueChange={handleContactChange}
                  >
                    <SelectTrigger className="border-border">
                      <SelectValue placeholder={t('send.selectContact')} />
                    </SelectTrigger>
                    <SelectContent>
                      {virtualizedContacts}
                    </SelectContent>
                  </Select>
                  )}
                </TabsContent>
                <TabsContent value="custom" className="mt-3">
                  <Input
                    placeholder={t('send.walletAddressOrEmail')}
                    value={customRecipient}
                  onChange={handleCustomRecipientChange}
                    className="border-border"
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t('send.amount')}</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground font-medium">
                  ACBU
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  min={0}
                  value={amount}
                  onChange={handleAmountChange}
                  className="border-border text-lg font-semibold"
                />
              </div>
              {exceedsBalance && <p className="text-xs text-destructive">{t('send.insufficientBalance')}</p>}
              <p className="text-xs text-muted-foreground">
                {t('send.available')}: ACBU {balanceLoading ? <span className="inline-block h-3 w-16 bg-accent animate-pulse rounded align-middle" /> : formatAmount(balance)}
              </p>
              <RetryErrorBlock
                message={balanceError}
                onRetry={refetchBalance}
                className="mt-2 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t('send.note')}</Label>
              <Input
                placeholder={t('send.addMessage')}
                value={note}
                onChange={handleNoteChange}
                className="border-border"
              />
            </div>

            <Card className="border-border bg-muted p-3">
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('send.networkFee')}</span>
                  <span className="font-medium text-foreground">{t('send.free')}</span>
              </div>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
                className="flex-1 border-border"
                disabled={sending}
              >
                {t('send.cancel')}
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!isFormValid()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('send.continue')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={handleConfirmDialogOpenChange}>
        <AlertDialogContent className="max-w-md border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('send.confirmTransfer')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('send.reviewDetails')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {uiError && (
              <ApiErrorDisplay error={uiError} onDismiss={clearError} />
            )}
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">{t('send.to')}</p>
              <p className="font-semibold text-foreground truncate" title={selectedContact?.alias || selectedContact?.pay_uri || customRecipient || "—"}>
                {selectedContact?.alias ||
                  selectedContact?.pay_uri ||
                  customRecipient ||
                  "—"}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-secondary p-2">
                <ArrowRight className="h-5 w-5 text-secondary-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">{t('send.amountLabel')}</p>
              <p className="text-2xl font-bold text-foreground" data-testid="confirm-amount">
                ACBU {formatAmount(confirmedAmount)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('send.networkFeeLabel')}: {t('send.free')}
              </p>
            </div>
            {note && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs text-muted-foreground">{t('send.noteLabel')}</p>
                <p className="text-sm text-foreground break-words">{note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel 
              className="flex-1 border-border" 
              disabled={sending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTransfer} 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" 
              disabled={sending || !confirmedAmount}
            >
              {sending ? "Sending..." : `Send ACBU ${confirmedAmount}`}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md border-border">
          <div className="flex flex-col items-center text-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t('send.transferSent')}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('send.transferSentDescription', { amount: formatAmount(lastSentAmount) })}
            </p>
            <Badge variant="secondary" className="mb-4">
              {t('send.pending')}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
