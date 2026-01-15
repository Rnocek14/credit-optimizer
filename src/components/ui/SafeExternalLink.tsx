/**
 * SafeExternalLink - Single gate for all external URLs
 * 
 * This component wraps all external links with URL sanitization.
 * It prevents rendering of:
 * - Unverified URLs (url_status !== 'valid')
 * - Non-HTTPS URLs
 * - URLs not in the educational domain allowlist
 * - Fabricated/mock URLs
 * 
 * Usage:
 * <SafeExternalLink url={course.url} urlStatus={course.urlStatus}>
 *   View Course
 * </SafeExternalLink>
 */

import React from 'react';
import { ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeCourseUrl, normalizeUrlStatus, type UrlStatus } from '@/lib/urlValidation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface SafeExternalLinkProps {
  /** The URL to validate and render */
  url: string | null | undefined;
  /** Database verification status - accepts unknown for safety */
  urlStatus?: unknown;
  /** Link content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show external link icon */
  showIcon?: boolean;
  /** What to show when URL is unavailable: 'hidden' | 'disabled' | 'placeholder' */
  fallback?: 'hidden' | 'disabled' | 'placeholder';
  /** Custom fallback content (only used when fallback='placeholder') */
  fallbackContent?: React.ReactNode;
  /** Additional anchor attributes */
  title?: string;
  'aria-label'?: string;
}

/**
 * Safe external link component with built-in URL sanitization.
 * Uses the same validation logic as sanitizeCourseUrl().
 */
export function SafeExternalLink({
  url,
  urlStatus,
  children,
  className,
  showIcon = true,
  fallback = 'disabled',
  fallbackContent,
  title,
  'aria-label': ariaLabel,
}: SafeExternalLinkProps) {
  const safeUrl = sanitizeCourseUrl(url, urlStatus);
  const status = normalizeUrlStatus(urlStatus);
  
  // URL passed validation - render clickable link
  if (safeUrl) {
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 text-primary hover:underline',
          className
        )}
        title={title}
        aria-label={ariaLabel}
      >
        {children}
        {showIcon && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
      </a>
    );
  }
  
  // URL failed validation - handle fallback
  if (fallback === 'hidden') {
    return null;
  }
  
  if (fallback === 'placeholder' && fallbackContent) {
    return <>{fallbackContent}</>;
  }
  
  // Default: disabled state with tooltip explanation
  const tooltipMessage = status === 'unknown' 
    ? 'Link pending verification'
    : status === 'invalid'
    ? 'Link is unavailable'
    : 'Link not available';
  
  const StatusIcon = status === 'unknown' ? Clock : AlertCircle;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-muted-foreground cursor-not-allowed opacity-60',
            className
          )}
          aria-disabled="true"
          role="link"
        >
          {children}
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Safe alternative to window.open() for external URLs.
 * 
 * Usage:
 * onClick={() => safeOpenExternal(course.url, course.urlStatus)}
 * 
 * @returns true if URL was opened, false if blocked
 */
export function safeOpenExternal(
  url: string | null | undefined,
  urlStatus?: unknown
): boolean {
  const safeUrl = sanitizeCourseUrl(url, urlStatus);
  
  if (!safeUrl) {
    // URL failed validation - don't open
    return false;
  }
  
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Hook for URL validation state - useful for conditional rendering.
 * 
 * Usage:
 * const { safeUrl, isValid, status } = useSafeUrl(course.url, course.urlStatus);
 */
export function useSafeUrl(url: string | null | undefined, urlStatus?: unknown) {
  const safeUrl = sanitizeCourseUrl(url, urlStatus);
  const status = normalizeUrlStatus(urlStatus);
  
  return {
    safeUrl,
    isValid: safeUrl !== null,
    status,
    isPending: status === 'unknown',
    isInvalid: status === 'invalid',
  };
}

export default SafeExternalLink;
