import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MarketData {
  career_path: string;
  location: string;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  job_postings_count: number;
  updated_at: string;
}

interface MarketTooltipProps {
  marketData: MarketData;
  opportunityScore: number;
  locationMultiplier?: number;
  children: React.ReactNode;
}

export const MarketTooltip: React.FC<MarketTooltipProps> = ({
  marketData,
  opportunityScore,
  locationMultiplier = 1.0,
  children
}) => {
  const lastUpdated = formatDistanceToNow(new Date(marketData.updated_at), { addSuffix: true });
  
  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="w-80 p-4" side="top">
          <div className="space-y-3">
            <div className="border-b pb-2">
              <h4 className="font-semibold">{marketData.career_path}</h4>
              <p className="text-sm text-muted-foreground">{marketData.location}</p>
            </div>
            
            {/* Opportunity Score Breakdown */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Opportunity Score: {opportunityScore}/100</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>Demand: {marketData.demand_score}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Growth: {marketData.growth_rate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Salary: ${(marketData.average_salary / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className={getCompetitionColor(marketData.competition_level)}>
                    {marketData.competition_level} competition
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Details */}
            <div className="space-y-1 text-xs bg-muted p-2 rounded">
              <div className="font-medium">Calculation:</div>
              <div>• Demand Score × 30%: {(marketData.demand_score * 0.3).toFixed(1)}</div>
              <div>• Growth Rate × 25%: {(Math.min(marketData.growth_rate * 5, 100) * 0.25).toFixed(1)}</div>
              <div>• Salary Score × 25%: {(Math.min((marketData.average_salary / 200000) * 100, 100) * 0.25).toFixed(1)}</div>
              <div>• Competition × 20%: {((marketData.competition_level === 'low' ? 100 : marketData.competition_level === 'medium' ? 60 : 20) * 0.2).toFixed(1)}</div>
              {locationMultiplier !== 1.0 && (
                <div>• Location Multiplier: ×{locationMultiplier}</div>
              )}
            </div>

            {/* Market Stats */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Job Postings:</span>
                <span className="font-medium">{marketData.job_postings_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-medium">{lastUpdated}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};