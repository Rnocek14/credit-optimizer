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
  count: number | string | undefined;
  onClick: () => void;
  show: boolean;
  className?: string;
}) {
  // Coerce count to number (handles both string and number inputs)
  const n = count == null ? NaN : Number(count);
  
  // DIAGNOSTIC: Enhanced logging with call stack info
  if (process.env.NODE_ENV === 'development') {
    const reasons = [];
    if (!show) reasons.push('show flag is false');
    if (count === undefined) reasons.push('count is undefined');
    if (count === null) reasons.push('count is null');
    if (Number.isNaN(n)) reasons.push(`coerced to NaN: ${count} (${typeof count})`);
    if (Number.isFinite(n) && n <= 0) reasons.push(`count <= 0: ${n}`);
    
    if (reasons.length > 0) {
      console.log('[NodeOptionsPill] Not rendering:', { 
        rawCount: count, 
        rawType: typeof count,
        coercedN: n,
        show, 
        reasons 
      });
    } else {
      console.log('[NodeOptionsPill] RENDERING pill:', { rawCount: count, coercedN: n, show });
    }
  }
  
  // Only render for valid, positive counts
  if (!show || !Number.isFinite(n) || n <= 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={
        "px-2 py-0.5 rounded-full border text-xs bg-surface hover:bg-primary/10 border-border/50 hover:border-primary/50 transition-colors cursor-pointer pointer-events-auto z-10 " +
        className
      }
      title="View catalog course options that satisfy this requirement"
    >
      Options: {n}
    </button>
  );
}
