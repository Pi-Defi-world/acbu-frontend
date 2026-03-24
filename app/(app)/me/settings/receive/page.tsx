'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';

export default function ReceivePage() {
  const opts = useApiOpts();
  const [payUri, setPayUri] = useState<string>('');
  const [alias, setAlias] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userApi.getReceive(opts).then((data) => {
      if (!cancelled) {
        setPayUri((data.pay_uri as string) ?? (data.alias as string) ?? '');
        setAlias((data.alias as string) ?? '');
      }
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [opts.token]);

  const toCopy = payUri || alias;

  const fallbackCopy = (text: string): boolean => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopy = async () => {
    if (!toCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else if (!fallbackCopy(toCopy)) {
        throw new Error('Copy unsupported');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy — try selecting the address manually');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Receive</h1>
          </div>
        </div>
        <PageContainer>
          <Skeleton className="h-24 w-full" />
        </PageContainer>
      </>
    );
  }

  if (error && !toCopy) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Receive</h1>
          </div>
        </div>
        <PageContainer>
          <p className="text-destructive">{error}</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Receive</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        <Card className="border-border p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground break-all font-mono">{toCopy || '—'}</p>
          <Button variant="outline" className="border-border" onClick={handleCopy} disabled={!toCopy}>
            {copied ? 'Copied' : 'Copy address'}
          </Button>
        </Card>
      </PageContainer>
    </>
  );
}
