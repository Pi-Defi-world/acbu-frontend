"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ArrowLeft } from "lucide-react";
import { useApiOpts, useApiError } from "@/hooks/use-api";
import * as ratesApi from "@/lib/api/rates";
import type { RatesResponse } from "@/types/api";

export default function RatesPage() {
  const opts = useApiOpts();
  const { error, handleError } = useApiError();
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const formatRate = (rate: number | undefined): string => {
    if (rate == null) return "—";
    if (rate === 0) return "0.00";

    // F-058: Significant digits policy
    // Use toPrecision(4) to get the most important digits, 
    // then Number() to strip trailing zeros, then toLocaleString for commas.
    const precision = 4;
    const formatted = Number(rate.toPrecision(precision));

    return formatted.toLocaleString(undefined, {
      useGrouping: true,
      maximumFractionDigits: 8, // Allow decimals for small numbers
    });
  };

  useEffect(() => {
    let cancelled = false;
    ratesApi
      .getRates(opts)
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch((e) => {
        if (!cancelled) handleError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.token]);

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/me"
            aria-label="Go back" 
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">Rates</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        {loading ? (
          <SkeletonList count={2} itemHeight="h-20" />
        ) : rates ? (
          <div className="space-y-2">
            {[
              { currency: "USD", rate: rates.acbu_usd },
              { currency: "EUR", rate: rates.acbu_eur },
              { currency: "GBP", rate: rates.acbu_gbp },
              { currency: "NGN", rate: rates.acbu_ngn },
              { currency: "KES", rate: rates.acbu_kes },
              { currency: "ZAR", rate: rates.acbu_zar },
              { currency: "RWF", rate: rates.acbu_rwf },
              { currency: "GHS", rate: rates.acbu_ghs },
              { currency: "EGP", rate: rates.acbu_egp },
              { currency: "MAD", rate: rates.acbu_mad },
              { currency: "TZS", rate: rates.acbu_tzs },
              { currency: "UGX", rate: rates.acbu_ugx },
              { currency: "XOF", rate: rates.acbu_xof },
            ]
              .filter(r => r.rate != null)
              .map((r) => (
                <Card key={r.currency} className="border-border p-4">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-foreground">
                      ACBU/{r.currency}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatRate(Number(r.rate))}
                    </p>
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
