import * as React from 'react';
import type { OptimizerMode } from '@/types/optimizer';
import { cn } from '@/lib/utils';

const MODE_LABELS: Record<OptimizerMode, { label: string; subtitle: string }> = {
  standard_like: {
    label: 'Default Plan',
    subtitle: 'Mix of institutional + alt credits',
  },
  alt_max: {
    label: 'Max Alt-Credit',
    subtitle: 'Use Sophia/CLEP/DSST as much as possible',
  },
  cost_min: {
    label: 'Cheapest',
    subtitle: 'Minimize estimated out-of-pocket cost',
  },
  time_min: {
    label: 'Fastest',
    subtitle: 'Minimize estimated time-to-completion',
  },
};

interface OptimizerModeSelectorProps {
  mode: OptimizerMode;
  onChange: (mode: OptimizerMode) => void;
  className?: string;
}

export function OptimizerModeSelector({ mode, onChange, className }: OptimizerModeSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Optimization Mode</h3>
          <p className="text-xs text-muted-foreground">
            Choose how the optimizer should prioritize your plan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {(Object.keys(MODE_LABELS) as OptimizerMode[]).map((key) => {
          const { label, subtitle } = MODE_LABELS[key];
          const isActive = mode === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all',
                'hover:bg-accent/60 hover:border-accent-foreground/30',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/50'
                  : 'border-border bg-background'
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {label}
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</span>
              {isActive && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
