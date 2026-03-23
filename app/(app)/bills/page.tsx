'use client';

import React, { useState } from 'react';
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
import {
  Zap,
  Droplet,
  Wifi,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { formatAmount } from '@/lib/utils';

interface BillProvider {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  minAmount: number;
  maxAmount: number;
}

const billProviders: BillProvider[] = [
  {
    id: 'electric',
    name: 'Electricity',
    category: 'Utilities',
    icon: <Zap className="w-6 h-6" />,
    description: 'Pay your electric bill',
    minAmount: 100,
    maxAmount: 50000,
  },
  {
    id: 'water',
    name: 'Water',
    category: 'Utilities',
    icon: <Droplet className="w-6 h-6" />,
    description: 'Pay your water bill',
    minAmount: 50,
    maxAmount: 10000,
  },
  {
    id: 'internet',
    name: 'Internet',
    category: 'Connectivity',
    icon: <Wifi className="w-6 h-6" />,
    description: 'Pay your internet bill',
    minAmount: 200,
    maxAmount: 5000,
  },
  {
    id: 'mobile',
    name: 'Mobile Airtime',
    category: 'Connectivity',
    icon: <Phone className="w-6 h-6" />,
    description: 'Top up mobile balance',
    minAmount: 100,
    maxAmount: 20000,
  },
];

/**
 * Bill payment and history page.
 */
export default function BillsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'history'>('catalog');
  const [selectedProvider, setSelectedProvider] = useState<BillProvider | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'input' | 'confirm' | 'success'>('input');

  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const mockBalance = 5280.5;
  const mockHistory = [
    {
      id: 1,
      provider: 'Electricity',
      amount: 2500,
      date: '2024-02-01',
      status: 'completed',
      reference: 'ELC-001234',
    },
    {
      id: 2,
      provider: 'Internet',
      amount: 800,
      date: '2024-01-28',
      status: 'completed',
      reference: 'INT-001233',
    },
    {
      id: 3,
      provider: 'Mobile Airtime',
      amount: 500,
      date: '2024-01-25',
      status: 'completed',
      reference: 'MOB-001232',
    },
  ];

  const handleSelectProvider = (provider: BillProvider) => {
    setSelectedProvider(provider);
    setShowPayment(true);
    setPaymentStep('input');
    setAmount('');
    setReference('');
  };

  const handlePaymentConfirm = () => {
    if (!amount || parseFloat(amount) < (selectedProvider?.minAmount || 0)) {
      return;
    }
    setPaymentStep('confirm');
  };

  const handlePaymentExecute = async () => {
    console.log('[v0] Bill payment:', {
      provider: selectedProvider?.id,
      amount,
      reference,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPaymentStep('success');
  };

  const resetPayment = () => {
    setShowPayment(false);
    setPaymentStep('input');
    setAmount('');
    setReference('');
    setSelectedProvider(null);
  };

  return (
    <>
      <div className="pb-20">
        {/* Header */}
        <div className="px-4 pt-6 pb-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground mb-2">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Pay bills and subscriptions easily
          </p>
        </div>

        <PageContainer>
        {/* Balance Card */}
        <div className="mb-5">
          <Card className="border-border bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
            <p className="text-sm font-medium opacity-90">Available Balance</p>
            <p className="text-3xl font-bold">ACBU {formatAmount(mockBalance)}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" onValueChange={(v) => setActiveTab(v as 'catalog' | 'history')}>
          <TabsList className="grid w-full grid-cols-2 px-4 gap-2 bg-transparent border-b border-border rounded-none">
            <TabsTrigger value="catalog" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Catalog
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              History
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="px-4 py-6 space-y-3">
            {billProviders.map((provider) => (
              <Card
                key={provider.id}
                className="border-border p-4 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSelectProvider(provider)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-primary flex-shrink-0 mt-1">
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-0.5">
                      {provider.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {provider.description}
                    </p>
                    <div className="flex items-center gap-2">
                       <span className="text-xs text-muted-foreground">
                        ACBU {formatAmount(provider.minAmount)} - ACBU {formatAmount(provider.maxAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="px-4 py-6 space-y-3">
            {mockHistory.length > 0 ? (
              mockHistory.map((tx) => (
                <Card key={tx.id} className="border-border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {tx.provider}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <p className="font-semibold text-foreground">
                        -ACBU {formatAmount(tx.amount)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ref: {tx.reference}
                  </p>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No bill payments yet
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </PageContainer>

      {/* Payment Dialog */}
      <AlertDialog open={showPayment} onOpenChange={setShowPayment}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {paymentStep === 'input' && `Pay ${selectedProvider?.name}`}
              {paymentStep === 'confirm' && 'Confirm Payment'}
              {paymentStep === 'success' && 'Payment Successful'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {paymentStep === 'input' && selectedProvider?.description}
              {paymentStep === 'confirm' &&
                `Pay ACBU ${formatAmount(amount)} to ${selectedProvider?.name}`}
              {paymentStep === 'success' &&
                'Your bill payment has been processed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {paymentStep === 'input' && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Amount
                </label>
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground">
                    ACBU
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Min: ACBU {formatAmount(selectedProvider?.minAmount)} | Max: ACBU{' '}
                  {formatAmount(selectedProvider?.maxAmount)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Reference (optional)
                </label>
                <Input
                  type="text"
                  placeholder="Meter number, account ID, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="border-border text-sm"
                />
              </div>
            </div>
          )}

          {paymentStep === 'confirm' && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium text-foreground">
                  {selectedProvider?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-foreground">ACBU {formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Fee:</span>
                <span className="font-medium text-foreground">Free</span>
              </div>
            </div>
          )}

          {paymentStep === 'success' && (
            <div className="py-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Transaction reference: TXN_{Date.now().toString().slice(-8)}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {paymentStep !== 'success' && (
              <AlertDialogCancel onClick={resetPayment}>
                {paymentStep === 'input' ? 'Close' : 'Cancel'}
              </AlertDialogCancel>
            )}
            {paymentStep === 'input' && (
              <AlertDialogAction
                onClick={handlePaymentConfirm}
                disabled={
                  !amount ||
                  parseFloat(amount) < (selectedProvider?.minAmount || 0)
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </AlertDialogAction>
            )}
            {paymentStep === 'confirm' && (
              <AlertDialogAction
                onClick={handlePaymentExecute}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Pay Now
              </AlertDialogAction>
            )}
            {paymentStep === 'success' && (
              <AlertDialogAction
                onClick={resetPayment}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Done
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}
