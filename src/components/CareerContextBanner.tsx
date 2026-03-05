/**
 * CareerContextBanner — persistent "Target: {career}" chip shown across hubs.
 *
 * Only renders when the user has a target_career_id set on their active plan.
 * "Change" opens a lightweight career picker dialog.
 * When no target is set, shows a CTA to pick one.
 */
import { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useTargetCareer } from '@/hooks/useTargetCareer';
import { CareerTargetPicker } from '@/components/CareerTargetPicker';

export function CareerContextBanner() {
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);
  const [pickerOpen, setPickerOpen] = useState(false);

  // No plan at all — don't render anything
  if (!activePlan?.id) return null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-1.5">
        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
        {targetCareer?.title ? (
          <>
            <span className="text-sm text-foreground">
              Target: <strong>{targetCareer.title}</strong>
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() => setPickerOpen(true)}
            >
              Change
            </Button>
          </>
        ) : (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm text-primary font-medium flex items-center gap-1"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Set a target career
          </Button>
        )}
      </div>

      <CareerTargetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        planId={activePlan.id}
        currentCareerId={activePlan.target_career_id}
      />
    </>
  );
}
