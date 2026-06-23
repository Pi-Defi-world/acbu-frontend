/**
 * Error reporting utilities for the application
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  digest?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  level: 'app' | 'page' | 'component';
  context?: Record<string, unknown>;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private isEnabled: boolean = true;

  private constructor() {}

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * Report an error to external services
   */
  async reportError(error: Error, context: Partial<ErrorReport> = {}): Promise<void> {
    if (!this.isEnabled) return;

    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      level: 'component',
      ...context,
    };

    console.error('Error Report:', report);

    try {
      if (typeof window !== 'undefined') {
        const errors = this.getStoredErrors();
        errors.push(report);
        const recentErrors = errors.slice(-50);
        sessionStorage.setItem('app_errors', JSON.stringify(recentErrors));

        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors(): ErrorReport[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = sessionStorage.getItem('app_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('app_errors');
    }
  }

  /**
   * Enable or disable error reporting
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Global error handler for unhandled promise rejections and errors
export function setupGlobalErrorHandling(): void {
  if (typeof window === 'undefined') return;

  const reporter = ErrorReporter.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reporter.reportError(error, {
      level: 'app',
      context: { type: 'unhandledrejection' }
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    reporter.reportError(error, {
      level: 'app',
      context: { 
        type: 'uncaughterror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();