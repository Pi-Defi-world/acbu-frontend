'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useApiOpts } from '@/hooks/use-api';
import * as userApi from '@/lib/api/user';
import type { GuardianItem } from '@/types/api';

export default function GuardiansPage() {
  const opts = useApiOpts();
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    userApi.getGuardians(opts).then((data) => {
      setGuardians(data.guardians ?? []);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load guardians');
    }).finally(() => setLoading(false));
  }, [opts.token]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await userApi.deleteGuardian(id, opts);
      setGuardians((prev: GuardianItem[]) => prev.filter((g: GuardianItem) => g.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
            <h1 className="text-lg font-bold text-foreground">Guardians</h1>
          </div>
        </div>
        <PageContainer>
          <div className="animate-pulse space-y-2">
            <div className="h-14 bg-muted rounded-lg" />
            <div className="h-14 bg-muted rounded-lg" />
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Guardians</h1>
        </div>
      </div>
      <PageContainer>
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        <div className="space-y-2">
          {guardians.length === 0 ? (
            <Card className="border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No guardians yet. Add recovery guardians from the recovery flow.</p>
            </Card>
          ) : (
            guardians.map((g) => (
              <Card key={g.id} className="border-border p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">Guardian {g.id}</p>
                </div>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive shrink-0" onClick={() => handleDelete(g.id)}>Remove</Button>
              </Card>
            ))
          )}
        </div>
      </PageContainer>
    </>
  );
}
