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
  context?: Record<string, any>;
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

    // Log to console for development
    console.error('Error Report:', report);

    try {
      // In production, you would send this to your error reporting service
      // Examples:
      // - Sentry: Sentry.captureException(error, { extra: report });
      // - LogRocket: LogRocket.captureException(error);
      // - Bugsnag: Bugsnag.notify(error, event => { event.addMetadata('context', report); });
      // - Custom API: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(report) });

      // For now, we'll just store it locally for debugging
      if (typeof window !== 'undefined') {
        const errors = this.getStoredErrors();
        errors.push(report);
        
        // Keep only the last 50 errors to prevent storage bloat
        const recentErrors = errors.slice(-50);
        localStorage.setItem('app_errors', JSON.stringify(recentErrors));
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
      const stored = localStorage.getItem('app_errors');
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
      localStorage.removeItem('app_errors');
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