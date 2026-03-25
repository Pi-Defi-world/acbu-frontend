"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import * as userApi from "@/lib/api/user";
import type { ReceiveResponse, UserMe } from "@/types/api";

export default function WalletPage() {
  const opts = useApiOpts();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [hasMinBalance, setHasMinBalance] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    loadWalletInfo();
  }, [opts.token]);

  const loadWalletInfo = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch wallet receive address (Stellar address)
      const receiveData = (await userApi.getReceive(opts)) as ReceiveResponse;
      const address = (receiveData.pay_uri ?? receiveData.alias) as
        | string
        | undefined;

      if (address && address.length >= 56) {
        setWalletAddress(address);
        // Enable button if wallet has a valid Stellar address and is loaded
        // In production, you'd check for actual balance/funding status
        setHasMinBalance(true);
      }

      // Fetch user info to check wallet status
      const userData = (await userApi.getMe(opts)) as UserMe;
      // Check if wallet is already confirmed (could be added to UserMe response)
      // For now, we assume if we got here successfully, it's not confirmed
      setIsConfirmed(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load wallet information",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWallet = async () => {
    if (!walletAddress || confirming) return;

    try {
      setConfirming(true);
      setError("");

      // Call the wallet confirm API
      await userApi.postWalletConfirm(
        { wallet_address: walletAddress.trim() },
        opts,
      );

      setSuccess(true);
      setIsConfirmed(true);

      // Show success message for 2 seconds then redirect
      setTimeout(() => {
        window.location.href = "/me/settings";
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to confirm wallet. Please try again.";
      setError(errorMessage);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/me/settings"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Wallet</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-center font-medium text-foreground">
                Wallet confirmed successfully!
              </p>
              <p className="text-xs text-muted-foreground">Redirecting...</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Confirm your wallet to enable transactions. Your Stellar
                  wallet address will be verified and confirmed.
                </p>
              </div>

              {error && (
                <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {walletAddress && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Wallet Address
                  </label>
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {walletAddress}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleConfirmWallet}
                  disabled={!hasMinBalance || isConfirmed || confirming}
                  className="w-full bg-primary text-primary-foreground"
                >
                  {confirming
                    ? "Confirming..."
                    : isConfirmed
                      ? "Wallet Confirmed"
                      : "Confirm Wallet"}
                </Button>

                {!hasMinBalance && (
                  <p className="text-xs text-muted-foreground">
                    Wallet address is required to confirm your wallet.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </PageContainer>
    </>
  );
}
