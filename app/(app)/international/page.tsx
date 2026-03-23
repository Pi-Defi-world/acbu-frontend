'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { ArrowLeft, Globe } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export default function InternationalPage() {
  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/business"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">International</h1>
        </div>
      </div>
      <PageContainer className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        <Empty className="border-none bg-transparent p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-16 rounded-2xl bg-primary/10 mb-4">
              <Globe className="size-8 text-primary" />
            </EmptyMedia>
            <EmptyTitle className="text-2xl font-bold tracking-tight">
              International Coverage
            </EmptyTitle>
            <EmptyDescription className="max-w-[280px] text-base text-muted-foreground/80 leading-relaxed">
              Global quoting, minting, and cross-border withdrawals are currently in development.
            </EmptyDescription>
          </EmptyHeader>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
        </Empty>
      </PageContainer>
    </>
  );
}
