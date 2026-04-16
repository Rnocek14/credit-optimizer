/**
 * CreditPicker — toggle each source ON/OFF, then drag a slider to claim N credits.
 *
 * The picker drives /compare's personalized transfer fit. State shape is the
 * single source of truth; URL sync happens at the page level.
 */
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import {
  CREDIT_SOURCES,
  CREDIT_SOURCE_META,
  EMPTY_PICKER,
  totalPickerCredits,
  type CreditPickerState,
  type CreditSource,
} from '../types';

interface CreditPickerProps {
  state: CreditPickerState;
  onChange: (next: CreditPickerState) => void;
}

export function CreditPicker({ state, onChange }: CreditPickerProps) {
  const totalClaimed = totalPickerCredits(state);

  const setCredits = (source: CreditSource, credits: number) => {
    onChange({ ...state, [source]: Math.max(0, Math.min(CREDIT_SOURCE_META[source].max, credits)) });
  };

  const toggleSource = (source: CreditSource, on: boolean) => {
    if (on) {
      // Default to a sensible starting value when toggling on (3 courses worth)
      const meta = CREDIT_SOURCE_META[source];
      setCredits(source, state[source] > 0 ? state[source] : meta.perCourse * 3);
    } else {
      setCredits(source, 0);
    }
  };

  const reset = () => onChange(EMPTY_PICKER);

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-wider uppercase">
                Personalize my fit
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">
              What credits do you already have?
            </h2>
            <p className="text-sm text-muted-foreground">
              Toggle providers you've used and estimate your credit count. We'll
              re-rank schools below in real time.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary leading-none">
              {totalClaimed}
            </div>
            <div className="text-xs text-muted-foreground">credits claimed</div>
            {totalClaimed > 0 && (
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {CREDIT_SOURCES.map((source) => {
            const meta = CREDIT_SOURCE_META[source];
            const value = state[source];
            const isOn = value > 0;
            return (
              <div
                key={source}
                className={cn(
                  'rounded-lg border bg-background/40 p-3 transition-colors',
                  isOn ? 'border-primary/40' : 'border-border/50'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={isOn}
                      onCheckedChange={(on) => toggleSource(source, on)}
                      aria-label={`Toggle ${meta.label}`}
                    />
                    <span className="text-sm font-medium truncate">{meta.label}</span>
                  </div>
                  <div
                    className={cn(
                      'text-sm tabular-nums font-semibold shrink-0',
                      isOn ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {value} cr
                  </div>
                </div>
                {isOn && (
                  <div className="mt-3 px-1">
                    <Slider
                      min={0}
                      max={meta.max}
                      step={meta.step}
                      value={[value]}
                      onValueChange={([next]) => setCredits(source, next)}
                      aria-label={`${meta.label} credits`}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                      <span>0</span>
                      <span>{meta.max}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
