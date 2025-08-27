import { Info } from 'lucide-react';
import { useTutorial } from './TutorialProvider';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = { 
  id: string; 
  label: string; 
  children?: React.ReactNode; 
};

export default function TutorialTip({ id, label, children }: Props) {
  const { enabled } = useTutorial();
  
  if (!enabled) return null;
  
  return (
    <Tooltip
      onOpenChange={(open) => {
        if (open) {
          trackTelemetryEvent({ 
            task: 'tutorial_tip_view', 
            complexity: { tip_id: id } 
          });
        }
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-describedby={`tip-${id}`}
        >
          <Info className="h-3 w-3" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-xs z-[9999]"
        role="tooltip"
        id={`tip-${id}`}
        sideOffset={5}
      >
        {label}
        {children}
      </TooltipContent>
    </Tooltip>
  );
}