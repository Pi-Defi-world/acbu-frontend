"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecretLocalPlaintext } from "@/lib/wallet-storage";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";

export function WalletSetupModal() {
  const { userId, stellarAddress, refreshStellarAddress, isAuthenticated } = useAuth();
  const kit = useStellarWalletsKit();
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");
  // Plaintext local storage mode: no passcode prompt

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      return;
    }
    
    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = sessionStorage.getItem("temp_passphrase");
    
    // Check if user has removed their local wallet from settings
    // If they have no stellarAddress, we definitely show it.
    // If they have a stellarAddress, but want to re-import, we need a way to trigger it.
    // Let's check `hasStoredWallet` if they have a stellarAddress.
    // But since WalletKit might be used without local storage, we shouldn't force the modal
    // just because they lack local storage. 
    // However, if the user specifically clears the wallet (which reloads the page) 
    // AND they have no `stellarAddress` OR we want them to re-setup, we should show it.
    // For now, if `!stellarAddress || autoGenPassphrase` it shows up.
    // If they clicked "Remove Local Wallet", they probably want to re-import, but if stellarAddress is still there,
    // they can't. Let's add a flag in localStorage "force_wallet_setup".
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
    sessionStorage.removeItem("temp_passphrase");
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
   * the server's record (which is what caused the mint to keep targeting the
   * wrong recipient and erroring with "trustline entry is missing").
   * 
   * After syncing, we call postWalletConfirm to complete the activation flow.
   */
  const syncWalletToBackend = async (secret: string): Promise<void> => {
    if (!userId) throw new Error("Not logged in");
    const kp = Keypair.fromSecret(secret);
    const publicKey = kp.publicKey();

    // Step 1: Update wallet address on backend
    const result = await userApi.putWalletAddress(publicKey);
    if (!result?.ok || (result.stellar_address && result.stellar_address !== publicKey)) {
      throw new Error(
        "Backend did not accept the new wallet address. Please retry.",
      );
    }

    // Step 2: Store secret locally
    await storeWalletSecretLocalPlaintext(userId, secret, publicKey);

    // Step 3: Confirm wallet activation on backend
    try {
      await userApi.postWalletConfirm({ wallet_address: publicKey });
    } catch (err) {
      console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
      // Don't throw - the address is set, confirmation can retry later if needed
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
      setError((err as Error).message || "Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleImportSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!importSeed) {
      setError("Seed is required.");
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
      setError("Wallet Kit is still initializing...");
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error("Not logged in");

      // This will prompt the user to select and connect a wallet
      await kit.openModal({
        onWalletSelected: async (selectedOption: { id: string }) => {
          try {
            kit.setWallet(selectedOption.id);
            const { address: pubKey } = await kit.getAddress();

            // Update wallet address on backend
            const result = await userApi.putWalletAddress(pubKey);
            if (!result?.ok || (result.stellar_address && result.stellar_address !== pubKey)) {
              throw new Error("Backend did not accept the wallet address. Please retry.");
            }

            // Confirm wallet activation on backend
            try {
              await userApi.postWalletConfirm({ wallet_address: pubKey });
            } catch (err) {
              console.warn("Wallet confirm failed, but wallet address was set. User can continue.", err);
            }

            handleFinish();
          } catch (e: unknown) {
            setError((e as Error).message || "Failed to connect wallet");
          }
        },
      });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to open wallet modal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing the modal if the user doesn't have a wallet or needs to confirm passphrase
      const hasTempPassphrase = sessionStorage.getItem("temp_passphrase");
      if (isAuthenticated && (!stellarAddress || hasTempPassphrase)) return;
      setOpen(val);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Your Wallet</DialogTitle>
          <DialogDescription>
            ACBU uses the Stellar network. How would you like to set up your wallet?
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
              onClick={() => {
                // Always generate a fresh key when user explicitly chooses "Generate New Wallet"
                const kp = Keypair.random();
                setPassphrase(kp.secret());
                setOption(1);
              }}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">Generate New Wallet</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap text-center">
                Let us create a secure wallet for you
              </span>
            </Button>

            <Button
              onClick={() => setOption(2)}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">Import Existing Seed</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap text-center">
                Use an existing Stellar secret key
              </span>
            </Button>

            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full h-auto py-4 flex flex-col items-center bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span className="font-semibold">
                {loading ? "Connecting..." : "Connect External Wallet"}
              </span>
              <span className="text-xs text-primary-foreground/70 mt-1 text-wrap text-center">
                Connect Freighter, Lobstr, or others
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
              Back
            </Button>

            {option === 1 && (
              <form onSubmit={handleGenerateConfirm} className="space-y-4">
                <h2 className="text-lg font-semibold">Your New Wallet</h2>
                <p className="text-sm text-muted-foreground">
                  Please save this secret key somewhere safe. It is required to
                  recover your wallet if you switch devices.
                </p>
                <div className="p-3 bg-muted rounded font-mono text-xs break-all border border-border">
                  {passphrase}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Saving..." : "I have saved my key"}
                </Button>
              </form>
            )}

            {option === 2 && (
              <form onSubmit={handleImportSeed} className="space-y-4">
                <h2 className="text-lg font-semibold">Import Seed</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your Stellar secret key (starts with 'S'). It will be stored
                  securely on this device.
                </p>

                <Input
                  type="password"
                  placeholder="Starts with S..."
                  value={importSeed}
                  onChange={(e) => setImportSeed(e.target.value)}
                  disabled={loading}
                />

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Importing..." : "Import Wallet"}
                </Button>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
