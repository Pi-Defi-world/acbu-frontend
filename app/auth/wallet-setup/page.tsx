"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecret } from "@/lib/wallet-storage";
import { AlertCircle } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";

export default function WalletSetupPage() {
  const router = useRouter();
  const { userId, refreshStellarAddress } = useAuth();
  const kit = useStellarWalletsKit();
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");
  // User's passcode to encrypt the seed locally
  const [userPasscode, setUserPasscode] = useState("");

  useEffect(() => {
    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = sessionStorage.getItem("temp_passphrase");
    if (autoGenPassphrase) {
      setPassphrase(autoGenPassphrase);
    }
  }, []);

  const handleFinish = async () => {
    sessionStorage.removeItem("temp_passphrase");
    await refreshStellarAddress();
    router.push("/");
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
      await userApi.postWalletConfirm({
        encryption_method: "passcode",
        passcode: userPasscode,
        passphrase,
      });

      handleFinish();
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
      const stellarAddress = kp.publicKey();

      // Store securely in IndexedDB
      await storeWalletSecret(userId, importSeed, userPasscode);

      // Tell backend to update stellarAddress and not track the secret
      await userApi.putWalletAddress(stellarAddress);

      handleFinish();
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

            await userApi.putWalletAddress(pubKey);
            handleFinish();
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

  if (!option) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-border p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Set Up Your Wallet</h1>
            <p className="text-muted-foreground text-sm">
              ACBU uses the Stellar network. How would you like to set up your
              wallet?
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setOption(1)}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">Generate New Wallet</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap">
                Let us create a secure wallet for you
              </span>
            </Button>

            <Button
              onClick={() => setOption(2)}
              className="w-full h-auto py-4 flex flex-col items-center"
              variant="outline"
            >
              <span className="font-semibold">Import Existing Seed</span>
              <span className="text-xs text-muted-foreground mt-1 text-wrap">
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
              <span className="text-xs text-primary-foreground/70 mt-1 text-wrap">
                Connect Freighter, Lobstr, or others
              </span>
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center mt-2">
                {error}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-border p-6 md:p-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setOption(null)}
          className="mb-4 -ml-4"
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
            <h2 className="text-xl font-semibold">Your New Wallet</h2>
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
            <h2 className="text-xl font-semibold">Import Seed</h2>
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
    </div>
  );
}
