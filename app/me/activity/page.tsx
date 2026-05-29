'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function MeActivityPage() {
  const router = useRouter();
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <Link href="/me" className="touch-target"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="page-title">My activity</h1>
        </div>
      </div>
      <PageContainer>
        <Card className="border-border p-4">
          <p className="text-muted-foreground mb-3">View your activity.</p>
          <button type="button" onClick={() => router.push('/activity')} className="text-primary font-medium">View all activity →</button>
        </Card>
      </PageContainer>
    </>
  );
}
