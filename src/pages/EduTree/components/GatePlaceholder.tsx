/**
 * Gate Placeholder - Non-destructive gate rendering
 * Shows thin placeholder instead of hiding gates completely
 */

import React from 'react';
import type { Node } from '@xyflow/react';

interface GatePlaceholderData {
  gateId: string;
  reason: string;
}

export const GatePlaceholder: React.FC<{ data: GatePlaceholderData }> = ({ data }) => {
  return (
    <div
      className="gate--placeholder rounded-xl border border-dashed border-border/40 bg-background/30 px-4 py-2 shadow-sm opacity-40 pointer-events-none"
      style={{
        minWidth: 180,
      }}
      title={`Gate placeholder: ${data.reason}`}
    >
      <div className="text-xs text-muted-foreground text-center">
        {data.gateId.replace('gate-', '').replace('-', ' ')}
      </div>
    </div>
  );
};
