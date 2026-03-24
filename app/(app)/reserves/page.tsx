'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Database } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as reservesApi from '@/lib/api/reserves';
import type { ReservesResponse } from '@/types/api';

export default function ReservesPage() {
  const opts = useApiOpts();
  const [data, setData] = useState<ReservesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatReserveRatio = (value: ReservesResponse['reserve_ratio']) => {
    if (value == null) return '';
    if (typeof value === 'number') return `${value.toFixed(2)}×`;
    return `${value}×`;
  };

  useEffect(() => {
    let cancelled = false;
    reservesApi.getReserves(opts).then((res) => {
      if (!cancelled) setData(res);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load reserves');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me" className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Reserves</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : data ? (
          <Card className="border-border p-4 space-y-3">
            {data.reserve_ratio != null && (
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Reserve ratio</span>
                  <span className="text-xs text-muted-foreground">Reserves ÷ liabilities (ratio, 1.0 means fully backed).</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-medium">{formatReserveRatio(data.reserve_ratio)}</span>
                  <span className="text-xs text-muted-foreground">ratio</span>
                </div>
              </div>
            )}
            {data.health != null && (
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Health</span>
                  <span className="text-xs text-muted-foreground">Overall system status reported by the issuer.</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-medium">{data.health}</span>
                  <span className="text-xs text-muted-foreground">status</span>
                </div>
              </div>
            )}
            {Object.keys(data).filter((k) => !['reserve_ratio', 'health'].includes(k)).length > 0 && (
              <pre className="text-xs text-muted-foreground mt-2 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
            )}
            {data.reserve_ratio == null && data.health == null && Object.keys(data).length === 0 && (
              <p className="text-muted-foreground">No reserve data available.</p>
            )}
          </Card>
        ) : (
          <Card className="border-border p-4">
            <p className="text-muted-foreground">No reserves data.</p>
          </Card>
        )}
      </PageContainer>
    </>
  );
}
