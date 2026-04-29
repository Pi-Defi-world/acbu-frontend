'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporting';

export default function ProfileError({
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
        page: 'profile',
        digest: error.digest,
      }
    });
  }, [error]);

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Profile Error</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          There was an error loading your profile. Please try again.
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
        <Button onClick={reset} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
        <Button onClick={handleGoHome} variant="default" size="sm">
          <Home className="w-4 h-4 mr-2" />
          Go home
        </Button>
      </div>
    </div>
  );
}
