/**
 * CreditPickerCollapsible — quiet, one-line affordance that expands into the
 * full CreditPicker on demand. Auto-expands when the user already has credits
 * claimed (so personalized state stays visible after a refresh / share-link).
 *
 * Goal: reclaim ~400px of vertical space above the comparison surface so the
 * decision is visible before the picker is even noticed.
 */
import { useState } from 'react';
import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditPicker } from './CreditPicker';
import { totalPickerCredits, type CreditPickerState } from '../types';

interface CreditPickerCollapsibleProps {
  state: CreditPickerState;
  onChange: (next: CreditPickerState) => void;
}

export function CreditPickerCollapsible({ state, onChange }: CreditPickerCollapsibleProps) {
  const totalClaimed = totalPickerCredits(state);
  const personalized = totalClaimed > 0;
  // Expand by default if the user already has credits in state (URL or prior session).
  const [open, setOpen] = useState(personalized);

  if (open) {
    return (
      <div className="space-y-2">
        <CreditPicker state={state} onChange={onChange} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Hide credit picker
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'w-full flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors',
        'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        personalized ? 'border-primary/40' : 'border-border/60'
      )}
      aria-expanded={false}
    >
      <span className="flex items-center gap-2 min-w-0">
        {personalized ? (
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-foreground truncate">
          {personalized
            ? `Personalized with ${totalClaimed} credits`
            : 'Add transfer credits to personalize'}
        </span>
      </span>
      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
