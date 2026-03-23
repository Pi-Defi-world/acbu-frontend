'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Check, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';
import * as transfersApi from '@/lib/api/transfers';
import type { ContactItem, TransferItem } from '@/types/api';
import { formatAmount } from '@/lib/utils';

const BALANCE_PLACEHOLDER = '—';

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

/**
 * Page component for sending ACBU tokens.
 */
export default function SendPage() {
  const opts = useApiOpts();
  const [activeTab, setActiveTab] = useState('send');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [amount, setAmount] = useState('');
  const [lastSentAmount, setLastSentAmount] = useState('');
  const [note, setNote] = useState('');
  const [customRecipient, setCustomRecipient] = useState('');
  const [useContact, setUseContact] = useState(true);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);

  const loadTransfers = () => {
    transfersApi.getTransfers(opts).then((data) => setTransfers(data.transfers ?? [])).catch(() => {}).finally(() => setLoadingTransfers(false));
  };
  const loadContacts = () => {
    userApi.getContacts(opts).then((data) => setContacts(data.contacts ?? [])).catch(() => {}).finally(() => setLoadingContacts(false));
  };
  useEffect(() => {
    loadTransfers();
    loadContacts();
  }, [opts.token]);

  const handleRecipientSelect = (contact: ContactItem) => {
    setSelectedContact(contact);
    setUseContact(true);
  };

  const getToValue = () => useContact && selectedContact ? (selectedContact.pay_uri || selectedContact.alias || selectedContact.id) : customRecipient.trim();

  const handleConfirmTransfer = async () => {
    const to = getToValue();
    if (!amount || parseFloat(amount) <= 0 || !to) return;
    setSubmitError('');
    setSending(true);
    try {
      await transfersApi.createTransfer({ to, amount_acbu: amount }, opts);
      loadTransfers();
      setShowConfirmDialog(false);
      setShowSendDialog(false);
      setShowSuccessDialog(true);
      setLastSentAmount(amount);
      setAmount('');
      setNote('');
      setCustomRecipient('');
      setSelectedContact(null);
      setTimeout(() => setShowSuccessDialog(false), 2500);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const isFormValid = () =>
    amount && parseFloat(amount) > 0 &&
    ((useContact && selectedContact) || (!useContact && customRecipient.trim()));
  const exceedsBalance = false; // no balance endpoint yet

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground mb-3">Send Money</h1>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('send')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'send' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>Send</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>History</button>
          </div>
        </div>
      </header>

      <PageContainer>
        <div className="rounded-lg border border-border bg-gradient-to-br from-primary to-secondary p-5 text-primary-foreground mb-5">
          <p className="text-sm font-medium opacity-90 mb-1">Available Balance</p>
          <p className="text-3xl font-bold">ACBU {formatAmount(BALANCE_PLACEHOLDER)}</p>
          <p className="text-xs opacity-75 mt-2">Native ACBU Currency</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsContent value="send" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setShowSendDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto flex-col py-4">
                <Plus className="mb-2 h-5 w-5" /><span>New Transfer</span>
              </Button>
              <Link href="/me/settings/contacts">
                <Button variant="outline" className="border-border hover:bg-muted h-auto flex-col py-4 bg-transparent w-full">
                  <Plus className="mb-2 h-5 w-5" /><span>Add Contact</span>
                </Button>
              </Link>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Frequent Recipients</h3>
              <div className="space-y-2">
                {loadingContacts ? (
                  <div className="animate-pulse h-12 bg-muted rounded-lg" />
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contacts. Add one in Settings.</p>
                ) : (
                  contacts.slice(0, 5).map((contact) => (
                    <button key={contact.id} onClick={() => { handleRecipientSelect(contact); setShowSendDialog(true); }} className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0"><p className="font-medium text-foreground truncate">{contact.alias ?? contact.pay_uri ?? contact.id}</p><p className="text-xs text-muted-foreground truncate">{contact.pay_uri ?? ''}</p></div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-3">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Recent Transfers</h3>
              {loadingTransfers ? (
                <div className="space-y-2"><div className="h-14 bg-muted rounded-lg animate-pulse" /><div className="h-14 bg-muted rounded-lg animate-pulse" /></div>
              ) : transfers.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-6 text-center"><p className="text-sm text-muted-foreground">No transfers yet</p></div>
              ) : (
                <div className="space-y-2">
                  {transfers.map((t) => (
                    <Link key={t.transaction_id} href={`/send/${t.transaction_id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors active:bg-muted">
                      <div className="flex-1 min-w-0"><p className="font-medium text-foreground truncate">Transfer</p><p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p></div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">ACBU {formatAmount(t.amount_acbu)}</p>
                        <Badge variant="outline" className={`mt-1 text-xs ${getStatusColor(t.status)}`}>
                          {t.status === 'completed' && <Check className="mr-1 h-3 w-3" />}
                          {t.status === 'pending' && <AlertCircle className="mr-1 h-3 w-3" />}
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
      </PageContainer>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md border-border">
          <DialogHeader><DialogTitle>Send Money</DialogTitle><DialogDescription>Transfer ACBU securely to another wallet</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Recipient</Label>
              <Tabs value={useContact ? 'contact' : 'custom'} onValueChange={(v) => setUseContact(v === 'contact')}>
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="contact">From Contacts</TabsTrigger><TabsTrigger value="custom">New Address</TabsTrigger>
                </TabsList>
                <TabsContent value="contact" className="mt-3">
                  <Select value={selectedContact?.id || ''} onValueChange={(id) => { const c = contacts.find((x) => x.id === id); if (c) setSelectedContact(c); }}>
                    <SelectTrigger className="border-border"><SelectValue placeholder="Select a contact" /></SelectTrigger>
                    <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.alias ?? c.pay_uri ?? c.id}</SelectItem>)}</SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="custom">
                  <Input placeholder="Wallet address or email" value={customRecipient} onChange={(e) => setCustomRecipient(e.target.value)} className="border-border" />
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Amount</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground font-medium">ACBU</span>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="border-border text-lg font-semibold" />
              </div>
              {exceedsBalance && <p className="text-xs text-destructive">Insufficient balance.</p>}
              <p className="text-xs text-muted-foreground">Available: ACBU {formatAmount(BALANCE_PLACEHOLDER)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Note (Optional)</Label>
              <Input placeholder="Add a message..." value={note} onChange={(e) => setNote(e.target.value)} className="border-border" />
            </div>
            <Card className="border-border bg-muted p-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Network Fee</span><span className="font-medium text-foreground">Free</span></div></Card>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSendDialog(false)} className="flex-1 border-border">Cancel</Button>
              <Button onClick={() => setShowConfirmDialog(true)} disabled={!isFormValid()} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md border-border">
          <AlertDialogHeader><AlertDialogTitle>Confirm Transfer</AlertDialogTitle><AlertDialogDescription>Review the details before confirming</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-3 py-4">
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="rounded-lg border border-border bg-muted p-4"><p className="text-xs text-muted-foreground">To</p><p className="font-semibold text-foreground truncate">{selectedContact?.alias || selectedContact?.pay_uri || customRecipient || '—'}</p></div>
            <div className="flex items-center justify-center"><div className="rounded-full bg-secondary p-2"><ArrowRight className="h-5 w-5 text-secondary-foreground" /></div></div>
            <div className="rounded-lg border border-border bg-muted p-4"><p className="text-xs text-muted-foreground">Amount</p><p className="text-2xl font-bold text-foreground">ACBU {formatAmount(amount)}</p><p className="mt-2 text-xs text-muted-foreground">Network Fee: Free</p></div>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel className="flex-1 border-border" disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" disabled={sending}>{sending ? 'Sending...' : `Send ACBU ${amount}`}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md border-border">
          <div className="flex flex-col items-center text-center py-6">
            <div className="rounded-full bg-green-100 p-4 mb-4"><Check className="h-8 w-8 text-green-600" /></div>
            <h2 className="text-xl font-bold text-foreground mb-2">Transfer Sent!</h2>
            <p className="text-muted-foreground mb-4">Your transfer for ACBU {formatAmount(lastSentAmount)} is being processed.</p>
            <Badge variant="secondary" className="mb-4">Pending</Badge>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
