/**
 * CareerContextBanner — persistent "Target: {career}" chip shown across hubs.
 *
 * Only renders when the user has a target_career_id set on their active plan.
 * Provides a "Change" link to /discover for re-targeting.
 */
import { Link } from 'react-router-dom';
import { Target, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useTargetCareer } from '@/hooks/useTargetCareer';

export function CareerContextBanner() {
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);

  if (!targetCareer?.title) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-1.5">
      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-sm text-foreground">
        Target: <strong>{targetCareer.title}</strong>
      </span>
      <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" asChild>
        <Link to="/discover">Change</Link>
      </Button>
    </div>
  );
}
