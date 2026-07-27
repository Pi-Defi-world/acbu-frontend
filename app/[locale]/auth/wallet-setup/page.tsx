"use client";

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet Setup | ACBU',
  description: 'Set up your ACBU wallet by creating or importing a Stellar wallet for secure token management.',
};

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/contexts/auth-context";
import { getPasscode, getTempPassphrase, clearTempPassphrase } from "@/lib/passcode-manager";
import { AlertCircle, CheckCircle, ChevronLeft, Lock } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";
import { useWalletSetup } from "@/hooks/use-wallet-setup";

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

    // Guard: Check if passcode is available in memory
    const passcode = getPasscode();
    if (!passcode) {
      // Passcode lost on refresh, clear temp data and redirect to signin
      clearTempPassphrase();
      router.push("/auth/signin");
      return;
    }

    // If user already has a wallet address, skip setup and go home
    if (stellarAddress && !getTempPassphrase()) {
      router.push("/");
      return;
    }

    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = getTempPassphrase();
    if (autoGenPassphrase) {
      setPassphrase(autoGenPassphrase);
      setOption(1); // Show the confirmation step
    }
  }, [isAuthenticated, stellarAddress, router]);

  const { generateWallet, importWallet, connectExternalWallet } = useWalletSetup();

  const handleGenerateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passphrase) {
      setError("Passphrase is required.");
      return;
    }

    setLoading(true);
    try {
      await generateWallet(passphrase);
      setSuccess("Wallet set up successfully!");
      
      clearTempPassphrase();
      await refreshStellarAddress();
      
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
      await importWallet(importSeed);
      setSuccess("Wallet imported successfully!");
      
      clearTempPassphrase();
      await refreshStellarAddress();
      
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

    setLoading(true);
    try {
      await connectExternalWallet();
      setSuccess("Wallet connected successfully!");
      await refreshStellarAddress();
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to connect wallet");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="px-4 py-3">
          <h1 className="page-title">Finish Wallet Setup</h1>
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
                    
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-3">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Your wallet secret will be encrypted with your account passcode and stored securely on this device.
                      </p>
                    </div>

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
                    
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-3">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Your wallet secret will be encrypted with your account passcode and stored securely on this device.
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Enter your Stellar secret key (starts with 'S'). It will be stored
                      encrypted on this device.
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
