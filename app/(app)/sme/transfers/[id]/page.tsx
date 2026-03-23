'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useApiOpts } from '@/hooks/use-api';
import * as smeApi from '@/lib/api/sme';
import { formatAmount } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Detailed view of an SME transfer.
 */
export default function SmeTransferDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const opts = useApiOpts();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    smeApi.getSmeTransfer(id, opts).then((res) => {
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
            <Link href="/sme/transfers"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transfer</h1>
          </div>
        </div>
        <PageContainer><p className="text-muted-foreground">Invalid ID.</p></PageContainer>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/sme/transfers"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transfer</h1>
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
            <Link href="/sme/transfers"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Transfer</h1>
          </div>
        </div>
        <PageContainer><p className="text-destructive">{error || 'Not found'}</p></PageContainer>
      </>
    );
  }

  const status = (data.status as string) ?? '—';
  const amount = (data.amount_acbu as string) ?? '—';
  const createdAt = (data.created_at as string) ?? '';
  const completedAt = (data.completed_at as string) ?? '';

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/sme/transfers"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground truncate">Transfer</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{status}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">ACBU {formatAmount(data.amount_acbu as string)}</span>
          </div>
          {createdAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(createdAt)}</span>
            </div>
          )}
          {completedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span>{formatDate(completedAt)}</span>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  );
}
