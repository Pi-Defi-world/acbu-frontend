'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import * as authApi from '@/lib/api/auth';

const CHALLENGE_TOKEN_KEY = '2fa_challenge_token';

export default function TwoFactorPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challengeToken, setChallengeToken] = useState('');

  // Retrieve challenge token from sessionStorage (not from URL)
  // This prevents exposure via Referer headers, browser history, and server logs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem(CHALLENGE_TOKEN_KEY);
      if (token) {
        setChallengeToken(token);
      }
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!code || code.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }
      if (!challengeToken) {
        setError('Missing challenge. Please sign in again.');
        return;
      }

      const result = await authApi.verify2fa(challengeToken, code);
      login(result.api_key, result.user_id);
      // Clear challenge token from sessionStorage
      sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Authentication Code
              </label>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                maxLength={6}
                className="border-border text-center text-lg font-mono tracking-widest"
                disabled={loading}
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>

          {!challengeToken && (
            <p className="mt-4 text-sm text-destructive">
              Missing challenge token. <Link href="/auth/signin" className="underline">Sign in again</Link>.
            </p>
          )}
          <div className="mt-6">
            <div className="border-t border-border pt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                  Don't have access to your authenticator?
                </summary>
                <p className="mt-2 text-muted-foreground">
                  Contact support or use your backup codes if you saved them.
                </p>
              </details>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
