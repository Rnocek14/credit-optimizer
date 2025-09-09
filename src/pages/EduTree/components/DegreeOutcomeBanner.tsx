import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Target, Clock, DollarSign } from 'lucide-react';

interface DegreeOutcomeBannerProps {
  targetCredits: number;
  completedCredits: number;
  totalCourses: number;
  completedCourses: number;
  estimatedMonths: number;
  estimatedCost: number;
  planIssues: string[];
  selectedLens?: string;
}

export function DegreeOutcomeBanner({
  targetCredits,
  completedCredits,
  totalCourses,
  completedCourses,
  estimatedMonths,
  estimatedCost,
  planIssues,
  selectedLens
}: DegreeOutcomeBannerProps) {
  const progressPercent = Math.round((completedCredits / targetCredits) * 100);
  
  return (
    <Card className="sticky top-0 z-10 p-4 border-b-2 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        {/* Left: Degree Info */}
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              B.S. Software Engineering — Target {targetCredits} credits
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>Progress: {completedCredits}/{targetCredits} credits ({progressPercent}%)</span>
              <span>•</span>
              <span>Courses: {completedCourses}/{totalCourses}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Center: Estimates */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>~{estimatedMonths} months</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${estimatedCost.toLocaleString()}</span>
          </div>
          
          {selectedLens && (
            <Badge variant="secondary" className="capitalize">
              Path: {selectedLens}
            </Badge>
          )}
        </div>

        {/* Right: Plan Issues */}
        <div className="flex items-center gap-3">
          {planIssues.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div className="text-sm">
                <span className="font-medium text-orange-700 dark:text-orange-400">
                  {planIssues.length} issue{planIssues.length !== 1 ? 's' : ''}:
                </span>
                <span className="text-muted-foreground ml-2">
                  {planIssues.slice(0, 3).join(', ')}
                  {planIssues.length > 3 && ` + ${planIssues.length - 3} more`}
                </span>
              </div>
            </div>
          )}
          
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}