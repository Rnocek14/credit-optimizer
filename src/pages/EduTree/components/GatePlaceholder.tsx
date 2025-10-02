/**
 * Gate Placeholder - Non-destructive gate rendering
 * Shows thin placeholder instead of hiding gates completely
 */

import React from 'react';

interface GatePlaceholderProps {
  gateId: string;
  reason: string;
  position: { x: number; y: number };
}

export const GatePlaceholder: React.FC<GatePlaceholderProps> = ({ gateId, reason, position }) => {
  return (
    <div
      className="gate--placeholder absolute pointer-events-none opacity-40"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: 120,
        height: 24,
        border: '1px dashed hsl(var(--border))',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: 'hsl(var(--muted-foreground))',
        backgroundColor: 'transparent'
      }}
      title={`Gate placeholder: ${reason}`}
    >
      {gateId}
    </div>
  );
};
