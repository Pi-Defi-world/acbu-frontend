'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Trash2, AlertTriangle, Key, Copy, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function SecurityPage() {
  const [copied, setCopied] = useState(false);
  const apiKey =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('acbu_api_key') || ''
      : '';

  const copyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      const el = document.createElement('textarea');
      el.value = apiKey;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings"><ArrowLeft className="w-5 h-5 text-primary" /></Link>
          <h1 className="text-lg font-bold text-foreground">Security</h1>
        </div>
      </div>
      <PageContainer>
        <div className="space-y-4">
          <Card className="border-border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-foreground truncate">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground truncate">Add an extra layer of security.</p>
              </div>
              <Switch />
            </div>
          </Card>

          <Card className="border-border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-foreground truncate">API Key</h2>
                <p className="text-sm text-muted-foreground truncate">Use this key to access the ACBU API.</p>
              </div>
            </div>
            {apiKey ? (
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary px-3 py-2 rounded-md break-all font-mono">
                  {apiKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyApiKey}
                  className="size-8 shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to generate an API key.
              </p>
            )}
          </Card>

          <Card className="border-destructive/20 border p-4">
            <div className="flex items-start gap-4">
              <div className="bg-destructive/10 p-2 rounded-full mt-0.5">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h2 className="text-base font-medium text-destructive truncate">Danger Zone</h2>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
