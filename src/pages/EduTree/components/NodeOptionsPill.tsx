/**
 * Marketplace Options Pill Component
 * Single source of truth for displaying course options count on nodes
 */

export function NodeOptionsPill({
  count,
  onClick,
  show,
  className = '',
  data,
  nodeId,
}: {
  count?: number | string | undefined;
  onClick: () => void;
  show?: boolean;
  className?: string;
  data?: any;
  nodeId?: string;
}) {
  // DIAGNOSTIC: Log what we receive
  if (import.meta.env.DEV) {
    console.log('[PILL][diag] nodeId=', nodeId, 'data keys=', Object.keys(data ?? {}), 'mp=', !!data?.marketplace);
  }

  // Read marketplace subtree with fallbacks
  const mp0 = data?.marketplace ?? {};
  const options = Array.isArray(mp0.options)
    ? mp0.options
    : Array.isArray(data?.options)
    ? data.options
    : [];

  // Compute final values with tolerant fallbacks
  const mp = {
    ...mp0,
    count: typeof mp0.count === 'number' ? mp0.count : options.length,
    resolved: typeof mp0.resolved === 'number' ? mp0.resolved : options.length,
    sticky: typeof mp0.sticky === 'number' ? mp0.sticky : options.length,
    allow: mp0.allow ?? true,
    show: (mp0.show ?? (options.length > 0)) && (mp0.allow ?? true),
  };

  // Override with legacy props if provided (backwards compat)
  const finalCount = typeof count === 'number' ? count : mp.count;
  const finalShow = typeof show === 'boolean' ? show : mp.show;
  const n = Number(finalCount);

  // DIAGNOSTIC: Always log in dev
  if (import.meta.env.DEV) {
    console.log('[PILL] show=%s count=%s allow=%s resolved=%s sticky=%s sig=%s',
      finalShow, finalCount, mp.allow, mp.resolved, mp.sticky, mp.signature?.slice(0, 30));
    
    if (!finalShow || !Number.isFinite(n) || n <= 0) {
      const reasons = [];
      if (!finalShow) reasons.push('show=false');
      if (!Number.isFinite(n)) reasons.push('count not finite');
      if (n <= 0) reasons.push('count<=0');
      console.log('[PILL] Not rendering:', { finalCount, finalShow, n, reasons });
    }
  }

  // Only render for valid, positive counts (temp: force on for diagnosis)
  if (false) return null; // TEMP: bypassed to verify data flow
  if (!finalShow || !Number.isFinite(n) || n <= 0) {
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
