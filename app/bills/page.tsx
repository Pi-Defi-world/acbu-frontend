"use client";

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
import { AlertCircle, CheckCircle, Zap, RefreshCw } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { CURRENCY } from "@/lib/currency";
import { logger } from "@/lib/logger";

const BILLS_ENABLED = process.env.NEXT_PUBLIC_BILLS_ENABLED === "true";

interface BillProvider {
  id: string;
  name: string;
  category: string;
  icon: string;
  minAmount: number;
  maxAmount: number;
  description: string;
}

const billProviders: BillProvider[] = [
  {
    id: "electricity",
    name: "Electricity (IKEDC/EKEDC)",
    category: "utilities",
    icon: "⚡",
    minAmount: 10,
    maxAmount: 5000,
    description: "Prepaid and postpaid electricity tokens",
  },
  {
    id: "airtime-mtn",
    name: "MTN Airtime & Data",
    category: "airtime",
    icon: "📱",
    minAmount: 1,
    maxAmount: 500,
    description: "Instant mobile recharge",
  },
  {
    id: "airtime-glo",
    name: "Glo Airtime & Data",
    category: "airtime",
    icon: "📱",
    minAmount: 1,
    maxAmount: 500,
    description: "Instant mobile recharge",
  },
  {
    id: "internet-smile",
    name: "Smile Internet",
    category: "internet",
    icon: "🌐",
    minAmount: 5,
    maxAmount: 2000,
    description: "4G LTE data bundles",
  },
  {
    id: "tv-dstv",
    name: "DStv Subscription",
    category: "tv",
    icon: "📺",
    minAmount: 15,
    maxAmount: 1000,
    description: "Cable TV package renewal",
  },
];

export default function BillsPage() {
  const [selectedProvider, setSelectedProvider] = useState<BillProvider | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paymentStep, setPaymentStep] = useState<"input" | "confirm" | "success">("input");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const mockBalance = 5000;

  const handleSelectProvider = (provider: BillProvider) => {
    setSelectedProvider(provider);
    setShowPayment(true);
    setPaymentStep("input");
    setAmount("");
    setReference("");
    setPaymentError(null);
  };

  const handlePaymentConfirm = () => {
    setPaymentError(null);
    setPaymentStep("confirm");
  };

  const handlePaymentExecute = async () => {
    setPaymentError(null);
    try {
      setPaymentStep("success");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Payment processing failed";
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

  return (
    <>
      <div className="border-border border-b">
        <div className="px-4 pt-6 pb-6">
          <h1 className="text-foreground mb-2 text-2xl font-bold">
            Bills & Subscriptions
          </h1>
          <p className="text-muted-foreground text-sm">
            Pay utilities, airtime, and recurring bills with ACBU
          </p>
        </div>
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
        <div className="space-y-3 px-4 py-6">
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
        </div>

        {/* Payment Dialog */}
        <AlertDialog open={showPayment} onOpenChange={setShowPayment}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {paymentStep === "input" && `Pay ${selectedProvider?.name}`}
                {paymentStep === "confirm" && "Confirm Payment"}
                {paymentStep === "success" && "Payment Successful"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {paymentStep === "input" && selectedProvider?.description}
                {paymentStep === "confirm" && `Pay ${CURRENCY} ${formatAmount(amount)} to ${selectedProvider?.name}`}
                {paymentStep === "success" && "Your bill payment has been processed."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {paymentStep === "input" && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Account / Meter Number
                  </label>
                  <Input
                    placeholder="Enter account or meter number"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Amount ({CURRENCY})
                  </label>
                  <Input
                    type="number"
                    placeholder={`Min: ${selectedProvider?.minAmount}, Max: ${selectedProvider?.maxAmount}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
      </PageContainer>
    </>
  );
}
