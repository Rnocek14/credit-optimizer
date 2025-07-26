import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, DollarSign, Users } from 'lucide-react';

interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
}

interface OpportunityScoreWidgetProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
}

interface OpportunityScore {
  overall: number;
  growth: number;
  demand: number;
  competition: number;
  salary: number;
  recommendation: string;
  marketSize: number;
}

export const OpportunityScoreWidget: React.FC<OpportunityScoreWidgetProps> = React.memo(({
  marketData,
  selectedCareerPath,
  selectedLocation
}) => {
  console.log('🔍 OpportunityScoreWidget: Component loading...');
  // Memoized opportunity score calculation
  const score = useMemo((): OpportunityScore => {
    if (!marketData || marketData.length === 0) {
      return {
        overall: 0,
        growth: 0,
        demand: 0,
        competition: 0,
        salary: 0,
        recommendation: 'No data available for analysis',
        marketSize: 0
      };
    }

    // Filter data based on selections or use all data
    let relevantData = marketData;
    if (selectedCareerPath) {
      relevantData = relevantData.filter(m => 
        m.career_path.toLowerCase().includes(selectedCareerPath.toLowerCase())
      );
    }
    if (selectedLocation) {
      relevantData = relevantData.filter(m => 
        m.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (relevantData.length === 0) {
      relevantData = marketData; // Fallback to all data
    }

    // Calculate component scores (0-100)
    const avgGrowthRate = relevantData.reduce((sum, m) => sum + m.growth_rate, 0) / relevantData.length;
    const avgDemandScore = relevantData.reduce((sum, m) => sum + m.demand_score, 0) / relevantData.length;
    const avgSalary = relevantData.reduce((sum, m) => sum + m.average_salary, 0) / relevantData.length;
    const totalJobPostings = relevantData.reduce((sum, m) => sum + m.job_postings_count, 0);

    // Competition scoring (inverse - lower competition = higher score)
    const competitionScores = relevantData.map(m => {
      switch (m.competition_level?.toLowerCase()) {
        case 'low': return 90;
        case 'medium': return 60;
        case 'high': return 30;
        default: return 50;
      }
    });
    const avgCompetitionScore = competitionScores.reduce((sum, score) => sum + score, 0) / competitionScores.length;

    // Normalize scores to 0-100
    const growthScore = Math.min(100, Math.max(0, (avgGrowthRate + 10) * 3)); // -10 to 30% range
    const demandScore = Math.min(100, (avgDemandScore / 10) * 100); // 0-10 scale
    const salaryScore = Math.min(100, Math.max(0, (avgSalary - 30000) / 1000)); // $30k-$130k range
    const competitionScore = avgCompetitionScore;

    // Calculate overall weighted score
    const overallScore = Math.round(
      (growthScore * 0.3) + 
      (demandScore * 0.25) + 
      (salaryScore * 0.25) + 
      (competitionScore * 0.2)
    );

    // Generate recommendation
    let recommendation = '';
    if (overallScore >= 80) {
      recommendation = 'Excellent opportunity - Strong market conditions across all metrics';
    } else if (overallScore >= 70) {
      recommendation = 'Good opportunity - Favorable market with minor considerations';
    } else if (overallScore >= 60) {
      recommendation = 'Moderate opportunity - Mixed signals, requires careful timing';
    } else if (overallScore >= 40) {
      recommendation = 'Challenging market - Consider alternative strategies or locations';
    } else {
      recommendation = 'High risk - Market conditions are unfavorable, explore alternatives';
    }

    return {
      overall: overallScore,
      growth: Math.round(growthScore),
      demand: Math.round(demandScore),
      competition: Math.round(competitionScore),
      salary: Math.round(salaryScore),
      recommendation,
      marketSize: totalJobPostings
    };
  }, [marketData, selectedCareerPath, selectedLocation]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Moderate</Badge>;
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Challenging</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">High Risk</Badge>;
  };

  const CircularProgress = ({ value, size = 120, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-muted-foreground/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getScoreColor(value)} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(value)}`}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Opportunity Score
          </div>
          {getScoreBadge(score.overall)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-center">
          <CircularProgress value={score.overall} />
        </div>

        {/* Recommendation */}
        <div className="text-center px-4">
          <p className="text-sm text-muted-foreground">
            {score.recommendation}
          </p>
        </div>

        {/* Component Scores */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm">Growth Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full transition-all duration-700"
                  style={{ width: `${score.growth}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3ch]">{score.growth}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Market Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-700"
                  style={{ width: `${score.demand}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3ch]">{score.demand}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm">Salary Potential</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 rounded-full transition-all duration-700"
                  style={{ width: `${score.salary}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3ch]">{score.salary}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <span className="text-sm">Competition Level</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-600 rounded-full transition-all duration-700"
                  style={{ width: `${score.competition}%` }}
                />
              </div>
              <span className="text-sm font-medium min-w-[3ch]">{score.competition}</span>
            </div>
          </div>
        </div>

        {/* Market Size */}
        {score.marketSize > 0 && (
          <div className="pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold">{score.marketSize.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Active Job Postings</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});