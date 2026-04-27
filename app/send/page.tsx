"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Plus, Check, AlertCircle, ArrowRight } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import { useBalance } from "@/hooks/use-balance";
import { useAuth } from "@/contexts/auth-context";
import * as transfersApi from "@/lib/api/transfers";
import * as userApi from "@/lib/api/user";
import type { TransferItem, ContactItem } from "@/types/api";
import { formatAmount } from "@/lib/utils";
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

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

/**
 * Page component for sending ACBU tokens.
 */
export default function SendPage() {
  const opts = useApiOpts();
  const { userId, stellarAddress } = useAuth();
  const kit = useStellarWalletsKit();
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance();
  const [activeTab, setActiveTab] = useState("send");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [lastSentAmount, setLastSentAmount] = useState("");
  const [note, setNote] = useState("");
  const [customRecipient, setCustomRecipient] = useState("");
  const [useContact, setUseContact] = useState(true);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadTransfers = useCallback(() => {
    setLoadError("");
    transfersApi.getTransfers(opts).then((data) => {
      setTransfers(data.transfers ?? []);
      setLoadError("");
    }).catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load transfers')).finally(() => setLoadingTransfers(false));
  }, [opts]);

  const loadContacts = useCallback(() => {
    setLoadError("");
    userApi.getContacts(opts).then((data) => {
      setContacts(data.contacts ?? []);
      setLoadError("");
    }).catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load contacts')).finally(() => setLoadingContacts(false));
  }, [opts]);

  useEffect(() => {
    loadTransfers();
    loadContacts();
  }, [loadTransfers, loadContacts, opts.token]);

  const getToValue = () =>
    useContact && selectedContact
      ? selectedContact.pay_uri || selectedContact.alias || selectedContact.id
      : customRecipient.trim();

  const handleConfirmTransfer = async () => {
    const to = getToValue();
    if (!amount || parseFloat(amount) <= 0 || !to) return;
    setSubmitError("");
    setSending(true);
    try {
      let blockchainTxHash: string | undefined;

      // Client-signed path for direct Stellar addresses.
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
            amount,
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
            amount,
            external: { kit, address },
          });
          blockchainTxHash = submit.transactionHash;
        }
      }

      await transfersApi.createTransfer(
        { to, amount_acbu: amount, note, ...(blockchainTxHash ? { blockchain_tx_hash: blockchainTxHash } : {}) },
        opts,
      );
      loadTransfers();
      refreshBalance();
      setShowConfirmDialog(false);
      setShowSendDialog(false);
      setLastSentAmount(amount);
      setShowSuccessDialog(true);
      setTimeout(() => {
        setShowSuccessDialog(false);
        setAmount("");
        setNote("");
        setCustomRecipient("");
        setSelectedContact(null);
      }, 2500);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case "completed":
        return "border-[var(--color-status-success-border)] bg-[var(--color-status-success)] text-[var(--color-status-success-foreground)]";
      case "pending":
        return "border-[var(--color-status-warning-border)] bg-[var(--color-status-warning)] text-[var(--color-status-warning-foreground)]";
      case "failed":
        return "border-destructive/40 bg-destructive/15 text-destructive";
      default:
        return "border-[var(--color-status-neutral-border)] bg-[var(--color-status-neutral)] text-[var(--color-status-neutral-foreground)]";
    }
  };

  const exceedsBalance =
    balance !== null && amount !== "" && parseFloat(amount) > balance;

  const isFormValid = () =>
    amount &&
    parseFloat(amount) > 0 &&
    !exceedsBalance &&
    ((useContact && selectedContact) ||
      (!useContact && customRecipient.trim()));

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground mb-3">
            Send Money
          </h1>
          <div className="flex gap-2" role="tablist" aria-label="Send money options">
            <button
              id="tab-send"
              role="tab"
              aria-selected={activeTab === "send"}
              aria-controls="panel-send"
              onClick={() => setActiveTab("send")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                activeTab === "send" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Send
            </button>
            <button
              id="tab-history"
              role="tab"
              aria-selected={activeTab === "history"}
              aria-controls="panel-history"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                activeTab === "history" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              History
            </button>
          </div>
        </div>
      </header>
      
      <div className="px-4 py-4">
        {loadError && (
          <div 
            className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="font-medium">{loadError}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsContent 
            value="send" 
            id="panel-send"
            role="tabpanel"
            aria-labelledby="tab-send"
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => setShowSendDialog(true)} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto flex-col py-4"
                aria-label="Create new transfer"
              >
                <Plus className="mb-2 h-5 w-5" aria-hidden="true" />
                <span>New Transfer</span>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                className="border-border hover:bg-muted h-auto flex-col py-4 bg-transparent w-full"
              >
                <Link href="/me/settings/contacts" aria-label="Add new contact">
                  <Plus className="mb-2 h-5 w-5" aria-hidden="true" />
                  <span>Add Contact</span>
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
                  <p className="text-sm text-muted-foreground">
                    No transfers yet
                  </p>
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
                        <p className="font-medium text-foreground truncate">
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
        </Tabs>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent 
          className="max-w-md border-border"
          aria-labelledby="send-dialog-title"
          aria-describedby="send-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="send-dialog-title">Send Money</DialogTitle>
            <DialogDescription id="send-dialog-description">
              Transfer ACBU securely to another wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-type" className="text-foreground">
                Recipient
              </Label>
              <Tabs
                value={useContact ? "contact" : "custom"}
                onValueChange={(v) => setUseContact(v === "contact")}
              >
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="contact">From Contacts</TabsTrigger>
                  <TabsTrigger value="custom">New Address</TabsTrigger>
                </TabsList>
                <TabsContent value="contact" className="mt-3">
                  <Select
                    value={selectedContact?.id || ""}
                    onValueChange={(id: string) => {
                      const c = contacts.find((x: ContactItem) => x.id === id);
                      if (c) setSelectedContact(c);
                    }}
                  >
                    <SelectTrigger 
                      className="border-border"
                      id="contact-select"
                      aria-label="Select a contact"
                    >
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c: ContactItem) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.alias ?? c.pay_uri ?? c.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="custom">
                  <Input
                    id="custom-recipient"
                    name="custom-recipient"
                    placeholder="Wallet address or email"
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className="border-border"
                    aria-describedby="recipient-hint"
                  />
                  <p id="recipient-hint" className="text-xs text-muted-foreground mt-1">
                    Enter a Stellar address or email address
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-input" className="text-foreground">
                Amount
              </Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground font-medium">
                  ACBU
                </span>
                <Input
                  id="amount-input"
                  name="amount"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || parseFloat(v) >= 0) setAmount(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "E")
                      e.preventDefault();
                  }}
                  className="border-border text-lg font-semibold"
                  aria-describedby={exceedsBalance ? "amount-error amount-hint" : "amount-hint"}
                  aria-invalid={exceedsBalance}
                />
              </div>
              {exceedsBalance && (
                <p id="amount-error" className="text-xs text-destructive" role="alert">
                  Insufficient balance.
                </p>
              )}
              <p id="amount-hint" className="text-xs text-muted-foreground">
                Available: ACBU {balanceLoading ? '...' : formatAmount(balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-input" className="text-foreground">
                Note (Optional)
              </Label>
              <Input
                id="note-input"
                name="note"
                placeholder="Add a message..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border-border"
                aria-describedby="note-hint"
              />
              <p id="note-hint" className="text-xs text-muted-foreground">
                Add an optional note to this transfer
              </p>
            </div>

            <Card className="border-border bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium text-foreground">Free</span>
              </div>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
                className="flex-1 border-border"
                aria-label="Cancel transfer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!isFormValid()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Continue to confirmation"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent 
          className="max-w-md border-border"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle id="confirm-dialog-title">Confirm Transfer</AlertDialogTitle>
            <AlertDialogDescription id="confirm-dialog-description">
              Review the details before confirming
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-semibold text-foreground truncate">
                {selectedContact?.alias ||
                  selectedContact?.pay_uri ||
                  customRecipient ||
                  "—"}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-secondary p-2">
                <ArrowRight className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted p-4">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-foreground">
                ACBU {formatAmount(amount)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Network Fee: Free
              </p>
            </div>
            {note && (
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs text-muted-foreground">Note</p>
                <p className="text-sm text-foreground break-words">{note}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel 
              className="flex-1 border-border" 
              disabled={sending}
              aria-label="Cancel transfer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTransfer} 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" 
              disabled={sending}
              aria-label={sending ? 'Sending transfer' : `Confirm sending ${amount} ACBU`}
            >
              {sending ? 'Sending...' : `Send ACBU ${amount}`}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md border-border">
          <div className="flex flex-col items-center text-center py-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-300" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Transfer Sent!
            </h2>
            <p className="text-muted-foreground mb-4">
              Your transfer for ACBU {formatAmount(lastSentAmount)}{" "}
              is being processed.
            </p>
            <Badge
              variant="outline"
              className={`mb-4 ${getStatusBadgeClassName("pending")}`}
            >
              Pending
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}