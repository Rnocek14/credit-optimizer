/**
 * reportError — Centralized error reporting shim.
 * 
 * Currently logs to console. Wire to Sentry/PostHog/etc later
 * without touching any error boundary code.
 */
export function reportError(
  error: Error,
  context?: {
    name?: string;
    componentStack?: string;
    url?: string;
    userId?: string;
    [key: string]: unknown;
  }
): void {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...context,
  };

  // Always log in dev
  if (import.meta.env.DEV) {
    console.error(`[reportError${context?.name ? `:${context.name}` : ''}]`, error, errorReport);
  } else {
    // Production: log essential info only
    console.error(`[error:${context?.name || 'unknown'}]`, error.message);
  }

  // TODO: Wire to Sentry/PostHog here
  // e.g. Sentry.captureException(error, { extra: errorReport });
}
