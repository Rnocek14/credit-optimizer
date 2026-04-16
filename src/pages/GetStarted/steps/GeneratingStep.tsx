import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESSAGES = [
  'Analyzing degree paths…',
  'Applying transfer rules…',
  'Optimizing cost + time…',
  'Matching alt-credit options…',
  'Ranking best fits…',
];

interface GeneratingStepProps {
  onComplete: () => void;
  /** Minimum display time in ms */
  minDuration?: number;
}

export function GeneratingStep({ onComplete, minDuration = 2800 }: GeneratingStepProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => {
        if (prev < MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, minDuration / MESSAGES.length);

    const timer = setTimeout(onComplete, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete, minDuration]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-fade-in-up">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Building your degree plan</h2>
        <div className="h-8 flex items-center justify-center">
          {MESSAGES.map((msg, i) => (
            <p
              key={msg}
              className={cn(
                'text-muted-foreground transition-all duration-300 absolute',
                i === msgIndex ? 'opacity-100 translate-y-0' : i < msgIndex ? 'opacity-0 -translate-y-4' : 'opacity-0 translate-y-4'
              )}
            >
              {msg}
            </p>
          ))}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {MESSAGES.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-300',
              i <= msgIndex ? 'bg-primary scale-100' : 'bg-muted scale-75'
            )}
          />
        ))}
      </div>
    </div>
  );
}
