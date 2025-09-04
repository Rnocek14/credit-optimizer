import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CapMeterProps {
  transferUsed: number;
  transferCap: number;
  examUsed: number;
  examCap: number;
  residencyRequired: number;
  residencyMet: number;
}

export function CapMeter({
  transferUsed,
  transferCap,
  examUsed,
  examCap,
  residencyRequired,
  residencyMet
}: CapMeterProps) {
  const transferPercentage = (transferUsed / transferCap) * 100;
  const examPercentage = (examUsed / examCap) * 100;
  const residencyMet_bool = residencyMet >= residencyRequired;
  
  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <div className="text-xs font-medium text-muted-foreground">Transfer Progress</div>
      
      <div className="space-y-1">
        {/* Transfer Credits */}
        <div className="flex items-center justify-between text-xs">
          <span>Transfer</span>
          <span className="font-medium">{transferUsed}/{transferCap}</span>
        </div>
        <Progress value={transferPercentage} className="h-1" />
        
        {/* Exam Credits */}
        {examCap > 0 && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span>Exam</span>
              <span className="font-medium">{examUsed}/{examCap}</span>
            </div>
            <Progress value={examPercentage} className="h-1" />
          </>
        )}
        
        {/* Residency Requirement */}
        <div className="flex items-center justify-between text-xs">
          <span>Residency</span>
          <Badge 
            variant={residencyMet_bool ? "default" : "secondary"} 
            className="text-xs px-1 py-0"
          >
            {residencyMet_bool ? "✓" : "≥"}{residencyRequired}
          </Badge>
        </div>
      </div>
    </div>
  );
}