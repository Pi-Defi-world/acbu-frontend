"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecret } from "@/lib/wallet-storage";
import { getPasscode, getTempPassphrase, clearTempPassphrase } from "@/lib/passcode-manager";
import { AlertCircle, ChevronLeft, Lock } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";

export function WalletSetupModal() {
  const { userId, stellarAddress, refreshStellarAddress, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const kit = useStellarWalletsKit();
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");
  // Wallet secret is encrypted with the account passcode via storeWalletSecret

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      return;
    }
    
    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = getTempPassphrase();
    
    const forceSetup = localStorage.getItem("force_wallet_setup");

    if (!stellarAddress || autoGenPassphrase || forceSetup) {
      setOpen(true);
      
      if (autoGenPassphrase) {
        setPassphrase(autoGenPassphrase);
        setOption(1); // Default to showing the generated passphrase if it exists
      }
    } else {
      setOpen(false);
    }
  }, [isAuthenticated, stellarAddress]);

  const handleFinish = async () => {
    clearTempPassphrase();
    localStorage.removeItem("force_wallet_setup");
    await refreshStellarAddress();
    setOpen(false);
  };

  /**
   * Sync a newly-generated or imported wallet to the backend.
   *
   * Order matters here: we push the new address to the backend FIRST, and only
   * write the local seed after the PUT succeeds. That way, if the backend call
   * fails, we don't end up with a local seed whose public key doesn't match
   * the server's record.
   */
  const syncWalletToBackend = async (secret: string): Promise<void> => {
    if (!userId) throw new Error(t('wallet.notLoggedIn'));
    
    const passcode = getPasscode();
    if (!passcode) {
      throw new Error(t('wallet.passcodeUnavailable'));
    }

    const kp = Keypair.fromSecret(secret);
    const publicKey = kp.publicKey();

    // Step 1: Update wallet address on backend
    const result = await userApi.putWalletAddress(publicKey);
    if (!result?.ok || (result.stellar_address && result.stellar_address !== publicKey)) {
      throw new Error(t('wallet.backendRejected'));
    }

    // Step 2: Store secret encrypted with passcode
    await storeWalletSecret(userId, secret, passcode);

    // Step 3: Confirm wallet activation on backend
    try {
      await userApi.postWalletConfirm({ wallet_address: publicKey });
    } catch (err) {
      console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
    }
  };

  const handleGenerateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      await syncWalletToBackend(passphrase);
      handleFinish();
    } catch (err: unknown) {
      setError((err as Error).message || t('common.errorDefault'));
    } finally {
      setLoading(false);
    }
  };

  const handleImportSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!importSeed) {
      setError(t('wallet.seedRequired'));
      return;
    }

    setLoading(true);
    try {
      Keypair.fromSecret(importSeed);
      await syncWalletToBackend(importSeed);
      handleFinish();
    } catch (err: unknown) {
      setError("Invalid seed or failed to import. " + ((err as Error).message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setError("");
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

            const result = await userApi.putWalletAddress(pubKey);
            if (!result?.ok || (result.stellar_address && result.stellar_address !== pubKey)) {
              throw new Error(t('wallet.backendRejectedWallet'));
            }

            try {
              await userApi.postWalletConfirm({ wallet_address: pubKey });
            } catch (err) {
              console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
            }

            handleFinish();
          } catch (e: unknown) {
            setError((e as Error).message || t('common.errorDefault'));
          }
        },
      });
    } catch (err: unknown) {
      setError((err as Error).message || t('common.errorDefault'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      const hasTempPassphrase = getTempPassphrase();
      if (isAuthenticated && (!stellarAddress || hasTempPassphrase)) return;
      setOpen(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wallet.setupTitle')}</DialogTitle>
          <DialogDescription>
            {t('wallet.setupDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 mb-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!option ? (
          <div className="space-y-4 py-4">
            <Button
              data-testid="generate-wallet-button"
              onClick={() => {
                const kp = Keypair.random();
                setPassphrase(kp.secret());
                setOption(1);
              }}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">{t('wallet.generateNew')}</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap text-center">
                {t('wallet.generateNewDesc')}
              </span>
            </Button>

            <Button
              data-testid="import-wallet-button"
              onClick={() => setOption(2)}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">{t('wallet.importExisting')}</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap text-center">
                {t('wallet.importExistingDesc')}
              </span>
            </Button>

            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full h-auto py-4 flex flex-col items-center bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span className="font-semibold">
                {loading ? t('wallet.connecting') : t('wallet.connectExternal')}
              </span>
              <span className="text-xs text-primary-foreground/70 mt-1 text-wrap text-center">
                {t('wallet.connectExternalDesc')}
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              onClick={() => setOption(null)}
              className="mb-2 -ml-2 h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('wallet.back')}
            </Button>

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
                <div className="p-3 bg-muted rounded font-mono text-xs break-all border border-border">
                  {passphrase}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
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

                <Input
                  type="password"
                  placeholder="Starts with S..."
                  value={importSeed}
                  onChange={(e) => setImportSeed(e.target.value)}
                  disabled={loading}
                />

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? t('wallet.importing') : t('wallet.importWallet')}
                </Button>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
