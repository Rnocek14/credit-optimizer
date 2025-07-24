import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, DollarSign, TrendingUp, MapPin } from 'lucide-react';

interface JobNodeData {
  title: string;
  description: string;
  level: string;
  industry: string;
  averageSalary: number;
  roiScore: number;
  growthOutlook: string;
  requiredSkillIds: string[];
  isGoal?: boolean;
  isCurrent?: boolean;
}

interface JobNodeProps {
  data: JobNodeData;
  selected?: boolean;
}

export const JobNode: React.FC<JobNodeProps> = memo(({ data, selected }) => {
  const {
    title,
    description,
    level,
    industry,
    averageSalary,
    roiScore,
    growthOutlook,
    isGoal,
    isCurrent
  } = data;

  const formatSalary = (salary: number) => {
    if (salary >= 1000000) return `$${(salary / 1000000).toFixed(1)}M`;
    if (salary >= 1000) return `$${(salary / 1000).toFixed(0)}K`;
    return `$${salary}`;
  };

  const getRoiColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 dark:bg-green-950';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
    return 'text-red-600 bg-red-50 dark:bg-red-950';
  };

  return (
    <div className="group">
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100" />
      
      <Card className={`
        w-80 p-4 transition-all duration-200 hover:shadow-lg
        ${isGoal 
          ? 'border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10' 
          : isCurrent
            ? 'border-2 border-secondary bg-gradient-to-br from-secondary/5 to-secondary/10'
            : 'border border-border hover:border-primary'
        }
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-muted">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <Badge variant={level === 'Senior' ? 'default' : level === 'Mid' ? 'secondary' : 'outline'} className="text-xs">
                  {level}
                </Badge>
                {isGoal && <Badge variant="default" className="ml-2 text-xs">Goal</Badge>}
                {isCurrent && <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>}
              </div>
            </div>
            <h3 className="font-semibold text-base leading-tight mb-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {industry}
            </p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Salary */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">{formatSalary(averageSalary)}</p>
              <p className="text-xs text-muted-foreground">Avg. Salary</p>
            </div>
          </div>

          {/* ROI Score */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <p className={`text-sm font-medium ${getRoiColor(roiScore)}`}>
                {roiScore}/10
              </p>
              <p className="text-xs text-muted-foreground">ROI Score</p>
            </div>
          </div>
        </div>

        {/* Growth Outlook */}
        {growthOutlook && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Growth: {growthOutlook}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{data.requiredSkillIds?.length || 0} skills required</span>
            {isGoal && (
              <span className="text-primary font-medium">Target Role</span>
            )}
          </div>
        </div>
      </Card>

      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

JobNode.displayName = 'JobNode';