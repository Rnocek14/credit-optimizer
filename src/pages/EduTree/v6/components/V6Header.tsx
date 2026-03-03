import { GraduationCap, Target, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onClearCareer?: () => void;
}

export function V6Header({ degreeTitle, activePlanId, onPlanChange, currentTemplateId, onDegreeChange, targetCareerName, onClearCareer }: V6HeaderProps) {
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {degreeTitle || 'Degree Planner'}
              </h1>
              {targetCareerName && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs font-medium">
                  <Target className="h-3 w-3" />
                  {targetCareerName}
                  {onClearCareer && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onClearCareer(); }}
                      className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                      aria-label="Clear career goal"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!targetCareerName && activePlanId && (
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Link to="/discover">
                <Target className="h-3 w-3 mr-1" />
                Set career goal
              </Link>
            </Button>
          )}
          <V6DegreeSelector currentTemplateId={currentTemplateId} onDegreeChange={onDegreeChange} />
          <PlanSelector activePlanId={activePlanId} onPlanChange={onPlanChange} />
          <AnchorSchoolSelector />
        </div>
      </div>
    </div>
  );
}
