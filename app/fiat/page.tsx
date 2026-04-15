'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiOpts } from '@/hooks/use-api';
import * as fiatApi from '@/lib/api/fiat';
import { AlertCircle, Building2, Wallet, ArrowRightLeft, Plus } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { useBalance } from '@/hooks/use-balance';

export default function FiatSimPage() {
  const opts = useApiOpts();
  const { refresh: refreshAcbuBalance } = useBalance();
  const [accounts, setAccounts] = useState<fiatApi.FiatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // On-ramp state
  const [rampAmount, setRampAmount] = useState('');
  const [rampCurrency, setRampCurrency] = useState('NGN');

  const fetchAccounts = async () => {
    try {
      const data = await fiatApi.getFiatAccounts(opts);
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [opts.token]);

  const handleFaucet = async (currency: string) => {
    setActionLoading(`faucet-${currency}`);
    setError('');
    try {
      await fiatApi.postFaucet(currency, opts);
      await fetchAccounts();
    } catch (e: any) {
      setError(e.message || 'Faucet failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOnRamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rampAmount || parseFloat(rampAmount) <= 0) return;
    
    setActionLoading('on-ramp');
    setError('');
    try {
      await fiatApi.postOnRamp(rampAmount, rampCurrency, opts);
      setRampAmount('');
      await fetchAccounts();
      await refreshAcbuBalance();
    } catch (e: any) {
      setError(e.message || 'On-ramp failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Simulated Banking</h1>
          <p className="text-sm text-muted-foreground">
            This is a simulated environment. None of the funds here are real.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Faucet Section */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Plus className="w-5 h-5 text-primary" />
              <h2>Request Test Funds (Faucet)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add 10,000 units of local currency to your simulated bank account.
            </p>
            <div className="flex flex-wrap gap-2">
              {['NGN', 'GHS', 'KES', 'EGP', 'ZAR'].map((cur) => (
                <Button 
                  key={cur}
                  size="sm" 
                  variant="outline"
                  disabled={!!actionLoading}
                  onClick={() => handleFaucet(cur)}
                >
                  {actionLoading === `faucet-${cur}` ? '...' : `Get ${cur}`}
                </Button>
              ))}
            </div>
          </Card>

          {/* On-Ramp Section */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              <h2>On-Ramp to ACBU</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Exchange your simulated fiat for ACBU tokens.
            </p>
            <form onSubmit={handleOnRamp} className="flex gap-2">
              <select 
                className="bg-background border rounded px-2 text-sm"
                value={rampCurrency}
                onChange={(e) => setRampCurrency(e.target.value)}
              >
                {['NGN', 'GHS', 'KES', 'EGP', 'ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input 
                type="number" 
                placeholder="Amount" 
                value={rampAmount}
                onChange={(e) => setRampAmount(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!!actionLoading}>
                {actionLoading === 'on-ramp' ? '...' : 'Ramp'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Your Simulated Bank Accounts
          </h2>
          
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No simulated accounts found. Request test funds to get started.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((acc) => (
                <Card key={acc.id} className="p-4 flex flex-col justify-between border-l-4 border-l-primary">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-primary">{acc.bank_name}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_number}</p>
                    </div>
                    <Badge variant="secondary">{acc.currency}</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold">{acc.currency} {formatAmount(acc.balance)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{acc.account_name}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode, variant?: string }) {
  const styles = variant === 'secondary' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles}`}>{children}</span>;
}
