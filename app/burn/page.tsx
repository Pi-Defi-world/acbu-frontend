"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import * as burnApi from "@/lib/api/burn";
import type { BurnRecipientAccount } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import { getWalletSecretAnyLocal } from "@/lib/wallet-storage";
import { Keypair } from "@stellar/stellar-sdk";
import { submitBurnRedeemSingleClient } from "@/lib/stellar/burning";

const formatCurrency = (amount: string, currency: string) => {
  const value = parseFloat(amount);
  if (isNaN(value)) return "";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
};

export default function BurnPage() {
  const opts = useApiOpts();
  const { userId, stellarAddress } = useAuth();
  const kit = useStellarWalletsKit();
  const [acbuAmount, setAcbuAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const recipientAccount: BurnRecipientAccount = {
    account_number: accountNumber.trim(),
    bank_code: bankCode.trim(),
    account_name: accountName.trim(),
    type: "bank",
  };

  const isValid =
    acbuAmount &&
    parseFloat(acbuAmount) > 0 &&
    currency.length === 3 &&
    accountNumber.trim().length >= 5 &&
    accountNumber.trim().length <= 20 &&
    bankCode.trim().length >= 3 &&
    bankCode.trim().length <= 10 &&
    accountName.trim().length >= 3 &&
    accountName.trim().length <= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);
    try {
      if (!userId) throw new Error("Not signed in");
      if (!stellarAddress) throw new Error("No linked Stellar wallet address.");
      const secret = await getWalletSecretAnyLocal(userId, stellarAddress);
      let burnTxHash: string;
      if (secret) {
        const localPubKey = Keypair.fromSecret(secret).publicKey();
        if (stellarAddress && localPubKey !== stellarAddress) {
          throw new Error(
            `Local wallet (${localPubKey.slice(0, 6)}…${localPubKey.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Re-import the correct seed from Settings, or update the wallet address, then retry.`,
          );
        }
        const submit = await submitBurnRedeemSingleClient({
          userAddress: stellarAddress,
          amountAcbu: acbuAmount,
          currency,
          userSecret: secret,
        });
        burnTxHash = submit.transactionHash;
      } else {
        if (!kit) {
          throw new Error(
            "Your wallet secret isn't available on this device and the wallet connector isn't ready yet. Please wait a moment and retry.",
          );
        }
        const address = await new Promise<string>((resolve, reject) => {
          kit
            .openModal({
              onWalletSelected: async (selectedOption: { id: string }) => {
                try {
                  kit.setWallet(selectedOption.id);
                  const { address } = await kit.getAddress();
                  resolve(address);
                } catch (err) {
                  reject(err);
                }
              },
            })
            .catch(reject);
        });
        if (stellarAddress && address !== stellarAddress) {
          throw new Error(
            `Connected wallet (${address.slice(0, 6)}…${address.slice(-4)}) doesn't match the account on record (${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}). Connect the correct wallet (or update your linked wallet), then retry.`,
          );
        }
        const submit = await submitBurnRedeemSingleClient({
          userAddress: stellarAddress,
          amountAcbu: acbuAmount,
          currency,
          external: { kit, address },
        });
        burnTxHash = submit.transactionHash;
      }
      const res = await burnApi.burnAcbu(
        acbuAmount,
        currency,
        recipientAccount,
        opts,
        burnTxHash,
      );
      setTxId(res.transaction_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Burn failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/mint"
            aria-label="Go back to Mint page" 
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"
          >
            <ArrowLeft className="w-5 h-5 text-primary" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Withdraw (Burn)</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4 space-y-4">
          <p className="text-muted-foreground text-sm">
            Burn ACBU and withdraw to your bank or mobile money account.
          </p>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {txId && (
            <p className="text-green-600 text-sm" role="status">
              Transaction submitted: {txId}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="acbu-amount-input"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                ACBU amount
              </label>
              <Input
                id="acbu-amount-input"
                name="acbu-amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="any"
                value={acbuAmount}
                onChange={(e) => setAcbuAmount(e.target.value)}
                className="border-border"
                aria-describedby="acbu-amount-hint"
              />
              <p id="acbu-amount-hint" className="text-xs text-muted-foreground mt-1">
                Enter the amount of ACBU to burn
              </p>
              {acbuAmount && (
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatCurrency(acbuAmount, currency)}
                </p>
              )}
            </div>

            <div>
              <label 
                htmlFor="currency-input"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                Currency (3 letters)
              </label>
              <Input
                id="currency-input"
                name="currency"
                placeholder="NGN"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value.toUpperCase().slice(0, 3))
                }
                className="border-border"
                maxLength={3}
                aria-describedby="currency-hint"
              />
              <p id="currency-hint" className="text-xs text-muted-foreground mt-1">
                3-letter currency code (e.g., NGN, USD, EUR)
              </p>
            </div>
            
            <div>
              <label 
                htmlFor="account-number-input"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                Account number
              </label>
              <Input
                id="account-number-input"
                name="account-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={20}
                placeholder="1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                className="border-border"
                aria-describedby="account-number-hint"
              />
              <p id="account-number-hint" className="text-xs text-muted-foreground mt-1">
                Your bank account number (5-20 digits)
              </p>
            </div>
            
            <div>
              <label 
                htmlFor="bank-code-input"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                Bank code
              </label>
              <Input
                id="bank-code-input"
                name="bank-code"
                type="text"
                maxLength={10}
                placeholder="Enter bank code"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value.slice(0, 10))}
                className="border-border"
                aria-describedby="bank-code-hint"
              />
              <p id="bank-code-hint" className="text-xs text-muted-foreground mt-1">
                Your bank's identification code (3-10 characters)
              </p>
            </div>
            
            <div>
              <label 
                htmlFor="account-name-input"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                Account name
              </label>
              <Input
                id="account-name-input"
                name="account-name"
                type="text"
                maxLength={100}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="border-border"
                aria-describedby="account-name-hint"
              />
              <p id="account-name-hint" className="text-xs text-muted-foreground mt-1">
                Full name on the bank account (3-100 characters)
              </p>
            </div>
            
            <Button
              type="submit"
              disabled={!isValid || loading}
              className="w-full"
              aria-label="Burn ACBU and withdraw funds"
            >
              {loading ? "Submitting..." : "Burn & Withdraw"}
            </Button>
          </form>
        </Card>
      </PageContainer>
    </>
  );
}