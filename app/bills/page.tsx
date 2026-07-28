"use client";

import type { Metadata } from 'next';
import { CURRENCY } from '@/lib/currency';

export const metadata: Metadata = {
  title: `Bills | ${CURRENCY}`,
  description: `Pay utility bills, mobile airtime, and subscriptions easily with ${CURRENCY} tokens.`,
};

// F-020: Bills payment is gated behind NEXT_PUBLIC_BILLS_ENABLED.
// When false (default), users see an honest "coming soon" screen instead of
// a fake payment flow that only logs to the console.
const BILLS_ENABLED = process.env.NEXT_PUBLIC_BILLS_ENABLED === "true";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap,
  Droplet,
  Wifi,
  Phone,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { logger } from "@/lib/logger";
import * as billsApi from "@/lib/api/bills";
import { useApiOpts } from "@/hooks/use-api";

interface BillProvider {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  minAmount: number;
  maxAmount: number;
}

const billProviders: BillProvider[] = [
  {
    id: "electric",
    name: "Electricity",
    category: "Utilities",
    icon: <Zap className="h-6 w-6" />,
    description: "Pay your electric bill",
    minAmount: 100,
    maxAmount: 50000,
  },
  {
    id: "water",
    name: "Water",
    category: "Utilities",
    icon: <Droplet className="h-6 w-6" />,
    description: "Pay your water bill",
    minAmount: 50,
    maxAmount: 10000,
  },
  {
    id: "internet",
    name: "Internet",
    category: "Connectivity",
    icon: <Wifi className="h-6 w-6" />,
    description: "Pay your internet bill",
    minAmount: 200,
    maxAmount: 5000,
  },
  {
    id: "mobile",
    name: "Mobile Airtime",
    category: "Connectivity",
    icon: <Phone className="h-6 w-6" />,
    description: "Top up mobile balance",
    minAmount: 100,
    maxAmount: 20000,
  },
];

/**
 * Bill payment and history page.
 */
export default function BillsPage() {
  const opts = useApiOpts();
  const [activeTab, setActiveTab] = useState<"catalog" | "history">("catalog");
  const [selectedProvider, setSelectedProvider] = useState<BillProvider | null>(
    null,
  );
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<
    "input" | "confirm" | "success"
  >("input");

  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  // Payment error state: shown when the bill payment API call fails.
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const mockBalance = 5280.5;
  const mockHistory = [
    {
      id: 1,
      provider: "Electricity",
      amount: 2500,
      date: "2024-02-01",
      status: "completed",
      reference: "ELC-001234",
    },
    {
      id: 2,
      provider: "Internet",
      amount: 800,
      date: "2024-01-28",
      status: "completed",
      reference: "INT-001233",
    },
    {
      id: 3,
      provider: "Mobile Airtime",
      amount: 500,
      date: "2024-01-25",
      status: "completed",
      reference: "MOB-001232",
    },
  ];

  const handleSelectProvider = (provider: BillProvider) => {
    setSelectedProvider(provider);
    setShowPayment(true);
    setPaymentStep("input");
    setAmount("");
    setReference("");
  };

  const handlePaymentConfirm = () => {
    if (!amount || parseFloat(amount) < (selectedProvider?.minAmount || 0)) {
      return;
    }
    // safely log the initiation
    logger.info("Bill payment initiated", {
      provider: selectedProvider?.id,
      amount,
    });
    setPaymentStep("confirm");
  };

  const handlePaymentExecute = async () => {
    setPaymentError(null);
    logger.info("Executing bill payment", { provider: selectedProvider?.id }); // safe log
    try {
      await billsApi.payBill(
        {
          biller_id: selectedProvider?.id,
          amount,
          reference: reference || undefined,
        },
        opts,
      );
      setPaymentStep("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again.";
      setPaymentError(message);
      logger.error("Bill payment failed", { error: message });
    }
  };

  const resetPayment = () => {
    setShowPayment(false);
    setPaymentStep("input");
    setAmount("");
    setReference("");
    setSelectedProvider(null);
    setPaymentError(null);
  };

  // Feature flag gate — show honest copy instead of the stub flow (F-020).
  if (!BILLS_ENABLED) {
    return (
      <div className="pb-20">
        <div className="border-border border-b px-4 pt-6 pb-6">
          <h1 className="text-foreground mb-2 text-2xl font-bold">Bills</h1>
          <p className="text-muted-foreground text-sm">
            Pay bills and subscriptions easily
          </p>
        </div>
        <PageContainer>
          <Card className="border-border mt-6 flex flex-col items-center gap-4 p-8 text-center">
            <Zap className="text-muted-foreground h-10 w-10" />
            <div>
              <h2 className="text-foreground mb-1 text-lg font-semibold">
                Coming soon
              </h2>
              <p className="text-muted-foreground max-w-xs text-sm">
                Bill payments are not yet available. We&apos;ll notify you when
                this feature launches.
              </p>
            </div>
          </Card>
        </PageContainer>
      </div>
    );
  }

                <PageContainer>
                    {/* Balance Card */}
                    <div className="mb-5">
                        <Card className="border-border bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
                            <p className="text-sm font-medium opacity-90">
                                Available Balance
                            </p>
                            <p className="text-3xl font-bold">
                                {CURRENCY} {formatAmount(mockBalance)}
                            </p>
                        </Card>
                    </div>

        <PageContainer>
          {/* Balance Card */}
          <div className="mb-5">
            <Card className="border-border from-primary to-secondary text-primary-foreground bg-gradient-to-br p-6">
              <p className="text-sm font-medium opacity-90">
                Available Balance
              </p>
              <p className="text-3xl font-bold">
                ACBU {formatAmount(mockBalance)}
              </p>
            </Card>
          </div>

                        {/* Catalog Tab */}
                        <TabsContent
                            value="catalog"
                            className="px-4 py-6 space-y-3"
                        >
                            {billProviders.map((provider) => (
                                <Card
                                    key={provider.id}
                                    className="border-border p-4 cursor-pointer hover:bg-muted transition-colors"
                                    onClick={() =>
                                        handleSelectProvider(provider)
                                    }
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-primary flex-shrink-0 mt-1">
                                            {provider.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground mb-0.5">
                                                {provider.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {provider.description}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {CURRENCY}{" "}
                                                    {formatAmount(
                                                        provider.minAmount,
                                                    )}{" "}
                                                    - ACBU{" "}
                                                    {formatAmount(
                                                        provider.maxAmount,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </TabsContent>

            {/* Catalog Tab */}
            <TabsContent value="catalog" className="space-y-3 px-4 py-6">
              {billProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="border-border hover:bg-muted cursor-pointer p-4 transition-colors"
                  onClick={() => handleSelectProvider(provider)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-primary mt-1 flex-shrink-0">
                      {provider.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground mb-0.5 font-semibold">
                        {provider.name}
                      </h3>
                      <p className="text-muted-foreground mb-2 text-xs">
                        {provider.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          ACBU {formatAmount(provider.minAmount)} - ACBU{" "}
                          {formatAmount(provider.maxAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

                {/* Payment Dialog */}
                <AlertDialog open={showPayment} onOpenChange={setShowPayment}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {paymentStep === "input" &&
                                    `Pay ${selectedProvider?.name}`}
                                {paymentStep === "confirm" && "Confirm Payment"}
                                {paymentStep === "success" &&
                                    "Payment Successful"}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {paymentStep === "input" &&
                                    selectedProvider?.description}
                                {paymentStep === "confirm" &&
                                    `Pay ${CURRENCY} ${formatAmount(amount)} to ${selectedProvider?.name}`}
                                {paymentStep === "success" &&
                                    "Your bill payment has been processed."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {paymentStep === "input" && (
                            <div className="space-y-4 py-4">
                                <div>
                                    <label
                                        htmlFor="payment-amount"
                                        className="form-label"
                                    >
                                        Amount
                                    </label>
                                    <div className="flex gap-2">
                                        <span className="flex items-center text-muted-foreground">
                                            {CURRENCY}
                                        </span>
                                        <Input
                                            id="payment-amount"
                                            type="number"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={(e) =>
                                                setAmount(e.target.value)
                                            }
                                            className="border-border"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Min: {CURRENCY}{" "}
                                        {formatAmount(
                                            selectedProvider?.minAmount,
                                        )}{" "}
                                        | Max: {CURRENCY}{" "}
                                        {formatAmount(
                                            selectedProvider?.maxAmount,
                                        )}
                                    </p>
                                </div>

            {paymentStep === "input" && (
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="payment-amount" className="form-label">
                    Amount
                  </label>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground flex items-center">
                      ACBU
                    </span>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="border-border"
                    />
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Min: ACBU {formatAmount(selectedProvider?.minAmount)} | Max:
                    ACBU {formatAmount(selectedProvider?.maxAmount)}
                  </p>
                </div>

                        {paymentStep === "confirm" && (
                            <div className="py-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Provider:
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {selectedProvider?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Amount:
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {CURRENCY} {formatAmount(amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-border pt-2">
                                    <span className="text-muted-foreground">
                                        Fee:
                                    </span>
                                    <span className="font-medium text-foreground">
                                        Free
                                    </span>
                                </div>
                            </div>
                        )}

            {paymentStep === "confirm" && (
              <div className="space-y-2 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="text-foreground font-medium">
                    {selectedProvider?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground font-medium">
                    ACBU {formatAmount(amount)}
                  </span>
                </div>
                <div className="border-border flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="text-foreground font-medium">Free</span>
                </div>
                {paymentError && (
                  <div className="border-destructive/30 bg-destructive/5 text-destructive mt-2 flex items-start gap-2 rounded-lg border p-3 text-xs">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{paymentError}</p>
                  </div>
                )}
              </div>
            )}

            {paymentStep === "success" && (
              <div className="py-4 text-center">
                <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
                <p className="text-muted-foreground mb-4 text-sm">
                  Transaction reference: TXN_
                  {Date.now().toString().slice(-8)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {paymentStep !== "success" && (
                <AlertDialogCancel onClick={resetPayment}>
                  {paymentStep === "input" ? "Close" : "Cancel"}
                </AlertDialogCancel>
              )}
              {paymentStep === "input" && (
                <AlertDialogAction
                  onClick={handlePaymentConfirm}
                  disabled={
                    !amount ||
                    parseFloat(amount) < (selectedProvider?.minAmount || 0)
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </AlertDialogAction>
              )}
              {paymentStep === "confirm" && (
                <AlertDialogAction
                  onClick={handlePaymentExecute}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {paymentError ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </span>
                  ) : (
                    "Pay Now"
                  )}
                </AlertDialogAction>
              )}
              {paymentStep === "success" && (
                <AlertDialogAction
                  onClick={resetPayment}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Done
                </AlertDialogAction>
              )}
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
