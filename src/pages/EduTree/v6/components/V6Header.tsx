import { GraduationCap } from 'lucide-react';
import { PlanSelector } from '@/pages/EduTree/v5/components/PlanSelector';
import { AnchorSchoolSelector } from '@/pages/EduTree/v5/components/AnchorSchoolSelector';
import { V6DegreeSelector } from './V6DegreeSelector';
import { V6_COPY } from '../copy';

interface V6HeaderProps {
  degreeTitle: string;
  activePlanId: string | null;
  onPlanChange: (planId: string) => void;
  currentTemplateId: string | null;
  onDegreeChange: (templateId: string) => void;
  targetCareerName?: string | null;
}

export function V6Header({ degreeTitle, activePlanId, onPlanChange, currentTemplateId, onDegreeChange, targetCareerName }: V6HeaderProps) {
  const subtitle = !activePlanId
    ? V6_COPY.noPlan
    : targetCareerName
      ? V6_COPY.buildingPlanForCareer(targetCareerName)
      : V6_COPY.buildingPlan;

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
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <V6DegreeSelector currentTemplateId={currentTemplateId} onDegreeChange={onDegreeChange} />
          <PlanSelector activePlanId={activePlanId} onPlanChange={onPlanChange} />
          <AnchorSchoolSelector />
        </div>
      </div>
    </div>
  );
}
