"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, AlertCircle, Key, Trash2 } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import { useAuth } from "@/contexts/auth-context";
import { removeStoredWallet, hasStoredWallet } from "@/lib/wallet-storage";
import * as userApi from "@/lib/api/user";

export default function WalletPage() {
  const opts = useApiOpts();
  const { userId, stellarAddress } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasLocalSecret, setHasLocalSecret] = useState(false);

  const loadWalletInfo = async () => {
    try {
      setLoading(true);
      setError("");
      if (userId) {
        const hasSecret = await hasStoredWallet(userId);
        setHasLocalSecret(hasSecret);
      }
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

  useEffect(() => {
    loadWalletInfo();
  }, [opts.token, userId]);

  const handleRemoveWallet = async () => {
    if (
      !window.confirm(
        "Remove this wallet from your account? Your local secret will be deleted and the backend will forget the address. You'll be prompted to set up a new wallet on next use.",
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Clear the backend's stellar address first so signin/modal logic can
      // cleanly re-issue or accept a new wallet. Doing this BEFORE wiping the
      // local seed means a failure here leaves the user in a consistent state
      // (seed still present, mint still works with the old address).
      await userApi.deleteWallet();

      if (userId) {
        await removeStoredWallet(userId);
      }

      setSuccess(
        "Wallet removed. Reloading so you can set up a fresh wallet…",
      );
      setHasLocalSecret(false);

      localStorage.setItem("force_wallet_setup", "true");

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove wallet");
      setLoading(false);
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
          <h1 className="text-lg font-bold text-foreground">Wallet Settings</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              {error && (
                <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex gap-2 rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4" /> Connected Stellar Address
                </label>
                {stellarAddress ? (
                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {stellarAddress}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No wallet connected.</p>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  Local Keystore
                </h3>
                <p className="text-xs text-muted-foreground">
                  {hasLocalSecret 
                    ? "Your secret key is stored on this device (IndexedDB)."
                    : "No secret key is stored on this device. You may be using an external wallet."}
                </p>
              </div>

              <div className="pt-6">
                <Button
                  variant="destructive"
                  className="w-full flex items-center gap-2"
                  onClick={handleRemoveWallet}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                  {hasLocalSecret ? "Remove Local Wallet" : "Reset Wallet Connection"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Removing your wallet will disconnect it from this device. 
                  You will need your secret phrase or external wallet to reconnect.
                </p>
              </div>
            </>
          )}
        </Card>
      </PageContainer>
    </>
  );
}
