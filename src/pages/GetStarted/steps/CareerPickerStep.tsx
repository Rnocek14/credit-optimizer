import { cn } from '@/lib/utils';
import {
  Code2, BarChart3, Shield, Brain, Briefcase, HeartPulse,
  Palette, HelpCircle
} from 'lucide-react';

const CAREER_OPTIONS = [
  { id: 'software-engineer', label: 'Software Engineer', icon: Code2, color: 'text-blue-400' },
  { id: 'data-analyst', label: 'Data Analyst', icon: BarChart3, color: 'text-emerald-400' },
  { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield, color: 'text-red-400' },
  { id: 'business-admin', label: 'Business Admin', icon: Briefcase, color: 'text-amber-400' },
  { id: 'psychology', label: 'Psychology', icon: Brain, color: 'text-purple-400' },
  { id: 'healthcare', label: 'Healthcare', icon: HeartPulse, color: 'text-pink-400' },
  { id: 'design', label: 'UX / Design', icon: Palette, color: 'text-cyan-400' },
  { id: null, label: 'Not sure yet', icon: HelpCircle, color: 'text-muted-foreground' },
] as const;

interface CareerPickerStepProps {
  onSelect: (careerId: string | null) => void;
}

export function CareerPickerStep({ onSelect }: CareerPickerStepProps) {
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-primary tracking-wider uppercase">Step 1 of 2</p>
        <h2 className="text-3xl font-bold tracking-tight">What are you aiming for?</h2>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Pick a direction — we'll find the fastest, cheapest degree path.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
        {CAREER_OPTIONS.map((career) => {
          const Icon = career.icon;
          return (
            <button
              key={career.id ?? 'unsure'}
              onClick={() => onSelect(career.id)}
              className={cn(
                'group flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border/50',
                'bg-card hover:border-primary/50 hover:bg-accent/30',
                'transition-all duration-200 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'min-h-[120px]'
              )}
            >
              <Icon className={cn('h-8 w-8 transition-transform group-hover:scale-110', career.color)} />
              <span className="text-sm font-medium text-center leading-tight">{career.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
