"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import * as authApi from '@/lib/api/auth';
import { getPasscode } from '@/lib/passcode-manager';

const CHALLENGE_TOKEN_KEY = '2fa_challenge_token';

export default function TwoFactorPage() {
  const t = useTranslations('auth_2fa');

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border p-8 text-center">
          <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
        </Card>
      </div>
    }>
      <TwoFactorForm />
    </Suspense>
  );
}

function TwoFactorForm() {
  const t = useTranslations('auth_2fa');
  const router = useRouter();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedToken = sessionStorage.getItem(CHALLENGE_TOKEN_KEY);
    if (storedToken) {
      setChallengeToken(storedToken);
    }
    setChecked(true);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!code || code.length !== 6) {
        setError(t('errors.invalid_code'));
        return;
      }
      if (!challengeToken) {
        setError(t('errors.missing_challenge'));
        return;
      }

      // Guard: If passcode is missing after page refresh, require re-authentication
      const passcode = getPasscode();
      if (!passcode) {
        setError(t('errors.session_expired'));
        sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);
        setTimeout(() => router.push('/auth/signin'), 2000);
        return;
      }

      const result = await authApi.verify2fa(challengeToken, code);
      login(result.user_id, result.stellar_address);
      sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.verification_failed'));
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
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
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
              <label
                htmlFor="auth-code"
                className="text-sm font-medium text-foreground mb-2 block"
              >
                {t('code_label')}
              </label>
              <Input
                id="auth-code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
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
              {loading ? t('verifying') : t('verify')}
            </Button>
          </form>

          {checked && !challengeToken && (
            <p className="mt-4 text-sm text-destructive">
              {t('missing_challenge_token')}{" "}
              <Link href="/auth/signin" className="underline">
                {t('sign_in_again')}
              </Link>
              .
            </p>
          )}

          <div className="mt-6">
            <div className="border-t border-border pt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                  {t('no_authenticator_summary')}
                </summary>
                <p className="mt-2 text-muted-foreground">
                  {t('no_authenticator_body')}
                </p>
              </details>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
