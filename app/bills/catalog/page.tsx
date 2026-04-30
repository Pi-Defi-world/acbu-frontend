'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function BillsCatalogPage() {
  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/bills" className="flex items-center justify-center min-w-[44px] min-h-[44px] -m-2"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Bill catalog</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4">
          <p className="text-muted-foreground">Browse billers. Coming soon.</p>
        </Card>
      </PageContainer>
    </>
  );
}
