import React from 'react';
import { validateNoOverlaps } from '../engine/overlapValidator';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { V3Node } from '../types/v3';

export function DevToolbar({ nodes }: { nodes: V3Node[] }) {
  const onValidate = () => {
    const res = validateNoOverlaps(nodes, LAYOUT_TOKENS);
    alert(res.hasOverlaps ? `Overlaps: ${res.overlaps.length}` : 'No overlaps ✅');
  };
  
  return (
    <div className="fixed top-2 left-2 z-50 rounded bg-black/80 text-white px-3 py-2 text-sm">
      <button onClick={onValidate} className="underline hover:no-underline">
        Validate Overlaps
      </button>
    </div>
  );
}
