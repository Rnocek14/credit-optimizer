/**
 * Inline mini comparison cards
 * 
 * Renders under the Track Gate to show SE vs DS at a glance
 * Purely visual - no interaction beyond selection
 */

import React from 'react';

interface MiniCompareInfo {
  id: 'se' | 'ds';
  title: string;
  courses: number;
  credits: number;
  durationWeeks?: number;
  outcomes?: string[];
  color?: 'blue' | 'purple';
}

interface CompareMiniCardsProps {
  se: MiniCompareInfo;
  ds: MiniCompareInfo;
}

export default function CompareMiniCards({ se, ds }: CompareMiniCardsProps) {
  const Card = ({ info }: { info: MiniCompareInfo }) => {
    const colorClasses = info.color === 'blue' 
      ? 'border-blue-300 bg-blue-50/80 dark:bg-blue-950/20' 
      : 'border-purple-300 bg-purple-50/80 dark:bg-purple-950/20';
    
    return (
      <div
        className={`rounded-xl shadow-sm px-4 py-3 w-[220px] border backdrop-blur ${colorClasses}`}
        data-testid={`mini-${info.id}`}
      >
        <div className="text-xs text-muted-foreground mb-1">Track</div>
        <div className="font-medium text-sm">{info.title}</div>
        
        <div className="mt-2 text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="text-muted-foreground">Courses</div>
          <div className="font-medium">{info.courses}</div>
          
          <div className="text-muted-foreground">Credits</div>
          <div className="font-medium">{info.credits}</div>
          
          {info.durationWeeks && (
            <>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">{info.durationWeeks} wks</div>
            </>
          )}
        </div>
        
        {info.outcomes && info.outcomes.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">Key Outcomes</div>
            <ul className="text-[10px] space-y-0.5 list-disc ml-4">
              {info.outcomes.slice(0, 2).map((outcome, i) => (
                <li key={i} className="text-muted-foreground">{outcome}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex items-start justify-center gap-6 mt-3"
      style={{ pointerEvents: 'none' }}
      data-testid="mini-compare"
    >
      <Card info={se} />
      <Card info={ds} />
    </div>
  );
}
