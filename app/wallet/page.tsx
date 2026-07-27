"use client";

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet | ACBU',
  description: 'Manage your ACBU wallet, view your Stellar address, and configure wallet connections.',
};

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import { useRouter } from "next/navigation";
import * as userApi from "@/lib/api/user";
import { storeWalletSecret } from "@/lib/wallet-storage";
import { getPasscode } from "@/lib/passcode-manager";
import { AlertCircle, Wallet, Key, Link as LinkIcon, CheckCircle, Lock } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";
import { useApiOpts, useApiError } from "@/hooks/use-api";

export default function WalletPage() {
  const { userId, stellarAddress, refreshStellarAddress, logout } = useAuth();
  const { t } = useI18n();
  const opts = useApiOpts();
  const router = useRouter();
  const kit = useStellarWalletsKit();
  const [passphrase, setPassphrase] = useState("");
  const { uiError, setApiError: handleError, clearError } = useApiError();
  const error = uiError?.message ?? "";
  const setError = (msg: string) => handleError(new Error(msg));
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");

  useEffect(() => {
    if (option === 1 && !passphrase) {
      const keypair = Keypair.random();
      setPassphrase(keypair.secret());
    }
  }, [option, passphrase]);

  const handleFinish = async (msg: string) => {
    await refreshStellarAddress();
    setSuccessMsg(msg);
    setOption(null);
    setImportSeed("");
    setPassphrase("");
    setTimeout(() => {
      setSuccessMsg("");
    }, 3000);
  };

  const handleGenerateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    setLoading(true);
    try {
      if (!userId) throw new Error(t('wallet.notLoggedIn'));

      const passcode = getPasscode();
      if (!passcode) {
        await logout();
        router.push("/auth/signin");
        return;
      }

      const kp = Keypair.fromSecret(passphrase);
      const newAddress = kp.publicKey();

      await storeWalletSecret(userId, passphrase, passcode);

      const result = await userApi.putWalletAddress(newAddress, opts);
      if (!result?.ok) {
        throw new Error(t('wallet.backendRejected'));
      }

      try {
        await userApi.postWalletConfirm({ wallet_address: newAddress }, opts);
      } catch (err) {
        console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
      }

      handleFinish(t('wallet.generatedSuccess'));
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!importSeed) {
      setError(t('wallet.seedRequired'));
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error(t('wallet.notLoggedIn'));

      const passcode = getPasscode();
      if (!passcode) {
        await logout();
        router.push("/auth/signin");
        return;
      }

      const kp = Keypair.fromSecret(importSeed);
      const newAddress = kp.publicKey();

      await storeWalletSecret(userId, importSeed, passcode);

      const result = await userApi.putWalletAddress(newAddress, opts);
      if (!result?.ok) {
        throw new Error(t('wallet.backendRejected'));
      }

      try {
        await userApi.postWalletConfirm({ wallet_address: newAddress }, opts);
      } catch (err) {
        console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
      }

      handleFinish(t('wallet.importedSuccess'));
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    clearError();
    if (!kit) {
      setError(t('wallet.walletKitInitializing'));
      return;
    }
    setLoading(true);
    try {
      if (!userId) throw new Error(t('wallet.notLoggedIn'));

      await kit.openModal({
        onWalletSelected: async (selectedOption: { id: string }) => {
          try {
            kit.setWallet(selectedOption.id);
            const { address: pubKey } = await kit.getAddress();

            const result = await userApi.putWalletAddress(pubKey, opts);
            if (!result?.ok) {
              throw new Error(t('wallet.backendRejectedWallet'));
            }

            try {
              await userApi.postWalletConfirm({ wallet_address: pubKey }, opts);
            } catch (err) {
              console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
            }

            handleFinish(t('wallet.connectedSuccess'));
          } catch (e: unknown) {
            handleError(e);
          }
        },
      });
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="px-4 py-3">
          <h1 className="page-title">{t('wallet.management')}</h1>
          <p className="text-xs text-muted-foreground">{t('wallet.managementDesc')}</p>
        </div>
      </div>

      <PageContainer>
        <div className="space-y-6">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-100 dark:bg-green-900/30 p-3 border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">{successMsg}</p>
            </div>
          )}

          {stellarAddress && !option && (
            <Card className="border-border p-5 bg-muted/30">
              <h2 className="text-sm font-semibold mb-2">{t('wallet.currentAddress')}</h2>
              <div className="p-3 bg-background rounded-lg border border-border">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {stellarAddress}
                </p>
              </div>
            </Card>
          )}

          {!option ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">{t('wallet.changeOrSetup')}</h2>
              
              <Button
                onClick={() => setOption(1)}
                className="w-full h-auto py-4 flex items-center justify-start gap-4 px-5"
                variant="outline"
              >
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">{t('wallet.generateNew')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('wallet.generateDesc')}
                  </span>
                </div>
              </Button>

              <Button
                onClick={() => setOption(2)}
                className="w-full h-auto py-4 flex items-center justify-start gap-4 px-5"
                variant="outline"
              >
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Key className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">{t('wallet.importExisting')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('wallet.importDesc')}
                  </span>
                </div>
              </Button>

              <Button
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full h-auto py-4 flex items-center justify-start gap-4 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <div className="p-2 bg-primary-foreground/20 rounded-full">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">
                    {loading ? t('wallet.connecting') : t('wallet.connectExternal')}
                  </span>
                  <span className="text-xs text-primary-foreground/70">
                    {t('wallet.connectExternalDesc')}
                  </span>
                </div>
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center mt-2">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <Card className="border-border p-5">
              <Button
                variant="ghost"
                onClick={() => {
                  setOption(null);
                  setError("");
                }}
                className="mb-4 -ml-2"
              >
                ← {t('wallet.back')}
              </Button>

              {error && (
                <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 mb-4">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {option === 1 && (
                <form onSubmit={handleGenerateConfirm} className="space-y-4">
                  <h2 className="text-lg font-semibold">{t('wallet.yourNewWallet')}</h2>
                  
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      {t('wallet.secretEncryptedNotice')}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t('wallet.saveKeyPrompt')}
                  </p>
                  <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                    {passphrase}
                  </div>

                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading ? t('wallet.savingKey') : t('wallet.savedMyKey')}
                  </Button>
                </form>
              )}

              {option === 2 && (
                <form onSubmit={handleImportSeed} className="space-y-4">
                  <h2 className="text-lg font-semibold">{t('wallet.importSeed')}</h2>
                  
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      {t('wallet.secretEncryptedNotice')}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t('wallet.importSeedDesc')}
                  </p>

                  <div>
                    <Input
                      type="password"
                      placeholder="S..."
                      value={importSeed}
                      onChange={(e) => setImportSeed(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading ? t('wallet.importing') : t('wallet.importWallet')}
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
