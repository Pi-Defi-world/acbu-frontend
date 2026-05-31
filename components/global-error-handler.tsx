'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandling } from '@/lib/error-reporting';

/**
 * Global error handler component that sets up unhandled error and promise rejection handlers
 * This should be mounted once at the root of the application
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Set up global error handling on mount
    setupGlobalErrorHandling();
    
    // Log that error handling is active
    if (process.env.NODE_ENV === 'development') {
      console.log('[GlobalErrorHandler] Error reporting initialized');
    }
  }, []);

  // This component doesn't render anything
  return null;
}
