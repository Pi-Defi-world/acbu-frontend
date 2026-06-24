'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'app' | 'page' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    errorReporter.reportError(error, {
      level: this.props.level ?? 'component',
      context: {
        componentStack: errorInfo.componentStack,
        boundary: 'ErrorBoundary',
      },
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-4 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1">An unexpected error occurred</p>
          </div>
          <Button onClick={this.handleReset} variant="outline">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
