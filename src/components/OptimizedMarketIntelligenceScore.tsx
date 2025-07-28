import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Award, AlertCircle } from 'lucide-react';

interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  ai_insights?: any;
}

interface MarketIntelligenceScoreProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
  className?: string;
}

interface ScoreBreakdown {
  overall: number;
  growth: number;
  demand: number;
  salary: number;
  competition: number;
  insight: string;
  level: 'low' | 'medium' | 'high' | 'excellent';
}

export const OptimizedMarketIntelligenceScore: React.FC<MarketIntelligenceScoreProps> = ({
  marketData,
  selectedCareerPath,
  selectedLocation,
  className = ""
}) => {
  const scoreBreakdown = useMemo((): ScoreBreakdown => {
    if (!marketData || marketData.length === 0) {
      return {
        overall: 0,
        growth: 0,
        demand: 0,
        salary: 0,
        competition: 0,
        insight: 'Generate market analysis to calculate intelligence score',
        level: 'low'
      };
    }

    // Filter data for context
    const relevantData = selectedCareerPath || selectedLocation 
      ? marketData.filter(item => 
          (!selectedCareerPath || item.career_path === selectedCareerPath) &&
          (!selectedLocation || item.location === selectedLocation)
        )
      : marketData;

    if (relevantData.length === 0) {
      return {
        overall: 25,
        growth: 20,
        demand: 30,
        salary: 25,
        competition: 20,
        insight: 'No data available for selected criteria',
        level: 'low'
      };
    }

    // Calculate metrics
    const avgGrowth = relevantData.reduce((sum, item) => sum + (item.growth_rate || 0), 0) / relevantData.length;
    const avgDemand = relevantData.reduce((sum, item) => sum + (item.demand_score || 0), 0) / relevantData.length;
    const avgSalary = relevantData.reduce((sum, item) => sum + (item.average_salary || 0), 0) / relevantData.length;
    
    // Competition scoring (low = good)
    const lowCompetitionCount = relevantData.filter(item => item.competition_level === 'low').length;
    const competitionScore = (lowCompetitionCount / relevantData.length) * 100;

    // Normalize scores
    const growthScore = Math.min(100, Math.max(0, (avgGrowth + 10) * 2)); // -10% to 45% growth range
    const demandScore = (avgDemand / 10) * 100; // 0-10 scale to 0-100
    const salaryScore = Math.min(100, Math.max(0, (avgSalary - 30000) / 1500)); // $30k-$180k range
    
    // Overall score calculation
    const overall = Math.round((growthScore * 0.3) + (demandScore * 0.25) + (salaryScore * 0.25) + (competitionScore * 0.2));

    // Generate insight
    let insight = '';
    let level: 'low' | 'medium' | 'high' | 'excellent' = 'low';

    if (overall >= 85) {
      level = 'excellent';
      insight = 'Exceptional market opportunity with strong growth and high demand';
    } else if (overall >= 70) {
      level = 'high';
      insight = 'Strong market opportunity with good potential for career growth';
    } else if (overall >= 50) {
      level = 'medium';
      insight = 'Moderate market opportunity with balanced risk-reward profile';
    } else {
      level = 'low';
      insight = 'Emerging opportunity requiring careful consideration and timing';
    }

    return {
      overall: Math.round(overall),
      growth: Math.round(growthScore),
      demand: Math.round(demandScore),
      salary: Math.round(salaryScore),
      competition: Math.round(competitionScore),
      insight,
      level
    };
  }, [marketData, selectedCareerPath, selectedLocation]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'high': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'excellent': return <Award className="h-4 w-4" />;
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'low': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-slate-500';
  };

  return (
    <Card className={`border-l-4 border-l-primary animate-fade-in ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Market Intelligence Score
          </div>
          <Badge className={`${getLevelColor(scoreBreakdown.level)} border`}>
            <div className="flex items-center gap-1">
              {getLevelIcon(scoreBreakdown.level)}
              {scoreBreakdown.level.toUpperCase()}
            </div>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - scoreBreakdown.overall / 100)}`}
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{scoreBreakdown.overall}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic">
            "{scoreBreakdown.insight}"
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Growth Potential</span>
              <span className="font-medium">{scoreBreakdown.growth}/100</span>
            </div>
            <Progress value={scoreBreakdown.growth} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Market Demand</span>
              <span className="font-medium">{scoreBreakdown.demand}/100</span>
            </div>
            <Progress value={scoreBreakdown.demand} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Salary Competitiveness</span>
              <span className="font-medium">{scoreBreakdown.salary}/100</span>
            </div>
            <Progress value={scoreBreakdown.salary} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Entry Opportunity</span>
              <span className="font-medium">{scoreBreakdown.competition}/100</span>
            </div>
            <Progress value={scoreBreakdown.competition} className="h-2" />
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-center">
          <div>
            <div className="text-lg font-semibold text-primary">
              {marketData.length}
            </div>
            <div className="text-xs text-muted-foreground">Markets Analyzed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-emerald-600">
              {marketData.filter(m => m.growth_rate > 10).length}
            </div>
            <div className="text-xs text-muted-foreground">High Growth</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};