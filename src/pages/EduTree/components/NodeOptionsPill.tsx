/**
 * Marketplace Options Pill Component
 * Single source of truth for displaying course options count on nodes
 */

import React from 'react';
import { trace } from '../utils/debug';
import { normalizeOrRebuildSig, assertSigShape } from '../utils/signature';
import { DEV } from '../utils/constants';

export function NodeOptionsPill({
  count,
  onClick,
  show,
  className = '',
  data,
  nodeId,
  dataVersion,
}: {
  count?: number | string | undefined;
  onClick: () => void;
  show?: boolean;
  className?: string;
  data?: any;
  nodeId?: string;
  dataVersion?: string;
}) {
  // Read marketplace subtree with robust fallbacks
  const mp0 = data?.marketplace ?? {};
  
  // Heal signature at read time (defensive against legacy/bad data)
  const raw = mp0?.signature ?? '';
  const healed = normalizeOrRebuildSig(
    mp0,
    { dataVersion, blockId: nodeId, selectedCode: undefined }
  );
  
  // Log healing in development with proper detection
  React.useEffect(() => {
    if (DEV && raw && raw !== healed) {
      console.warn('[PILL][SIG_REPAIR]', { blockId: nodeId, raw, healed });
    }
  }, [raw, healed, nodeId]);
  
  assertSigShape(healed, 'PILL_RENDER');
  
  // Try multiple sources for options array (in order of preference)
  const optionsSources = [
    mp0.options,              // data.marketplace.options (primary - full objects)
    mp0.optionIds,            // data.marketplace.optionIds (IDs only)
    data?.options,            // data.options (legacy top-level)
    mp0.requirementIds,       // data.marketplace.requirementIds (alt naming)
  ];
  
  const firstArray = optionsSources.find(arr => Array.isArray(arr) && arr.length > 0);
  const fallbackCount = firstArray ? firstArray.length : 0;

  // PHASE 2 FIX: Separate capacity from choices
  // capacity = how many you CAN pick (count)
  // choices = how many options are actually available (optionsLen)
  const capacity = typeof mp0.count === 'number' ? mp0.count : 0;
  const choices = fallbackCount; // This is the actual optionsLen from arrays
  const resolvedResolved = typeof mp0.resolved === 'number' ? mp0.resolved : choices;
  const resolvedSticky = typeof mp0.sticky === 'number' ? mp0.sticky : choices;
  
  const mp = {
    ...mp0,
    signature: healed,    // Use healed signature
    count: capacity,      // Capacity (how many to pick)
    choices,              // Available choices
    resolved: resolvedResolved,
    sticky: resolvedSticky,
    allow: mp0.allow ?? true,
    show: (mp0.show ?? (choices > 0)) && (mp0.allow ?? true),
  };

  // Legacy props fallback (backwards compat only if marketplace unavailable)
  const finalChoices = (typeof count === 'number' && !mp0.count && choices === 0) ? count : choices;
  const finalShow = (typeof show === 'boolean' && mp0.show === undefined) ? show : mp.show;
  const n = Number(finalChoices) || 0; // Display choices, not capacity

  // STAGE 6: PILL_RENDER - Final mile before rendering
  trace({
    stage: 'PILL_RENDER',
    t: Date.now(),
    blockId: nodeId,
    mp: {
      count: finalChoices,
      optionsLen: firstArray?.length,
      show: finalShow,
      allow: mp.allow,
      signature: mp.signature,
    },
  });
  
  // DIAGNOSTIC: Sampled logging in dev (10%)
  if (DEV && Math.random() < 0.1) {
    console.log('[PILL][%s] show=%s choices=%s allow=%s resolved=%s sticky=%s sig=%s',
      nodeId?.slice(0, 20),
      finalShow, 
      finalChoices, 
      mp.allow, 
      mp.resolved, 
      mp.sticky, 
      mp.signature?.slice(0, 30) ?? 'none'
    );
  }
  
  // Always log non-rendering cases (errors, not noise)
  if (DEV && (!finalShow || !Number.isFinite(n) || n <= 0)) {
    const reasons = [];
    if (!finalShow) reasons.push('show=false');
    if (!Number.isFinite(n)) reasons.push('count not finite');
    if (n <= 0) reasons.push('count<=0');
    if (!data?.marketplace) reasons.push('no marketplace data');
    if (!firstArray || firstArray.length === 0) reasons.push('no options array');
    
    console.log('[PILL][%s] Not rendering:', nodeId?.slice(0, 20), { 
      finalChoices, 
      finalShow, 
      n, 
      reasons,
      hasMarketplace: !!data?.marketplace,
      hasOptions: !!data?.options,
      dataKeys: Object.keys(data ?? {})
    });
  }

  // PHASE 1 FIX: Removed hardcoded bypass - use actual logic
  if (!finalShow || !Number.isFinite(n) || n <= 0) {
    return null;
  }

  // PHASE 2 FIX: Show choices vs capacity
  const capacityLabel = mp.count > 0 && mp.count !== n ? ` (pick up to ${mp.count})` : '';

  return (
    <button
      onClick={onClick}
      className={
        "px-2 py-0.5 rounded-full border text-xs bg-transparent hover:bg-primary/10 border-border/50 hover:border-primary/50 transition-colors cursor-pointer pointer-events-auto z-10 " +
        className
      }
      title={`${n} course options available${capacityLabel ? `. ${capacityLabel.trim()}` : ''}`}
    >
      Choices: {n}{capacityLabel}
    </button>
  );
}
