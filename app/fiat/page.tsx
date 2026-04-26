'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiOpts, useApiError } from '@/hooks/use-api';
import * as fiatApi from '@/lib/api/fiat';
import { useAuth } from '@/contexts/auth-context';
import { getWalletSecretAnyLocal } from '@/lib/wallet-storage';
import { ensureDemoFiatTrustlineClient } from '@/lib/stellar/trustlines';
import { useStellarWalletsKit } from '@/lib/stellar-wallets-kit';
import { AlertCircle, Building2, Plus } from 'lucide-react';
import { Keypair } from '@stellar/stellar-sdk';
export default function FiatSimPage() {
  const opts = useApiOpts();
  const { userId, stellarAddress } = useAuth();
  const kit = useStellarWalletsKit();
  const [accounts, setAccounts] = useState<fiatApi.FiatAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, clearError, handleError } = useApiError();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastFaucetTx, setLastFaucetTx] = useState<string | null>(null);

  const [faucetAmount, setFaucetAmount] = useState('');
  const [faucetCurrency, setFaucetCurrency] = useState('NGN');

  const fetchAccounts = async () => {
    try {
      const data = await fiatApi.getFiatAccounts(opts);
      setAccounts(data.accounts || []);
    } catch (e: unknown) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [opts.token]);

  const handleFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faucetAmount || parseFloat(faucetAmount) <= 0) return;

    setActionLoading('faucet');
    clearError();
    setLastFaucetTx(null);
    try {
      if (!userId) throw new Error('Not logged in');
      const secret = await getWalletSecretAnyLocal(userId, stellarAddress);

      let recipient: string;
      if (secret) {
        recipient = Keypair.fromSecret(secret).publicKey();
        await ensureDemoFiatTrustlineClient({ userSecret: secret, currency: faucetCurrency });
      } else {
        if (!kit) {
          throw new Error(
            'No local wallet secret found and wallet connector is not ready yet. Please wait a moment and retry.',
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

        recipient = address;
        await ensureDemoFiatTrustlineClient({
          external: { kit, address },
          currency: faucetCurrency,
        });
      }
      const res = await fiatApi.postFaucet(faucetCurrency, faucetAmount, recipient, opts);
      setLastFaucetTx(res.transaction_hash);
      setFaucetAmount('');
    } catch (e: unknown) {
      handleError(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Demo fiat</h1>
          <p className="text-sm text-muted-foreground">
            Request test basket tokens to your linked wallet, then use Mint to convert them to
            ACBU. Balances come from the network, not this app.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {lastFaucetTx && (
          <Card className="p-4 text-sm border-primary/30 bg-primary/5">
            <p className="font-medium text-foreground">Last faucet transaction</p>
            <p className="text-xs text-muted-foreground break-all mt-1">{lastFaucetTx}</p>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Plus className="w-5 h-5 text-primary" />
              <h2>Request test tokens (faucet)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Amount is in whole units of the selected currency (e.g. 100 = one hundred).
            </p>
            <form onSubmit={handleFaucet} className="flex flex-wrap gap-2">
              <select
                className="bg-background border rounded px-2 text-sm"
                value={faucetCurrency}
                onChange={(e) => setFaucetCurrency(e.target.value)}
              >
                {['NGN', 'GHS', 'KES', 'EGP', 'ZAR', 'RWF', 'XOF', 'MAD', 'TZS', 'UGX'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Amount"
                value={faucetAmount}
                onChange={(e) => setFaucetAmount(e.target.value)}
                className="flex-1 min-w-[120px]"
              />
              <Button type="submit" disabled={!!actionLoading}>
                {actionLoading === 'faucet' ? '...' : 'Get tokens'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Basket currencies
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((acc) => (
                <Card
                  key={acc.id}
                  className="p-4 flex flex-col justify-between border-l-4 border-l-primary"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-primary">{acc.bank_name}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_number}</p>
                    </div>
                    <Badge variant="secondary">{acc.currency}</Badge>
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {acc.currency} {Number(acc.balance || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ USD{' '}
                      {acc.usd_equivalent != null
                        ? Number(acc.usd_equivalent).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the faucet for test {acc.currency}, then Mint to receive ACBU.
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: string;
}) {
  const styles =
    variant === 'secondary'
      ? 'bg-secondary text-secondary-foreground'
      : 'bg-primary text-primary-foreground';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${styles}`}>{children}</span>
  );
}
