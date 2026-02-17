/**
 * V6ModuleCard — Minimal, decluttered module card.
 *
 * Shows only: icon + title, progress bar, status chip, one CTA.
 * Entire card is clickable → opens the existing V5 ScopePanelRouter.
 * No debug logging, no telemetry, no sorting controls, no inline options.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight } from 'lucide-react';
import { V6_COPY } from '../copy';
import type { ModuleData } from '@/pages/EduTree/v5/types/v5';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';

interface V6ModuleCardProps {
  module: ModuleData;
  onOpenPanel: () => void;
}

type ModuleStatus = 'not-started' | 'in-progress' | 'complete';

function getStatus(earned: number, required: number): ModuleStatus {
  if (earned >= required && required > 0) return 'complete';
  if (earned > 0) return 'in-progress';
  return 'not-started';
}

const STATUS_CONFIG: Record<ModuleStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'not-started': { label: V6_COPY.statusReady, variant: 'outline' },
  'in-progress': { label: V6_COPY.statusInProgress, variant: 'secondary' },
  'complete': { label: V6_COPY.statusComplete, variant: 'default' },
};

export function V6ModuleCard({ module, onOpenPanel }: V6ModuleCardProps) {
  const { id, label, icon, creditsEarned, creditsRequired, requirementArea, marketplaceOptions } = module;

  // Live basket count (same dual-match logic as V5, but no debug logging)
  const basket = usePlanBasket(s => s.items);
  const liveEarned = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    for (const item of basket) {
      if (seen.has(item.courseId)) continue;
      const match =
        item.moduleId === id ||
        (requirementArea && item.requirementArea === requirementArea) ||
        (requirementArea && item.moduleId === requirementArea);
      if (match) {
        seen.add(item.courseId);
        total += item.credits;
      }
    }
    return total;
  }, [basket, id, requirementArea]);

  // Always use live basket count as single source of truth.
  // Avoid fallback to creditsEarned which may be stale or computed differently.
  const earned = liveEarned;
  const required = creditsRequired || 0;
  const progress = required > 0 ? Math.min(100, (earned / required) * 100) : 0;
  const status = getStatus(earned, required);
  const statusCfg = STATUS_CONFIG[status];
  const optionsCount = marketplaceOptions?.length ?? 0;

  return (
    <div
      onClick={onOpenPanel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenPanel();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${label} — ${earned}/${required} credits — ${statusCfg.label}`}
      className="
        group relative bg-card rounded-lg border-2 border-border
        px-4 py-3 cursor-pointer
        transition-all duration-200
        hover:border-primary/40 hover:shadow-md hover:scale-[1.01]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {/* Row 1: Icon + Title + Status chip */}
      <div className="flex items-center gap-3">
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
        <h3 className="font-semibold text-sm flex-1 min-w-0 truncate text-foreground">
          {label}
        </h3>
        <Badge variant={statusCfg.variant} className="text-[11px] flex-shrink-0">
          {statusCfg.label}
        </Badge>
      </div>

      {/* Row 2: Progress bar + credits + arrow */}
      <div className="flex items-center gap-3 mt-2">
        <Progress value={progress} className="flex-1 h-1.5" />
        <span className="text-xs font-medium text-muted-foreground flex-shrink-0 tabular-nums">
          {earned}/{required} cr
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
      </div>

      {/* Row 3: Subtle options hint (only when incomplete) */}
      {status !== 'complete' && optionsCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          {V6_COPY.optionsAvailable(optionsCount)}
        </p>
      )}
    </div>
  );
}
