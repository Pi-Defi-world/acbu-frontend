'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Trash2, AlertTriangle, Globe, Key, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

type SessionItem = {
  id: string;
  device: string;
  location: string;
  lastSeen: string;
  current: boolean;
};

type ApiKeyItem = {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string;
};

export default function SecurityPage() {
  const [is2faEnabled, setIs2faEnabled] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([
    { id: 'current', device: 'Current device', location: 'Your location', lastSeen: 'Now', current: true },
    { id: 'desktop-01', device: 'Desktop — Chrome', location: 'Lagos, NG', lastSeen: '2 hours ago', current: false },
    { id: 'mobile-02', device: 'Mobile — Safari', location: 'Abuja, NG', lastSeen: 'Yesterday', current: false },
  ]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([
    { id: 'key-1', name: 'Trading bot', createdAt: 'Mar 12, 2026', lastUsed: 'Today' },
  ]);
  const [message, setMessage] = useState<string>('');

  const activeSessionCount = useMemo(() => sessions.length, [sessions]);

  const revokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setMessage('Session revoked successfully.');
  };

  const revokeApiKey = (keyId: string) => {
    setApiKeys((prev) => prev.filter((key) => key.id !== keyId));
    setMessage('API key revoked successfully.');
  };

  const createApiKey = () => {
    const id = `key-${Date.now()}`;
    setApiKeys((prev) => [
      ...prev,
      {
        id,
        name: `New key ${prev.length + 1}`,
        createdAt: 'Today',
        lastUsed: 'Never',
      },
    ]);
    setMessage('New API key created. Copy it before leaving the page.');
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/me/settings">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">Security</h1>
            <p className="text-sm text-muted-foreground">Manage account protection, sessions, and API access.</p>
          </div>
        </div>
      </div>

      <PageContainer>
        <div className="space-y-4">
          {message && (
            <Card className="border-border p-4 bg-surface">
              <p className="text-sm text-foreground">{message}</p>
            </Card>
          )}

          <Card className="border-border p-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-foreground">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground">Protect your account with an additional security step on sign in.</p>
              </div>
              <Switch checked={is2faEnabled} onCheckedChange={setIs2faEnabled} />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {is2faEnabled ? '2FA is enabled on this account.' : '2FA is currently disabled.'}
              </p>
              <Button variant="outline" onClick={() => setMessage('Rotate device flow started.')}>
                <Zap className="w-4 h-4 mr-2" />
                Rotate Device
              </Button>
            </div>
          </Card>

          <Card className="border-border p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-medium text-foreground">Active Sessions</h2>
                <p className="text-sm text-muted-foreground">Review signed-in sessions and revoke any compromised access.</p>
              </div>
              <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-medium text-secondary-foreground">
                {activeSessionCount} active
              </span>
            </div>
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{session.device}</p>
                    <p className="text-sm text-muted-foreground">{session.location}</p>
                    <p className="text-xs text-muted-foreground">Last seen: {session.lastSeen}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.current ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Current session</span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => revokeSession(session.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              )}
            </div>
          </Card>

          <Card className="border-border p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-medium text-foreground">API Keys</h2>
                <p className="text-sm text-muted-foreground">Generate API keys for programmatic access.</p>
              </div>
            </div>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{key.name}</p>
                    <p className="text-xs text-muted-foreground">Created: {key.createdAt}</p>
                    <p className="text-xs text-muted-foreground">Last used: {key.lastUsed}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => revokeApiKey(key.id)}>
                    Revoke
                  </Button>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <p className="text-sm text-muted-foreground">No API keys created yet.</p>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={createApiKey} className="w-full sm:w-auto">
                <Globe className="w-4 h-4 mr-2" />
                Create API key
              </Button>
            </div>
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
