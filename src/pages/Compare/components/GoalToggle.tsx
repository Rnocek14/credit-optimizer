/**
 * GoalToggle — segmented control to swap the composite weighting on /compare.
 * Mirrors the goal selected on /get-started but is editable here too.
 */
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Sparkles, DollarSign, Zap } from 'lucide-react';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';

interface GoalToggleProps {
  value: GoalPreference;
  onChange: (next: GoalPreference) => void;
}

const OPTIONS: Array<{
  value: GoalPreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'balanced', label: 'Balanced',  icon: Sparkles },
  { value: 'cheapest', label: 'Cheapest',  icon: DollarSign },
  { value: 'fastest',  label: 'Fastest',   icon: Zap },
];

export function GoalToggle({ value, onChange }: GoalToggleProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
        Rank by
      </span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as GoalPreference)}
        variant="outline"
        size="sm"
        className="justify-start"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              aria-label={opt.label}
              className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
