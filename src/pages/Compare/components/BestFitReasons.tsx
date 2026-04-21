/**
 * BestFitReasons — explains *why* the top-ranked school won.
 * Renders directly under the comparison surface.
 */
import { DollarSign, Clock, GraduationCap, Sparkles, Trophy } from 'lucide-react';
import type { CompareReason } from '../compareInsights';

interface BestFitReasonsProps {
  school: string;
  reasons: CompareReason[];
}

const ICON_MAP = {
  dollar: DollarSign,
  clock: Clock,
  graduation: GraduationCap,
  sparkle: Sparkles,
} as const;

export function BestFitReasons({ school, reasons }: BestFitReasonsProps) {
  if (reasons.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Why <span className="text-primary">{school}</span> ranks #1
        </h3>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {reasons.map((reason, i) => {
          const Icon = ICON_MAP[reason.icon];
          return (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-foreground/90"
            >
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{reason.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
