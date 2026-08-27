"use client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet Setup | ACBU",
  description:
    "Set up your ACBU wallet by creating or importing a Stellar wallet for secure token management.",
};

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
// Dialog components were imported but not used in this page
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import * as userApi from "@/lib/api/user";
import { storeWalletSecret } from "@/lib/wallet-storage";
import {
  getPasscode,
  getTempPassphrase,
  clearTempPassphrase,
} from "@/lib/passcode-manager";
import { AlertCircle, CheckCircle, ChevronLeft, Lock } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";
import { logger } from "@/lib/logger";

/**
 * Wallet Setup Confirmation Page
 *
 * This page is shown after user signs up/signs in with a newly created wallet.
 * It allows the user to confirm and complete their wallet setup, then syncs
 * the wallet to the backend and calls postWalletConfirm to activate it.
 */
export default function WalletSetupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const { userId, stellarAddress, refreshStellarAddress, isAuthenticated } =
    useAuth();
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
      router.push(`/${locale}/auth/signin`);
      return;
    }

    // Guard: Check if passcode is available in memory
    const passcode = getPasscode();
    if (!passcode) {
      // Passcode lost on refresh, clear temp data and redirect to signin
      clearTempPassphrase();
      router.push(`/${locale}/auth/signin`);
      return;
    }

    // If user already has a wallet address, skip setup and go home
    if (stellarAddress && !getTempPassphrase()) {
      router.push(`/${locale}`);
      return;
    }

    // Check if we have an auto-generated passphrase from signin
    const autoGenPassphrase = getTempPassphrase();
    if (autoGenPassphrase) {
      setPassphrase(autoGenPassphrase);
      setOption(1); // Show the confirmation step
    }
  }, [isAuthenticated, stellarAddress, router, locale]);

  /**
   * Sync wallet to backend:
   * 1. Put wallet address to backend
   * 2. Store secret encrypted with passcode
   * 3. Call postWalletConfirm to complete activation
   */
  const syncWalletToBackend = async (secret: string): Promise<void> => {
    if (!userId) throw new Error("Not logged in");

    const passcode = getPasscode();
    if (!passcode) {
      throw new Error(
        "Passcode not available. Please log in again to set up your wallet.",
      );
    }

    const kp = Keypair.fromSecret(secret);
    const publicKey = kp.publicKey();

    // Step 1: Update wallet address on backend
    const result = await userApi.putWalletAddress(publicKey);
    if (
      !result?.ok ||
      (result.stellar_address && result.stellar_address !== publicKey)
    ) {
      throw new Error(
        "Backend did not accept the new wallet address. Please retry.",
      );
    }

    // Step 2: Store secret encrypted with passcode
    await storeWalletSecret(userId, secret, passcode);

    // Step 3: Confirm wallet activation on backend
    try {
      await userApi.postWalletConfirm({ wallet_address: publicKey });
    } catch (err) {
      logger.warn(
        "Wallet confirm failed, but wallet address was set. User can continue.",
        err,
      );
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

      // Clean up in-memory temp passphrase
      clearTempPassphrase();

      // Refresh user context to update stellar address
      await refreshStellarAddress();

      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push(`/${locale}`);
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

      // Clean up in-memory temp passphrase
      clearTempPassphrase();

      // Refresh user context
      await refreshStellarAddress();

      // Redirect to home after a brief delay
      setTimeout(() => {
        router.push(`/${locale}`);
      }, 1500);
    } catch (err: unknown) {
      setError(
        "Invalid seed or failed to import. " + ((err as Error).message || ""),
      );
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
            if (
              !result?.ok ||
              (result.stellar_address && result.stellar_address !== pubKey)
            ) {
              throw new Error(
                "Backend did not accept the wallet address. Please retry.",
              );
            }

            // Confirm wallet activation on backend
            try {
              await userApi.postWalletConfirm({ wallet_address: pubKey });
            } catch (err) {
              logger.warn(
                "Wallet confirm failed, but wallet address was set.",
                err,
              );
            }

            setSuccess("Wallet connected successfully!");
            await refreshStellarAddress();

            setTimeout(() => {
              router.push(`/${locale}`);
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
      <div className="page-header">
        <div className="px-4 py-3">
          <h1 className="page-title">Finish Wallet Setup</h1>
          <p className="text-muted-foreground text-xs">
            Complete your wallet activation
          </p>
        </div>
      </div>

      <PageContainer>
        <Card className="border-border space-y-6 p-6">
          {error && (
            <div
              id="wallet-setup-error"
              role="alert"
              className="border-destructive/30 bg-destructive/10 flex gap-3 rounded-lg border p-3"
            >
              <AlertCircle
                className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {!option ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                How would you like to set up your wallet?
              </p>

              <Button
                onClick={() => {
                  const kp = Keypair.random();
                  setPassphrase(kp.secret());
                  setOption(1);
                }}
                disabled={loading}
                className="flex h-auto w-full flex-col items-center py-4"
                variant="outline"
              >
                <span className="font-semibold">Generate New Wallet</span>
                <span className="text-muted-foreground mt-1 text-xs">
                  Let us create a secure wallet for you
                </span>
              </Button>

              <Button
                onClick={() => setOption(2)}
                disabled={loading}
                className="flex h-auto w-full flex-col items-center py-4"
                variant="outline"
              >
                <span className="font-semibold">Import Existing Seed</span>
                <span className="text-muted-foreground mt-1 text-xs">
                  Use an existing Stellar secret key
                </span>
              </Button>

              <Button
                onClick={handleConnectWallet}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-auto w-full flex-col items-center py-4"
              >
                <span className="font-semibold">
                  {loading ? "Connecting..." : "Connect External Wallet"}
                </span>
                <span className="text-primary-foreground/70 mt-1 text-xs">
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
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              {option === 1 && (
                <form onSubmit={handleGenerateConfirm} className="space-y-4">
                  <div>
                    <h2 className="mb-2 text-lg font-semibold">
                      Your New Wallet
                    </h2>

                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Your wallet secret will be encrypted with your account
                        passcode and stored securely on this device.
                      </p>
                    </div>

                    <p className="text-muted-foreground text-sm">
                      Please save this secret key somewhere safe. It is required
                      to recover your wallet if you switch devices.
                    </p>
                  </div>

                  <div className="bg-muted border-border max-h-32 overflow-y-auto rounded border p-3 font-mono text-xs break-all">
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
                    <h2 className="mb-2 text-lg font-semibold">Import Seed</h2>

                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        Your wallet secret will be encrypted with your account
                        passcode and stored securely on this device.
                      </p>
                    </div>

                    <p className="text-muted-foreground text-sm">
                      Enter your Stellar secret key (starts with 'S'). It will
                      be stored encrypted on this device.
                    </p>
                  </div>

                  <Input
                    id="import-seed"
                    type="password"
                    placeholder="Starts with S..."
                    value={importSeed}
                    onChange={(e) => setImportSeed(e.target.value)}
                    disabled={loading}
                    aria-describedby={error ? "wallet-setup-error" : undefined}
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
