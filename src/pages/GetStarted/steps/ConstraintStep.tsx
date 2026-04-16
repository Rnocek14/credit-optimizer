import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { GoalPreference, ExperienceLevel } from '@/hooks/useQuickPlanGeneration';

interface ConstraintStepProps {
  onGenerate: (goal: GoalPreference, experience: ExperienceLevel) => void;
  onBack: () => void;
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-center gap-1 p-4 rounded-lg border-2 transition-all text-center',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              value === opt.value
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border/50 bg-card hover:border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs opacity-70">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConstraintStep({ onGenerate, onBack }: ConstraintStepProps) {
  const [goal, setGoal] = useState<GoalPreference>('cheapest');
  const [experience, setExperience] = useState<ExperienceLevel>('fresh');

  return (
    <div className="space-y-8 animate-fade-in-up max-w-lg mx-auto">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-primary tracking-wider uppercase">Step 2 of 2</p>
        <h2 className="text-3xl font-bold tracking-tight">Let's optimize for you</h2>
        <p className="text-muted-foreground">
          Defaults are pre-selected — just hit Generate.
        </p>
      </div>

      <div className="space-y-6">
        <SegmentedControl<GoalPreference>
          label="🎯 What matters most?"
          options={[
            { value: 'cheapest', label: 'Cheapest', desc: 'Lowest total cost' },
            { value: 'fastest', label: 'Fastest', desc: 'Graduate sooner' },
            { value: 'balanced', label: 'Balanced', desc: 'Best of both' },
          ]}
          value={goal}
          onChange={setGoal}
        />

        <SegmentedControl<ExperienceLevel>
          label="🎓 Where are you starting?"
          options={[
            { value: 'fresh', label: 'Starting fresh', desc: 'No prior credits' },
            { value: 'some-college', label: 'Some college', desc: 'Have some credits' },
            { value: 'returning', label: 'Returning', desc: 'Continuing degree' },
          ]}
          value={experience}
          onChange={setExperience}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => onGenerate(goal, experience)}
          className="flex-1 gap-2 text-base h-12"
          size="lg"
        >
          Generate My Plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
