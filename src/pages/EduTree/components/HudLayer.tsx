import React from 'react';
import { cn } from '@/lib/utils';

// Z-index tokens for consistent layering
export const Z_INDEX = {
  canvas: 0,
  node: 2,
  hud: 30,
  popover: 40,
  modal: 50,
  toast: 60,
} as const;

export type Corner = 'TL' | 'TR' | 'BL' | 'BR';

interface HudDockProps {
  corner: Corner;
  index?: number;
  className?: string;
  children: React.ReactNode;
  onMouseDownCapture?: (e: React.MouseEvent) => void;
}

const CORNER_STYLES = {
  TL: (index: number) => ({ top: 16 + index * 100, left: 16 }),
  TR: (index: number) => ({ top: 16 + index * 100, right: 16 }),
  BL: (index: number) => ({ bottom: 16 + index * 100, left: 16 }),
  BR: (index: number) => ({ bottom: 16 + index * 100, right: 16 }),
} as const;

export function HudDock({ 
  corner, 
  index = 0, 
  className, 
  children, 
  onMouseDownCapture 
}: HudDockProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    // Prevent React Flow pan/zoom from starting when interacting with HUD
    e.stopPropagation();
    onMouseDownCapture?.(e);
  }, [onMouseDownCapture]);

  return (
    <div
      className={cn(
        "hud-card fixed pointer-events-auto",
        "max-h-[min(80vh,640px)] overflow-hidden",
        "backdrop-blur-sm bg-background/95 border rounded-lg shadow-lg",
        "transition-all duration-200",
        className
      )}
      style={{
        ...CORNER_STYLES[corner](index),
        zIndex: Z_INDEX.hud,
        // Safe area support for mobile devices
        margin: `max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))`,
      }}
      onMouseDownCapture={handleMouseDown}
    >
      <div className="hud-content overflow-auto max-h-full">
        {children}
      </div>
    </div>
  );
}

interface HudLayerProps {
  children: React.ReactNode;
  className?: string;
}

export function HudLayer({ children, className }: HudLayerProps) {
  return (
    <div 
      className={cn("hud-layer fixed inset-0 pointer-events-none", className)}
      style={{ zIndex: Z_INDEX.hud }}
    >
      {children}
    </div>
  );
}

interface HudPopoverProps {
  children: React.ReactNode;
  className?: string;
  onMouseDownCapture?: (e: React.MouseEvent) => void;
}

export function HudPopover({ children, className, onMouseDownCapture }: HudPopoverProps) {
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDownCapture?.(e);
  }, [onMouseDownCapture]);

  return (
    <div
      className={cn(
        "hud-popover pointer-events-auto",
        "backdrop-blur-sm bg-background/95 border rounded-lg shadow-lg",
        "transition-all duration-200",
        className
      )}
      style={{ zIndex: Z_INDEX.popover }}
      onMouseDownCapture={handleMouseDown}
    >
      {children}
    </div>
  );
}