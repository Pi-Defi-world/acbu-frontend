'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useApiOpts } from '@/hooks/use-api';
import * as transactionsApi from '@/lib/api/transactions';
import type { TransactionDetail } from '@/types/api';
import { formatAmount } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    transactionsApi.getTransaction(id, opts).then((res) => {
      if (!cancelled) setData(res);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, opts.token]);

  if (!id) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer><p className="text-muted-foreground">Invalid transaction ID.</p></PageContainer>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer><div className="animate-pulse h-32 bg-muted rounded-lg" /></PageContainer>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/activity"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          </div>
        </div>
        <PageContainer><p className="text-destructive">{error || 'Not found'}</p></PageContainer>
      </>
    );
  }

  const type = data.type ?? '—';
  const status = data.status ?? '—';

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/activity"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground truncate">Transaction</h1>
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
          {data.amount_acbu != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount (ACBU)</span>
              <span className="font-semibold">ACBU {formatAmount(data.amount_acbu)}</span>
            </div>
          )}
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
          {data.blockchain_tx_hash && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Transaction hash</p>
              <p className="text-xs font-mono break-all">{data.blockchain_tx_hash}</p>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
}
