import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { getTempPassphrase, clearTempPassphrase } from "@/lib/passcode-manager";
import { AlertCircle, ChevronLeft, Lock } from "lucide-react";
import { Keypair } from "@stellar/stellar-sdk";
import { useWalletSetup } from "@/hooks/use-wallet-setup";

export function WalletSetupModal() {
  const { userId, stellarAddress, refreshStellarAddress, isAuthenticated } = useAuth();
  const { generateWallet, importWallet, connectExternalWallet } = useWalletSetup();
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1: auto-generated, 2: import seed, 3: connect wallet
  const [option, setOption] = useState<number | null>(null);

  // For importing seed
  const [importSeed, setImportSeed] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      return;
    }
    
    const autoGenPassphrase = getTempPassphrase();
    const forceSetup = localStorage.getItem("force_wallet_setup");

    if (!stellarAddress || autoGenPassphrase || forceSetup) {
      setOpen(true);
      
      if (autoGenPassphrase) {
        setPassphrase(autoGenPassphrase);
        setOption(1);
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

  const handleGenerateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      await generateWallet(passphrase);
      await handleFinish();
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
      await importWallet(importSeed);
      await handleFinish();
    } catch (err: unknown) {
      setError("Invalid seed or failed to import. " + ((err as Error).message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setError("");

    setLoading(true);
    try {
      await connectExternalWallet();
      await handleFinish();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing the modal if the user doesn't have a wallet or needs to confirm passphrase
      const hasTempPassphrase = getTempPassphrase();
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
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Your wallet secret will be encrypted with your account passcode and stored securely on this device.
                  </p>
                </div>

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
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Your wallet secret will be encrypted with your account passcode and stored securely on this device.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Enter your Stellar secret key (starts with 'S'). It will be stored
                  encrypted on this device.
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
