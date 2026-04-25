"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecretLocalPlaintext } from "@/lib/wallet-storage";
import { AlertCircle, CheckCircle, ChevronLeft } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * Wallet Setup Confirmation Page
 * 
 * This page is shown after user signs up/signs in with a newly created wallet.
 * It allows the user to confirm and complete their wallet setup, then syncs
 * the wallet to the backend and calls postWalletConfirm to activate it.
 */
export default function WalletSetupPage() {
  const router = useRouter();
  const { userId, stellarAddress, refreshStellarAddress, isAuthenticated } = useAuth();
  const kit = useStellarWalletsKit();
  
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [option, setOption] = useState<number | null>(null);
  const [importSeed, setImportSeed] = useState("");

  // Load auto-generated passphrase from session if available
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    // If user already has a wallet address, skip setup and go home
    if (stellarAddress && !sessionStorage.getItem("temp_passphrase")) {
      router.push("/");
      return;
    }

    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = sessionStorage.getItem("temp_passphrase");
    if (autoGenPassphrase) {
      setPassphrase(autoGenPassphrase);
      setOption(1); // Show the confirmation step
    }
  }, [isAuthenticated, stellarAddress, router]);

  /**
   * Sync wallet to backend: 
   * 1. Put wallet address to backend
   * 2. Store secret locally
   * 3. Call postWalletConfirm to complete activation
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

    if (!passphrase) {
      setError("Passphrase is required.");
      return;
    }

    setLoading(true);
    try {
      await syncWalletToBackend(passphrase);
      setSuccess("Wallet set up successfully!");
      
      // Clean up session storage
      sessionStorage.removeItem("temp_passphrase");
      
      // Refresh user context to update stellar address
      await refreshStellarAddress();
      
      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to set up wallet");
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
      // Validate seed format
      Keypair.fromSecret(importSeed);
      await syncWalletToBackend(importSeed);
      setSuccess("Wallet imported successfully!");
      
      // Clean up session storage
      sessionStorage.removeItem("temp_passphrase");
      
      // Refresh user context
      await refreshStellarAddress();
      
      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      setError("Invalid seed or failed to import. " + ((err as Error).message || ""));
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

      // Open wallet connector modal
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
              console.warn("Wallet confirm failed, but wallet address was set.", err);
            }

            setSuccess("Wallet connected successfully!");
            await refreshStellarAddress();
            
            setTimeout(() => {
              router.push("/");
            }, 1500);
          } catch (e: unknown) {
            setError((e as Error).message || "Failed to connect wallet");
            setLoading(false);
          }
        },
      });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to open wallet modal");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Finish Wallet Setup</h1>
          <p className="text-xs text-muted-foreground">Complete your wallet activation</p>
        </div>
      </div>

      <PageContainer>
        <Card className="border-border p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {!option ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                How would you like to set up your wallet?
              </p>

              <Button
                onClick={() => {
                  const kp = Keypair.random();
                  setPassphrase(kp.secret());
                  setOption(1);
                }}
                disabled={loading}
                className="w-full h-auto py-4 flex flex-col items-center"
                variant="outline"
              >
                <span className="font-semibold">Generate New Wallet</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Let us create a secure wallet for you
                </span>
              </Button>

              <Button
                onClick={() => setOption(2)}
                disabled={loading}
                className="w-full h-auto py-4 flex flex-col items-center"
                variant="outline"
              >
                <span className="font-semibold">Import Existing Seed</span>
                <span className="text-xs text-muted-foreground mt-1">
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
                <span className="text-xs text-primary-foreground/70 mt-1">
                  Connect Freighter, Lobstr, or others
                </span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => setOption(null)}
                className="mb-2 -ml-2 h-8 px-2"
                disabled={loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              {option === 1 && (
                <form onSubmit={handleGenerateConfirm} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Your New Wallet</h2>
                    <p className="text-sm text-muted-foreground">
                      Please save this secret key somewhere safe. It is required to
                      recover your wallet if you switch devices.
                    </p>
                  </div>

                  <div className="p-3 bg-muted rounded font-mono text-xs break-all border border-border max-h-32 overflow-y-auto">
                    {passphrase}
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Saving..." : "I have saved my key"}
                  </Button>
                </form>
              )}

              {option === 2 && (
                <form onSubmit={handleImportSeed} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Import Seed</h2>
                    <p className="text-sm text-muted-foreground">
                      Enter your Stellar secret key (starts with 'S'). It will be stored
                      securely on this device.
                    </p>
                  </div>

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
        </Card>
      </PageContainer>
    </>
  );
}
