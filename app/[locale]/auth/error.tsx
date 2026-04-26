'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporting';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    errorReporter.reportError(error, {
      level: 'page',
      context: {
        page: 'auth',
        digest: error.digest,
      }
    });
  }, [error]);

  const handleGoToSignIn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Authentication Error</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          There was an error with the authentication system. Please try signing in again.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-2">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={reset} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
        <Button onClick={handleGoToSignIn} variant="default" size="sm">
          <LogIn className="w-4 h-4 mr-2" />
          Sign in
        </Button>
      </div>
    </div>
  );
}