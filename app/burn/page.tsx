"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useApiOpts } from "@/hooks/use-api";
import { useApiError } from "@/hooks/use-api-error";
import { ApiErrorDisplay } from "@/components/ui/api-error-display";
import * as burnApi from "@/lib/api/burn";
import type { BurnRecipientAccount } from "@/types/api";
import { useAuth } from "@/contexts/auth-context";
import { useStellarWalletsKit } from "@/lib/stellar-wallets-kit";
import { getWalletSecretAnyLocal } from "@/lib/wallet-storage";
import { Keypair } from "@stellar/stellar-sdk";
import { submitBurnRedeemSingleClient } from "@/lib/stellar/burning";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const burnSchema = z.object({
  acbuAmount: z.string().refine((val: string) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  currency: z.string().length(3, "Currency must be exactly 3 uppercase letters"),
  accountNumber: z.string(),
  bankCode: z.string(),
  accountName: z.string()
    .min(3, "Account name is too short")
    .max(100, "Account name is too long"),
}).superRefine((data: any, ctx: any) => {
  if (data.currency === "NGN") {
    if (!/^\d{10}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nigerian account numbers (NUBAN) must be exactly 10 digits",
        path: ["accountNumber"],
      });
    }
    if (!/^\d{3}$/.test(data.bankCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nigerian bank codes must be 3 digits",
        path: ["bankCode"],
      });
    }
  } else if (data.currency === "KES") {
    if (!/^\d{5,15}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kenyan account numbers are typically 5 to 15 digits",
        path: ["accountNumber"],
      });
    }
    if (!/^[A-Za-z0-9]{3,10}$/.test(data.bankCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kenyan bank codes must be 3-10 alphanumeric characters",
        path: ["bankCode"],
      });
    }
  } else {
    // Generic fallback for other currencies
    if (!/^\d+$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account number must contain only digits",
        path: ["accountNumber"],
      });
    } else if (data.accountNumber.length < 5 || data.accountNumber.length > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account number must be between 5 and 20 digits",
        path: ["accountNumber"],
      });
    }
    
    if (!/^[A-Za-z0-9]+$/.test(data.bankCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bank code must be alphanumeric",
        path: ["bankCode"],
      });
    } else if (data.bankCode.length < 3 || data.bankCode.length > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bank code must be between 3 and 10 characters",
        path: ["bankCode"],
      });
    }
  }
});

type BurnFormValues = z.infer<typeof burnSchema>;

const formatCurrency = (amount: string, currency: string) => {
  const value = parseFloat(amount);
  if (isNaN(value)) return "";

  try {
    return new Intl.NumberFormat(typeof navigator !== 'undefined' ? navigator.language : 'en-US', {
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
  const { uiError, setApiError, clearError, isSubmitDisabled } = useApiError();
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const form = useForm<BurnFormValues>({
    resolver: zodResolver(burnSchema),
    defaultValues: {
      acbuAmount: "",
      currency: "NGN",
      accountNumber: "",
      bankCode: "",
      accountName: "",
    },
    mode: "onChange",
  });

  const currency = form.watch("currency");
  const isValid = form.formState.isValid;

  const onSubmit = async (values: BurnFormValues) => {
    clearError();
    setLoading(true);
    setTxId(null);
    
    try {
      if (!userId) throw new Error("Not signed in");
      if (!stellarAddress) throw new Error("No linked Stellar wallet address.");
      
      const recipientAccount: BurnRecipientAccount = {
        account_number: values.accountNumber.trim(),
        bank_code: values.bankCode.trim(),
        account_name: values.accountName.trim(),
        type: "bank",
      };

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
          amountAcbu: values.acbuAmount,
          currency: values.currency,
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
          amountAcbu: values.acbuAmount,
          currency: values.currency,
          external: { kit, address },
        });
        burnTxHash = submit.transactionHash;
      }

      const res = await burnApi.burnAcbu(
        values.acbuAmount,
        values.currency,
        recipientAccount,
        opts,
        burnTxHash,
      );
      setTxId(res.transaction_id);
      form.reset({ ...values, acbuAmount: "" });
    } catch (e: any) {
      // Handle server-side validation errors if they follow a specific format
      if (e?.status === 400 && e?.details) {
        const details = e.details as any;
        const errors = details.errors || (details.error && typeof details.error === 'object' ? details.error : null);
        
        if (errors && typeof errors === 'object') {
          Object.entries(errors).forEach(([key, msg]) => {
            const formKey = key === 'account_number' ? 'accountNumber' :
                            key === 'bank_code' ? 'bankCode' :
                            key === 'account_name' ? 'accountName' :
                            key === 'acbu_amount' ? 'acbuAmount' :
                            key as any;
            
            if (['accountNumber', 'bankCode', 'accountName', 'acbuAmount', 'currency'].includes(formKey)) {
              form.setError(formKey as any, { type: 'server', message: msg as string });
            }
          });
        } else {
          setApiError(e);
        }
      } else {
        setApiError(e);
      }
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
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Withdraw (Burn)</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4 space-y-4">
          <p className="text-muted-foreground text-sm">
            Burn ACBU and withdraw to your bank or mobile money account.
          </p>
          {uiError && (
            <ApiErrorDisplay error={uiError} onDismiss={clearError} />
          )}
          
          {txId && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-green-600 text-sm font-medium">
                Transaction submitted successfully! ID: {txId}
              </p>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="acbuAmount"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>ACBU amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="any"
                        {...field}
                        className="border-border"
                      />
                    </FormControl>
                    <FormDescription>
                      The amount of ACBU tokens to burn for withdrawal.
                      {field.value && (
                        <span className="block mt-1">
                          ≈ {formatCurrency(field.value, currency)}
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Currency (3 letters)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="NGN"
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value.toUpperCase().slice(0, 3);
                          field.onChange(val);
                        }}
                        className="border-border"
                        maxLength={3}
                      />
                    </FormControl>
                    <FormDescription>
                      The target currency for your withdrawal (e.g., NGN, KES).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Account number</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234567890"
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value.replace(/\D/g, "");
                          field.onChange(val);
                        }}
                        className="border-border"
                        maxLength={20}
                      />
                    </FormControl>
                    <FormDescription>
                      {currency === "NGN" 
                        ? "Nigerian NUBAN accounts must be 10 digits." 
                        : currency === "KES"
                        ? "Kenyan account numbers are typically 5-15 digits."
                        : "Standard bank account number (digits only)."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankCode"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Bank code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={currency === "NGN" ? "044" : "Enter bank code"}
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value.toUpperCase().slice(0, 10);
                          field.onChange(val);
                        }}
                        className="border-border"
                        maxLength={10}
                      />
                    </FormControl>
                    <FormDescription>
                      {currency === "NGN"
                        ? "3-digit CBN bank code."
                        : currency === "KES"
                        ? "Bank routing code or SWIFT/BIC."
                        : "Sort code, SWIFT/BIC, or local bank routing code."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountName"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Account name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="John Doe"
                        {...field}
                        className="border-border"
                        maxLength={100}
                      />
                    </FormControl>
                    <FormDescription>
                      The official name registered with the bank.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={!isValid || loading || isSubmitDisabled}
                className="w-full"
              >
                {loading ? "Submitting..." : "Burn & Withdraw"}
              </Button>
            </form>
          </Form>
        </Card>
      </PageContainer>
    </>
  );
}
