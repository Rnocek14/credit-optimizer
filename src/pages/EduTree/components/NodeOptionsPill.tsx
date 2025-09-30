/**
 * Marketplace Options Pill Component
 * Single source of truth for displaying course options count on nodes
 */

export function NodeOptionsPill({
  count,
  onClick,
  show,
  className = '',
}: {
  count: number | undefined;
  onClick: () => void;
  show: boolean;
  className?: string;
}) {
  // DIAGNOSTIC: Log why pill might not render
  if (process.env.NODE_ENV === 'development') {
    if (!show) {
      console.log('[NodeOptionsPill] Not showing - show flag is false');
    } else if (!Number.isFinite(count)) {
      console.log('[NodeOptionsPill] Not showing - count not finite:', count, typeof count);
    } else if (Number(count) <= 0) {
      console.log('[NodeOptionsPill] Not showing - count <= 0:', count);
    }
  }
  
  // Only render for valid, positive counts
  if (!show || !Number.isFinite(count) || Number(count) <= 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={
        "px-2 py-0.5 rounded-full bg-surface border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer " +
        className
      }
      title="View catalog course options that satisfy this requirement"
    >
      Options: {count}
    </button>
  );
}
