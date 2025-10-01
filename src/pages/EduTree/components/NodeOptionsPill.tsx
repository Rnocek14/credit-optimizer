/**
 * Marketplace Options Pill Component
 * Single source of truth for displaying course options count on nodes
 */

import { trace } from '../utils/debug';

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
  
  // Try multiple sources for options array (in order of preference)
  const optionsSources = [
    mp0.options,              // data.marketplace.options (primary - full objects)
    mp0.optionIds,            // data.marketplace.optionIds (IDs only)
    data?.options,            // data.options (legacy top-level)
    mp0.requirementIds,       // data.marketplace.requirementIds (alt naming)
  ];
  
  const firstArray = optionsSources.find(arr => Array.isArray(arr) && arr.length > 0);
  const fallbackCount = firstArray ? firstArray.length : 0;

  // Compute final values - prioritize explicit count, then array length, then 0
  const resolvedCount = typeof mp0.count === 'number' ? mp0.count : fallbackCount;
  const resolvedResolved = typeof mp0.resolved === 'number' ? mp0.resolved : resolvedCount;
  const resolvedSticky = typeof mp0.sticky === 'number' ? mp0.sticky : resolvedCount;
  
  const mp = {
    ...mp0,
    count: resolvedCount,
    resolved: resolvedResolved,
    sticky: resolvedSticky,
    allow: mp0.allow ?? true,
    show: (mp0.show ?? (resolvedCount > 0)) && (mp0.allow ?? true),
  };

  // Legacy props fallback (backwards compat only if marketplace unavailable)
  const finalCount = (typeof count === 'number' && !mp0.count) ? count : mp.count;
  const finalShow = (typeof show === 'boolean' && mp0.show === undefined) ? show : mp.show;
  const n = Number(finalCount) || 0; // Ensure no NaN

  // STAGE 6: PILL_RENDER - Final mile before rendering
  trace({
    stage: 'PILL_RENDER',
    t: Date.now(),
    blockId: nodeId,
    mp: {
      count: finalCount,
      optionsLen: firstArray?.length,
      show: finalShow,
      allow: mp.allow,
      signature: mp.signature,
    },
  });
  
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
      if (!firstArray || firstArray.length === 0) reasons.push('no options array');
      
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
        "px-2 py-0.5 rounded-full border text-xs bg-secondary/10 hover:bg-primary/10 border-border/50 hover:border-primary/50 transition-colors cursor-pointer pointer-events-auto z-10 " +
        className
      }
      title="View catalog course options that satisfy this requirement"
    >
      Options: {n}
    </button>
  );
}
