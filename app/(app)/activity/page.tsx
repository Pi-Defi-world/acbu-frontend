'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, Clock } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as transfersApi from '@/lib/api/transfers';
import type { TransferItem } from '@/types/api';
import { formatAmount } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Activity feed page displaying a list of all transactions.
 */
export default function ActivityPage() {
  const opts = useApiOpts();
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    transfersApi.getTransfers(opts).then((data) => {
      if (!cancelled) setTransfers(data.transfers ?? []);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Activity</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {loading ? (
          <SkeletonList count={5} />
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-10 h-10" />}
            title="No transactions yet"
            description="Mint, burn, and transfer history will appear here."
          />
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <Link key={t.transaction_id} href={`/send/${t.transaction_id}`} className="block">
                <Card className="border-border p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">Transfer</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-foreground">AFK {formatAmount(t.amount_acbu)}</p>
                    <Badge variant="outline" className="text-xs mt-1">{t.status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
