"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useApiOpts } from "@/hooks/use-api";
import * as transactionsApi from "@/lib/api/transactions";
import type { TransactionDetail } from "@/types/api";
import { formatAmount } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function shareTransaction(data: TransactionDetail) {
  const amount = data.amount_acbu != null
    ? `ACBU ${formatAmount(data.amount_acbu)}`
    : data.local_amount != null
    ? `${data.currency ?? ""} ${formatAmount(data.local_amount)}`
    : "—";
  const date = data.created_at ? formatDate(data.created_at) : "—";
  const hash = data.blockchain_tx_hash ?? "—";
  const url = window.location.href;

  const shareData = {
    title: "Transaction Receipt",
    text: `Amount: ${amount} | Date: ${date} | Hash: ${hash}`,
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {
      // User dismissed or share failed — no-op
    }
  } else {
    await navigator.clipboard.writeText(url);
  }
}

/**
 * Detailed view of a specific transaction by ID.
 */
export default function TransactionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const opts = useApiOpts();
  const [data, setData] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!data) return;
    await shareTransaction(data);
    if (!navigator.share) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    transactionsApi
      .getTransaction(id, opts)
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
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer>
          <p className="text-muted-foreground">Invalid transaction ID.</p>
        </PageContainer>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer>
          <Skeleton className="h-32 w-full" />
        </PageContainer>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer>
          <p className="text-destructive">{error || "Not found"}</p>
        </PageContainer>
      </>
    );
  }

  const type = data.type ?? "—";
  const status = data.status ?? "—";
  const isFiat = type === "mint" && data.currency && data.local_amount != null;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/activity">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground truncate flex-1">
            Transaction
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Share transaction"
          >
            <Share2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary">{type}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{status}</Badge>
          </div>
          {isFiat ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                {data.currency} {formatAmount(data.local_amount)}
              </span>
            </div>
          ) : data.amount_acbu != null ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                ACBU {formatAmount(data.amount_acbu)}
              </span>
            </div>
          ) : null}
          {data.usdc_amount != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">USDC</span>
              <span>{data.usdc_amount}</span>
            </div>
          )}
          {data.created_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(data.created_at)}</span>
            </div>
          )}
          {data.completed_at && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span>{formatDate(data.completed_at)}</span>
            </div>
          )}
          {data.note && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm text-foreground break-words">{data.note}</p>
            </div>
          )}
          {data.blockchain_tx_hash && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">
                Transaction hash
              </p>
              <p className="text-xs font-mono break-all">
                {data.blockchain_tx_hash}
              </p>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
}
