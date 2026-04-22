/**
 * CreditsStep — MVP entry point for /get-started v2.
 *
 * Job-to-be-done: capture *just enough* prior-credit context in 5–10 seconds
 * so /compare can personalize. Two inputs:
 *   1. Total prior credits (slider 0–120)
 *   2. Where they came from (multi-select provider chips)
 *
 * The chips that map to alt-credit providers (Sophia, Study.com, CLEP,
 * StraighterLine) seed the /compare credit picker. The "I don't have credits
 * yet" shortcut bypasses both inputs. Non-alt chips (community college,
 * 4-year, other) contribute to the `prior` total but don't pre-fill the
 * picker since those credits transfer through institutional articulation,
 * not provider rules.
 *
 * Inputs can be preloaded from URL via `initial` so the round-trip from
 * /compare → "Update my credits" → /get-started restores prior state.
 */
import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import {
  CREDIT_SOURCE_META,
  EMPTY_PICKER,
  type CreditPickerState,
  type CreditSource,
} from '@/pages/Compare/types';

export type ProviderChipId =
  | 'community-college'
  | '4-year'
  | 'SOPHIA'
  | 'STUDYCOM'
  | 'CLEP'
  | 'STRAIGHTERLINE'
  | 'other';

export interface CreditsStepResult {
  /** Total prior credits the user claims (0–120). */
  priorCredits: number;
  /** Provider chip ids that were selected. */
  providers: ProviderChipId[];
  /** Seeded credit picker for /compare (alt-credit providers only). */
  picker: CreditPickerState;
}

interface CreditsStepProps {
  onContinue: (result: CreditsStepResult) => void;
  /** Preloaded state from a previous round-trip (e.g. "Update my credits"). */
  initial?: { priorCredits: number; providers: ProviderChipId[] };
}

interface ChipDef {
  id: ProviderChipId;
  label: string;
  /** If set, this chip seeds a slot in the /compare picker. */
  altSource?: CreditSource;
}

const CHIPS: ChipDef[] = [
  { id: 'community-college', label: 'Community college' },
  { id: '4-year',            label: '4-year university' },
  { id: 'SOPHIA',            label: 'Sophia',         altSource: 'SOPHIA' },
  { id: 'STUDYCOM',          label: 'Study.com',      altSource: 'STUDYCOM' },
  { id: 'CLEP',              label: 'CLEP / AP',      altSource: 'CLEP' },
  { id: 'STRAIGHTERLINE',    label: 'StraighterLine', altSource: 'STRAIGHTERLINE' },
  { id: 'other',             label: 'Other' },
];

/**
 * Given a total credit budget and the alt-credit chips the user selected,
 * distribute credits across those provider slots (capped by each source max).
 * Pure helper so the parent can re-derive on continue.
 */
function seedPicker(
  totalCredits: number,
  selected: ProviderChipId[]
): CreditPickerState {
  const altChips = CHIPS.filter(
    (c) => c.altSource && selected.includes(c.id)
  );
  if (totalCredits <= 0 || altChips.length === 0) {
    return { ...EMPTY_PICKER };
  }
  const picker: CreditPickerState = { ...EMPTY_PICKER };
  // Even split, then snap each to the source's step and clamp to its max.
  const perSlot = Math.floor(totalCredits / altChips.length);
  for (const chip of altChips) {
    const meta = CREDIT_SOURCE_META[chip.altSource!];
    const snapped = Math.floor(perSlot / meta.step) * meta.step;
    picker[chip.altSource!] = Math.min(meta.max, Math.max(0, snapped));
  }
  return picker;
}

export function CreditsStep({ onContinue, initial }: CreditsStepProps) {
  const [credits, setCredits] = useState<number>(initial?.priorCredits ?? 30);
  const [selected, setSelected] = useState<ProviderChipId[]>(initial?.providers ?? []);

  const toggleChip = (id: ProviderChipId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const picker = useMemo(() => seedPicker(credits, selected), [credits, selected]);

  const handleContinue = () => {
    onContinue({ priorCredits: credits, providers: selected, picker });
  };

  const handleStartFresh = () => {
    onContinue({ priorCredits: 0, providers: [], picker: { ...EMPTY_PICKER } });
  };

  return (
    <div className="space-y-10 animate-fade-in-up max-w-xl mx-auto">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-primary tracking-wider uppercase">
          Pre-decision check · 10 seconds
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Before you spend another dollar — check where your credits actually count.
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          See which schools accept them, how many transfer, and how much time and money you save.
        </p>
      </div>

      {/* Credits slider */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold text-foreground">
            Roughly how many credits?
          </label>
          <span className="text-2xl font-bold tabular-nums text-primary">
            {credits}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / 120
            </span>
          </span>
        </div>
        <Slider
          value={[credits]}
          onValueChange={(v) => setCredits(v[0] ?? 0)}
          min={0}
          max={120}
          step={3}
          aria-label="Prior credits"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>None</span>
          <span>Halfway</span>
          <span>Almost done</span>
        </div>
      </div>

      {/* Provider chips */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground">
            Where are they from?
          </label>
          <p className="text-xs text-muted-foreground">
            Pick any that apply — or none, if you're not sure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => {
            const isOn = selected.includes(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleChip(chip.id)}
                aria-pressed={isOn}
                className={cn(
                  'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isOn
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={handleContinue}
          className="w-full gap-2 h-12 text-base"
          size="lg"
        >
          Check where they count
          <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={handleStartFresh}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          I don't have credits yet — start fresh
        </button>
      </div>
    </div>
  );
}
