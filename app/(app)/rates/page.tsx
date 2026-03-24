'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as ratesApi from '@/lib/api/rates';
import type { RatesResponse } from '@/types/api';

export default function RatesPage() {
  const opts = useApiOpts();
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    ratesApi.getRates(opts).then((data) => {
      if (!cancelled) setRates(data);
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load rates');
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
          <h1 className="text-lg font-bold text-foreground">Rates</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {loading ? (
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
          </div>
        ) : rates?.rates?.length ? (
          <div className="space-y-2">
            {(rates.rates as Array<{ currency?: string; rate?: number }>).map((r) => (
              <Card key={r.currency ?? r.rate} className="border-border p-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-foreground">{r.currency ?? 'Rate'}</p>
                  <p className="text-lg font-bold text-primary">{r.rate != null ? String(r.rate) : '—'}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border p-4">
            <p className="text-muted-foreground">No rates available.</p>
          </Card>
        )}
      </PageContainer>
    </>
  );
}
