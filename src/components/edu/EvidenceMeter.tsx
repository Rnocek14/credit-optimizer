import React from 'react';
import clsx from 'clsx';

type EvidenceMeterProps = {
  percent?: number | null;
  label?: string;
  className?: string;
  quiet?: boolean; // when true: show just the bar (no % text)
};

function clampPercent(p?: number | null) {
  if (p === null || p === undefined || Number.isNaN(p)) return null;
  const n = Number(p);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Evidence bar with a graceful "no data" state.
 * - When percent is null/undefined/NaN: render an outlined, subtle placeholder
 *   (no dark fill) so it never looks like a black rectangle.
 */
export function EvidenceMeter({
  percent,
  label = 'Evidence',
  className,
  quiet = false,
}: EvidenceMeterProps) {
  const pct = clampPercent(percent);

  // NO DATA: quiet outline, muted track, no solid fill
  if (pct === null) {
    return (
      <div
        className={clsx(
          'inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-xs text-muted-foreground',
          className
        )}
        aria-label={`${label}: no data`}
      >
        <span className="h-1.5 w-16 rounded bg-muted/40" aria-hidden />
        {!quiet && <span>no data</span>}
      </div>
    );
  }

  // 0–100%: muted track with primary fill
  return (
    <div
      className={clsx('flex items-center gap-2', className)}
      aria-label={`${label}: ${pct}%`}
    >
      <div className="h-1.5 w-20 overflow-hidden rounded bg-muted/40">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      {!quiet && <span className="text-xs text-muted-foreground">{pct}%</span>}
    </div>
  );
}
