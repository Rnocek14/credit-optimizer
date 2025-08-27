import { Info } from 'lucide-react';
import { useTutorial } from './TutorialProvider';
import { trackTelemetryEvent } from '@/utils/telemetry';
import * as Tooltip from '@radix-ui/react-tooltip';

type Props = { 
  id: string; 
  label: string; 
  children?: React.ReactNode; 
};

export default function TutorialTip({ id, label, children }: Props) {
  const { enabled } = useTutorial();
  
  if (!enabled) return null;
  
  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root
        onOpenChange={(open) => {
          if (open) {
            trackTelemetryEvent({ 
              task: 'tutorial_tip_view', 
              complexity: { tip_id: id } 
            });
          }
        }}
      >
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-describedby={`tip-${id}`}
          >
            <Info className="h-3 w-3" aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content
          side="top"
          align="center"
          className="max-w-xs rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-lg z-50"
          role="tooltip"
          id={`tip-${id}`}
          sideOffset={5}
        >
          {label}
          {children}
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}