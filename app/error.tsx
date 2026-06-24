'use client';

import { useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporting';

function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('acbu_user_id');
  } catch {
    return null;
  }
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    errorReporter.reportError(error, {
      level: 'page',
      context: {
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        digest: error.digest,
        userId: getUserId(),
      },
    });
  }, [error]);

<<<<<<< HEAD
=======
  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleReset = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

>>>>>>> upstream/dev
  return (
<<<<<<< HEAD
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="rounded-full bg-red-100 p-3">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mt-1">An unexpected error occurred</p>
        {error.digest && <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>}
=======
    <div className="error-state">
      <div className="error-icon-wrapper">
        <AlertTriangle className="error-icon" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Page Error</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This page encountered an unexpected error. You can try again or return to the home page.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-2">
            Error ID: {error.digest}
          </p>
        )}

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Error Details (Development)
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono text-left overflow-auto max-h-32">
              <div className="text-red-600 dark:text-red-400 font-semibold">
                {error.name}: {error.message}
              </div>
              {error.stack && (
                <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleReset} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
        <Button onClick={handleGoHome} variant="default" size="sm">
          <Home className="w-4 h-4 mr-2" />
          Go home
        </Button>
>>>>>>> origin/dev
      </div>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}