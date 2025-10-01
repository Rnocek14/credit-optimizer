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
  // PHASE 1 FIX: Use consistent environment detection
  const isDev = process.env.NODE_ENV === 'development';
  
  // Read marketplace subtree with robust fallbacks
  const mp0 = data?.marketplace ?? {};
  const options = Array.isArray(mp0.options)
    ? mp0.options
    : Array.isArray(data?.options)
    ? data.options
    : [];

  // Compute final values - prioritize data.marketplace over legacy props
  const mp = {
    ...mp0,
    count: typeof mp0.count === 'number' ? mp0.count : options.length,
    resolved: typeof mp0.resolved === 'number' ? mp0.resolved : options.length,
    sticky: typeof mp0.sticky === 'number' ? mp0.sticky : options.length,
    allow: mp0.allow ?? true,
    show: (mp0.show ?? (options.length > 0)) && (mp0.allow ?? true),
  };

  // Legacy props fallback (backwards compat only if marketplace unavailable)
  const finalCount = typeof count === 'number' && !mp0.count ? count : mp.count;
  const finalShow = typeof show === 'boolean' && mp0.show === undefined ? show : mp.show;
  const n = Number(finalCount);

  // DIAGNOSTIC: Comprehensive logging in dev
  if (isDev) {
    console.log('[PILL][%s] show=%s count=%s allow=%s resolved=%s sticky=%s sig=%s',
      nodeId?.slice(0, 20),
      finalShow, 
      finalCount, 
      mp.allow, 
      mp.resolved, 
      mp.sticky, 
      mp.signature?.slice(0, 30) ?? 'none'
    );
    
    if (!finalShow || !Number.isFinite(n) || n <= 0) {
      const reasons = [];
      if (!finalShow) reasons.push('show=false');
      if (!Number.isFinite(n)) reasons.push('count not finite');
      if (n <= 0) reasons.push('count<=0');
      if (!data?.marketplace) reasons.push('no marketplace data');
      if (!options.length) reasons.push('no options array');
      
      console.log('[PILL][%s] Not rendering:', nodeId?.slice(0, 20), { 
        finalCount, 
        finalShow, 
        n, 
        reasons,
        hasMarketplace: !!data?.marketplace,
        hasOptions: !!data?.options,
        dataKeys: Object.keys(data ?? {})
      });
    }
  }

  // PHASE 1 FIX: Removed hardcoded bypass - use actual logic
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
