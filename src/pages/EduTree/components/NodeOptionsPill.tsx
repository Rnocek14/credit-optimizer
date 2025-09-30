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
  // DIAGNOSTIC: Enhanced logging with call stack info
  if (process.env.NODE_ENV === 'development') {
    const reasons = [];
    if (!show) reasons.push('show flag is false');
    if (count === undefined) reasons.push('count is undefined');
    if (count === null) reasons.push('count is null');
    if (!Number.isFinite(count)) reasons.push(`count not finite: ${count} (${typeof count})`);
    if (Number.isFinite(count) && Number(count) <= 0) reasons.push(`count <= 0: ${count}`);
    
    if (reasons.length > 0) {
      console.log('[NodeOptionsPill] Not rendering:', { count, show, reasons });
    } else {
      console.log('[NodeOptionsPill] RENDERING pill:', { count, show });
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
