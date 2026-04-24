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
import { formatAcbu, formatAmount } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
  const [transfersError, setTransfersError] = useState("");
  const [contactsError, setContactsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [sending, setSending] = useState(false);

  const loadTransfers = useCallback(() => {
    setLoadingTransfers(true);
    setTransfersError("");
    transfersApi.getTransfers(opts).then((data) => {
      setTransfers(data.transfers ?? []);
      setTransfersError("");
    }).catch((e) => {
      const message = e instanceof Error ? e.message : "Failed to load transfers";
      setTransfersError(message);
      toast({
        title: "Could not load transfers",
        description: message,
        variant: "destructive",
      });
    }).finally(() => setLoadingTransfers(false));
  }, [opts, toast]);

  const loadContacts = useCallback(() => {
    setLoadingContacts(true);
    setContactsError("");
    userApi.getContacts(opts).then((data) => {
      setContacts(data.contacts ?? []);
      setContactsError("");
    }).catch((e) => {
      const message = e instanceof Error ? e.message : "Failed to load contacts";
      setContactsError(message);
      toast({
        title: "Could not load contacts",
        description: message,
        variant: "destructive",
      });
    }).finally(() => setLoadingContacts(false));
  }, [opts, toast]);

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
    case "pending":
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "failed":
      return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
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
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab("send")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "send" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                            Send
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === "history" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </header>
        <div className="px-4 py-4">
                  {(transfersError || contactsError) && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Some send data could not be loaded.</p>
                        <p className="text-xs text-destructive/80">
                          Retry the affected section to continue.
                        </p>
                      </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsContent value="send" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setShowSendDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto flex-col py-4">
                <Plus className="mb-2 h-5 w-5" /><span>New Transfer</span>
              </Button>
              <Button asChild variant="outline" className="border-border hover:bg-muted h-auto flex-col py-4 bg-transparent w-full">
                <Link href="/me/settings/contacts">
                  <Plus className="mb-2 h-5 w-5" /><span>Add Contact</span>
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Recent Transfers
              </h3>
              {loadingTransfers ? (
                <SkeletonList count={2} itemHeight="h-14" />
              ) : transfersError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">{transfersError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={loadTransfers}
                  >
                    Retry transfers
                  </Button>
                </div>
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
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors active:bg-muted"
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
                          ACBU {formatAcbu(t.amount_acbu)}
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
        <DialogContent className="max-w-md border-border">
          <DialogHeader><DialogTitle>Send Money</DialogTitle><DialogDescription>Transfer ACBU securely to another wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Recipient</Label>
              <Tabs
                value={useContact ? "contact" : "custom"}
                onValueChange={(v) => setUseContact(v === "contact")}
              >
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="contact">From Contacts</TabsTrigger>
                  <TabsTrigger value="custom">New Address</TabsTrigger>
                </TabsList>
                <TabsContent value="contact" className="mt-3">
                  {loadingContacts ? (
                    <SkeletonList count={1} itemHeight="h-10" />
                  ) : contactsError ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                      <p className="font-medium">{contactsError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={loadContacts}
                      >
                        Retry contacts
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedContact?.id || ""}
                      onValueChange={(id: string) => {
                        const c = contacts.find((x: ContactItem) => x.id === id);
                        if (c) setSelectedContact(c);
                      }}
                    >
                      <SelectTrigger className="border-border">
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
                  )}
                </TabsContent>
                <TabsContent value="custom">
                  <Input
                    placeholder="Wallet address or email"
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className="border-border"
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Amount</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground font-medium">
                  ACBU
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
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
                />
              </div>
              {exceedsBalance && <p className="text-xs text-destructive">Insufficient balance.</p>}
              <p className="text-xs text-muted-foreground">
                Available: ACBU {balanceLoading ? '...' : formatAmount(balance)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Note (Optional)</Label>
              <Input
                placeholder="Add a message..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border-border"
              />
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
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!isFormValid()}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Review the details before confirming
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
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
                <ArrowRight className="h-5 w-5 text-secondary-foreground" />
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
            <AlertDialogCancel className="flex-1 border-border" disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={sending}>{sending ? 'Sending...' : `Send ACBU ${amount}`}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>


            <Dialog
                open={showSuccessDialog}
                onOpenChange={setShowSuccessDialog}
            >
                <DialogContent className="max-w-md border-border">
                    <div className="flex flex-col items-center text-center py-6">
                       <div className="rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
                           <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
                       </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">
                            Transfer Sent!
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Your transfer for ACBU {formatAmount(lastSentAmount)}{" "}
                            is being processed.
                        </p>
                        <Badge variant="secondary" className="mb-4">
                            Pending
                        </Badge>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
