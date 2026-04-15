"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecret } from "@/lib/wallet-storage";
import { AlertCircle, Wallet, Key, Link as LinkIcon, CheckCircle } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";
import { useApiOpts } from "@/hooks/use-api";

export default function WalletPage() {
  const router = useRouter();
  const { userId, stellarAddress, refreshStellarAddress } = useAuth();
  const opts = useApiOpts();
  const kit = useStellarWalletsKit();
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");
  // User's passcode to encrypt the seed locally
  const [userPasscode, setUserPasscode] = useState("");

  useEffect(() => {
    if (option === 1 && !passphrase) {
      // Generate a new keypair when they select Generate
      const keypair = Keypair.random();
      setPassphrase(keypair.secret());
    }
  }, [option, passphrase]);

  const handleFinish = async (msg: string) => {
    await refreshStellarAddress();
    setSuccessMsg(msg);
    setOption(null);
    setUserPasscode("");
    setImportSeed("");
    setPassphrase("");
    setTimeout(() => {
      setSuccessMsg("");
    }, 3000);
  };

  const handleGenerateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userPasscode) {
      setError("Please enter your passcode to securely store the wallet.");
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error("Not logged in");

      // Securely store in IndexedDB
      await storeWalletSecret(userId, passphrase, userPasscode);

      // We also update the backend that we are handling it locally
      await userApi.postWalletConfirm(
        {
          encryption_method: "passcode",
          passcode: userPasscode,
          passphrase,
        },
        opts
      );

      handleFinish("New wallet created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleImportSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!importSeed || !userPasscode) {
      setError("Seed and passcode are required.");
      return;
    }

    setLoading(true);
    try {
      if (!userId) throw new Error("Not logged in");

      // Validate seed
      const kp = Keypair.fromSecret(importSeed);
      const newAddress = kp.publicKey();

      // Store securely in IndexedDB
      await storeWalletSecret(userId, importSeed, userPasscode);

      // Tell backend to update stellarAddress and not track the secret
      // This might require a PUT /users/me/wallet endpoint or similar if it exists
      // Wait, userApi.putWalletAddress exists in auth/wallet-setup! Let's check if it exists in userApi.
      // Wait, the imports in auth/wallet-setup do `await userApi.putWalletAddress(stellarAddress)`
      // Let's use that.
      await userApi.putWalletAddress(newAddress, opts);

      handleFinish("Wallet imported successfully!");
    } catch (err: any) {
      setError("Invalid seed or failed to import. " + (err.message || ""));
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
        onWalletSelected: async (selectedOption: any) => {
          try {
            kit.setWallet(selectedOption.id);
            const pubKey = await kit.getPublicKey();

            await userApi.putWalletAddress(pubKey, opts);
            handleFinish("External wallet connected successfully!");
          } catch (e: any) {
            setError(e.message || "Failed to connect wallet");
          }
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to open wallet modal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Wallet Management</h1>
          <p className="text-xs text-muted-foreground">Manage your Stellar wallet</p>
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
              <h2 className="text-sm font-semibold mb-2">Current Wallet Address</h2>
              <div className="p-3 bg-background rounded-lg border border-border">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {stellarAddress}
                </p>
              </div>
            </Card>
          )}

          {!option ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Change or Setup Wallet</h2>
              
              <Button
                onClick={() => setOption(1)}
                className="w-full h-auto py-4 flex items-center justify-start gap-4 px-5"
                variant="outline"
              >
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold block">Generate New Wallet</span>
                  <span className="text-xs text-muted-foreground">
                    Create a new secure wallet locally
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
                  <span className="font-semibold block">Import Existing Seed</span>
                  <span className="text-xs text-muted-foreground">
                    Use an existing Stellar secret key
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
                    {loading ? "Connecting..." : "Connect External Wallet"}
                  </span>
                  <span className="text-xs text-primary-foreground/70">
                    Connect Freighter, Lobstr, or others
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
                ← Back
              </Button>

              {error && (
                <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 mb-4">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {option === 1 && (
                <form onSubmit={handleGenerateConfirm} className="space-y-4">
                  <h2 className="text-lg font-semibold">Your New Wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Please save this secret key somewhere safe. It is required to
                    recover your wallet if you switch devices.
                  </p>
                  <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                    {passphrase}
                  </div>

                  <div className="pt-4 border-t border-border mt-6">
                    <label className="text-sm font-medium mb-2 block">
                      Enter your Passcode to encrypt it locally
                    </label>
                    <Input
                      type="password"
                      placeholder="Your account passcode"
                      value={userPasscode}
                      onChange={(e) => setUserPasscode(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full mt-4">
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

                  <div>
                    <Input
                      type="password"
                      placeholder="S..."
                      value={importSeed}
                      onChange={(e) => setImportSeed(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="pt-4 border-t border-border mt-6">
                    <label className="text-sm font-medium mb-2 block">
                      Enter your Passcode to encrypt it locally
                    </label>
                    <Input
                      type="password"
                      placeholder="Your account passcode"
                      value={userPasscode}
                      onChange={(e) => setUserPasscode(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full mt-4">
                    {loading ? "Importing..." : "Import Wallet"}
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
