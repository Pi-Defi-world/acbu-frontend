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
import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';
import { formatAmount } from '@/lib/utils';

/**
 * Currency management hub.
 */
export default function CurrencyPage() {
  const [activeTab, setActiveTab] = useState<'mint' | 'burn' | 'international'>(
    'mint'
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');

  // Mint state
  const [mintAmount, setMintAmount] = useState('');
  const [mintSource, setMintSource] = useState('usdc');

  // Burn state
  const [burnAmount, setBurnAmount] = useState('');
  const [burnDestination, setBurnDestination] = useState('bank');

  // International state
  const [intlAmount, setIntlAmount] = useState('');
  const [intlCurrency, setIntlCurrency] = useState('USD');
  const [intlCountry, setIntlCountry] = useState('US');

  const mockBalance = 5280.5;
  const mockRate = 1620;
  const exchangeRate = 0.82; // Simulated exchange rate

  const handleMintConfirm = async () => {
    setStep('confirm');
  };

  const handleBurnConfirm = async () => {
    setStep('confirm');
  };

  const handleExecute = async () => {
    console.log('[v0] Operation executed:', { activeTab, amount: mintAmount || burnAmount || intlAmount });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep('success');
  };

  const resetForm = () => {
    setStep('input');
    setMintAmount('');
    setBurnAmount('');
    setIntlAmount('');
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
            <p className="text-3xl font-bold mb-2">ACBU {formatAmount(mockBalance)}</p>
            <p className="text-xs opacity-75">≈ ACBU {formatAmount(mockBalance * mockRate, 0)}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mint" className="w-full" onValueChange={(v) => setActiveTab(v as 'mint' | 'burn' | 'international')}>
          <TabsList className="grid w-full grid-cols-3 px-4 gap-2 bg-transparent border-b border-border rounded-none">
            <TabsTrigger value="mint" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Mint
            </TabsTrigger>
            <TabsTrigger value="burn" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Burn
            </TabsTrigger>
            <TabsTrigger value="international" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              International
            </TabsTrigger>
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

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Amount to Mint
                </label>
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
                  You'll receive: ACBU{' '}
                  {mintAmount
                    ? formatAmount(parseFloat(mintAmount) * exchangeRate)
                    : '0.00'}
                </p>
              </div>

              <Card className="border-border bg-muted p-3 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-foreground">$2.50</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">
                    ${mintAmount ? (parseFloat(mintAmount) + 2.5).toFixed(2) : '2.50'}
                  </span>
                </div>
              </Card>

              <Button
                onClick={handleMintConfirm}
                disabled={!mintAmount || parseFloat(mintAmount) <= 0}
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
                <p className="text-xs text-muted-foreground mb-1">Destination</p>
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
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Amount to Burn
                </label>
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
                  Available: ACBU {formatAmount(mockBalance)}
                </p>
                {parseFloat(burnAmount || '0') > mockBalance && (
                  <p className="text-xs text-destructive mt-1">
                    Insufficient balance
                  </p>
                )}
              </div>

              <Card className="border-border bg-muted p-3 mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">You'll receive</span>
                  <span className="font-medium text-foreground">
                    ${burnAmount ? (parseFloat(burnAmount) / exchangeRate).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-foreground">$1.00</span>
                </div>
              </Card>

              <Button
                onClick={handleBurnConfirm}
                disabled={!burnAmount || parseFloat(burnAmount) > mockBalance}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                Burn & Withdraw
              </Button>
            </div>
          </TabsContent>

          {/* International Tab */}
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

                <Card className="border-border bg-muted p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {intlAmount
                          ? `${intlCurrency} ${formatAmount(parseFloat(intlAmount) * 1.8)}`
                          : `${intlCurrency} 0.00`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        at {intlCurrency} 1.80 per ACBU
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fee: {intlCurrency} 0.50
                  </div>
                </Card>

                <Button
                  onClick={() => setStep('confirm')}
                  disabled={!intlAmount || parseFloat(intlAmount) <= 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>

      {/* Confirmation Dialog */}
      <AlertDialog open={step === 'confirm'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTab === 'mint' && 'Confirm Mint'}
              {activeTab === 'burn' && 'Confirm Burn & Withdrawal'}
              {activeTab === 'international' && 'Confirm Transfer'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTab === 'mint' &&
                `Mint ACBU ${formatAmount(parseFloat(mintAmount || '0') * exchangeRate)} from USDC`}
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
                {activeTab === 'mint' && '$2.50'}
                {activeTab === 'burn' && '$1.00'}
                {activeTab === 'international' && `${intlCurrency} 0.50`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel onClick={() => setStep('input')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecute}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={step === 'success'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Operation Complete</AlertDialogTitle>
            <AlertDialogDescription>
              Your {activeTab} operation has been processed successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Transaction ID: TXN_{Date.now().toString().slice(-8)}
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
