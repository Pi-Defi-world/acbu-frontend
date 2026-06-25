"use client";

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transfer Details | ACBU',
  description: 'View detailed information about a specific ACBU transfer including recipient, amount, and status.',
};

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useApiOpts } from "@/hooks/use-api";
import * as transfersApi from "@/lib/api/transfers";
import { formatAmount, parseUtcDate } from "@/lib/utils";

function safeFormatDate(iso: string | undefined) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return '';
  }
}



/**
 * Detailed view of a specific transfer by ID.
 */
export default function TransferDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const opts = useApiOpts();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    transfersApi
      .getTransfer(id, opts)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, opts.token]);

  if (!id) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <Link href="/send" aria-label="Back to transfers">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="page-title">Transfer</h1>
          </div>
        </div>
        <PageContainer>
          <div role="alert" aria-live="polite">
            <p className="text-muted-foreground">Invalid transfer ID.</p>
          </div>
        </PageContainer>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <Link href="/send" aria-label="Back to transfers">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="page-title">Transfer</h1>
          </div>
        </div>
        <PageContainer>
          <div aria-label="Loading transfer details" aria-live="polite">
            <Skeleton className="h-32 w-full" />
            <span className="sr-only">Loading transfer information...</span>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <Link href="/send" aria-label="Back to transfers">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="page-title">Transfer</h1>
          </div>
        </div>
        <PageContainer>
          <div role="alert" aria-live="assertive">
            <p className="text-destructive">{error || "Not found"}</p>
          </div>
        </PageContainer>
      </>
    );
  }

  const status = (data.status as string) ?? "—";
  const type = (data.type as string) ?? "transfer";
  const createdAt = (data.created_at as string) ?? "";
  const completedAt = (data.completed_at as string) ?? "";
  const txHash = (data.blockchain_tx_hash as string) ?? "";
  const localCurrency = (data.local_currency as string) ?? "";
  const localAmount = (data.local_amount as string) ?? "";
  const amountAcbu = (data.amount_acbu as string) ?? "";
  const isFiatRecord = type === "mint" && !!localCurrency && !!localAmount;

  // Format status for better screen reader announcement
  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "Transaction completed successfully";
      case "pending":
        return "Transaction is pending processing";
      case "failed":
        return "Transaction failed";
      default:
        return `Transaction status: ${status}`;
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <Link href="/send" aria-label="Back to transfers">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="page-title truncate" title={`${isFiatRecord ? "Faucet" : "Transfer"}`}>
            {isFiatRecord ? "Faucet" : "Transfer"}
          </h1>
        </div>
      </div>
      
      <PageContainer>
        <main id="main-content" className="focus:outline-none" tabIndex={-1}>
          <Card 
            className="border-border p-4 space-y-4"
            aria-label={`${isFiatRecord ? "Faucet" : "Transfer"} details for transaction ${id}`}
          >
            {/* Status Section */}
            <div className="flex justify-between items-center">
              <span id="status-label" className="text-muted-foreground font-medium">
                Status
              </span>
              <Badge 
                variant="outline"
                aria-label={getStatusDescription(status)}
              >
                {status}
              </Badge>
            </div>

            {/* Amount Section */}
            <div className="flex justify-between items-center">
              <span id="amount-label" className="text-muted-foreground font-medium">
                Amount
              </span>
              <span 
                className="font-semibold"
                aria-labelledby="amount-label"
                aria-describedby="amount-value"
              >
                <span id="amount-value">
                  {isFiatRecord
                    ? `${localCurrency} ${formatAmount(localAmount)}`
                    : `ACBU ${formatAmount(amountAcbu)}`}
                </span>
              </span>
            </div>

            {/* Created Date */}
            {createdAt && (
              <div className="flex justify-between text-sm">
                <span id="created-label" className="text-muted-foreground font-medium">
                  Created
                </span>
                <time 
                  dateTime={new Date(createdAt).toISOString()}
                  aria-labelledby="created-label"
                >
                  {safeFormatDate(createdAt)}
                </time>
              </div>
            )}

            {/* Completed Date */}
            {completedAt && (
              <div className="flex justify-between text-sm">
                <span id="completed-label" className="text-muted-foreground font-medium">
                  Completed
                </span>
                <time 
                  dateTime={new Date(completedAt).toISOString()}
                  aria-labelledby="completed-label"
                >
                  {safeFormatDate(completedAt)}
                </time>
              </div>
            )}

            {/* Transaction Hash */}
            {txHash && (
              <div className="pt-2 border-t border-border">
                <p id="tx-hash-label" className="text-xs text-muted-foreground mb-1 font-medium">
                  Transaction hash
                </p>
                <p 
                  className="text-xs font-mono break-all"
                  aria-labelledby="tx-hash-label"
                >
                  {txHash}
                </p>
              </div>
            )}

            {/* Live region for dynamic updates */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {status === "completed" && "Transfer has been completed successfully."}
              {status === "pending" && "Transfer is pending processing."}
              {status === "failed" && "Transfer failed to process."}
            </div>
          </Card>
        </main>
      </PageContainer>
    </>
  );
}