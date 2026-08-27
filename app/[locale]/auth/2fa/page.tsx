"use client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Two-Factor Authentication | ACBU",
  description:
    "Complete two-factor authentication to secure your ACBU account login.",
};

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import * as authApi from "@/lib/api/auth";
import { getPasscode } from "@/lib/passcode-manager";
import { isSafeRedirect } from "@/lib/redirect";

const CHALLENGE_TOKEN_KEY = "2fa_challenge_token";
const POST_AUTH_REDIRECT_KEY = "post_auth_redirect";

export default function TwoFactorPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <Card className="border-border w-full max-w-md p-8 text-center">
            <div className="text-muted-foreground animate-pulse">
              Loading...
            </div>
          </Card>
        </div>
      }
    >
      <TwoFactorForm />
    </Suspense>
  );
}

function TwoFactorForm() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedToken = sessionStorage.getItem(CHALLENGE_TOKEN_KEY);
    const passcode = getPasscode();
    if (storedToken && passcode) {
      setChallengeToken(storedToken);
    } else {
      // Always require a fresh challenge — clear stale token on mount
      sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);
    }
    setChecked(true);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!code || code.length !== 6) {
        setError("Please enter a valid 6-digit code");
        return;
      }
      if (!challengeToken) {
        setError("Missing challenge. Please sign in again.");
        return;
      }

      const result = await authApi.verify2fa(challengeToken, code);
      login(result.user_id, result.stellar_address);
      sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);

      // honor a stored safe post-auth redirect if present
      const stored =
        typeof window !== "undefined"
          ? sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)
          : null;
      if (typeof window !== "undefined")
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      const safe = isSafeRedirect(stored);
      router.push(safe ?? `/${locale}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="border-border w-full max-w-md">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-foreground mb-2 text-2xl font-bold md:text-3xl">
              Two-Factor Authentication
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div
                id="twofa-error"
                role="alert"
                className="border-destructive/30 bg-destructive/10 flex gap-3 rounded-lg border p-3"
              >
                <AlertCircle
                  className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="auth-code" className="form-label">
                Authentication Code
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
                className="border-border text-center font-mono text-lg tracking-widest"
                disabled={loading}
                autoFocus
                aria-describedby={error ? "twofa-error" : undefined}
              />
            </div>

            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </form>

          {checked && !challengeToken && (
            <p className="text-destructive mt-4 text-sm">
              Missing challenge token.{" "}
              <Link href={`/${locale}/auth/signin`} className="underline">
                Sign in again
              </Link>
              .
            </p>
          )}

          <div className="mt-6">
            <div className="border-border border-t pt-4">
              <details className="text-sm">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer font-medium">
                  Don't have access to your authenticator?
                </summary>
                <p className="text-muted-foreground mt-2">
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
