import React from 'react';
import { Progress } from '@/components/ui/progress';
import { getOpportunityLevel } from '@/lib/marketScoring';

interface MarketBarProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MarketBar: React.FC<MarketBarProps> = ({ 
  score, 
  showLabel = true, 
  size = 'md',
  className = '' 
}) => {
  const { level, color, description } = getOpportunityLevel(score);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className={`flex items-center justify-between ${textSizeClasses[size]}`}>
          <span className="font-medium text-foreground">Opportunity Score</span>
          <span className="font-bold">{score}/100</span>
        </div>
      )}
      
      <div className="relative">
        <div className={`relative ${sizeClasses[size]} bg-muted rounded-full overflow-hidden`}>
          <div 
            className={`h-full ${color} rounded-full transition-all duration-300`}
            style={{ width: `${score}%` }}
          />
        </div>
        
        {/* Score level indicator */}
        <div className={`absolute -top-1 ${textSizeClasses[size]} text-muted-foreground`} 
             style={{ left: `${Math.min(score, 95)}%` }}>
          <div className="transform -translate-x-1/2">
            <div className={`w-1 h-4 ${color} rounded-full`}></div>
          </div>
        </div>
      </div>
      
      {showLabel && size !== 'sm' && (
        <div className={`${textSizeClasses[size]} text-muted-foreground`}>
          <span className="font-medium">{level}:</span> {description}
        </div>
      )}
    </div>
  );
};