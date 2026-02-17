import { GraduationCap } from 'lucide-react';
import { PlanSelector } from '@/pages/EduTree/v5/components/PlanSelector';
import { AnchorSchoolSelector } from '@/pages/EduTree/v5/components/AnchorSchoolSelector';
import { V6_COPY } from '../copy';

interface V6HeaderProps {
  degreeTitle: string;
  activePlanId: string | null;
  onPlanChange: (planId: string) => void;
}

export function V6Header({ degreeTitle, activePlanId, onPlanChange }: V6HeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {degreeTitle || 'Degree Planner'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activePlanId ? V6_COPY.buildingPlan : V6_COPY.noPlan}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <PlanSelector activePlanId={activePlanId} onPlanChange={onPlanChange} />
          <AnchorSchoolSelector />
        </div>
      </div>
    </div>
  );
}
