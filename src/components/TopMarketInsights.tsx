import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react';
import { useInsightTracking } from '@/hooks/useInsightTracking';

interface MarketTrend {
  id: string;
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  ai_insights: any;
}

interface TopMarketInsightsProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
  onActionClick?: (action: string, careerPath?: string, location?: string) => void;
}

interface Insight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action?: string;
}

export const TopMarketInsights: React.FC<TopMarketInsightsProps> = ({
  marketData,
  selectedCareerPath,
  selectedLocation,
  onActionClick
}) => {
  const { trackInsightInteraction } = useInsightTracking();
  const generateInsights = (): Insight[] => {
    if (!marketData || marketData.length === 0) {
      return [{
        id: '1',
        type: 'recommendation',
        title: 'No Market Data Available',
        description: 'Generate market analysis to see intelligent insights about career opportunities and trends.',
        confidence: 100,
        impact: 'high',
        action: 'Run Market Analysis'
      }];
    }

    const insights: Insight[] = [];

    // Find highest growth opportunities
    const highGrowthMarkets = marketData
      .filter(m => m.growth_rate > 15)
      .sort((a, b) => b.growth_rate - a.growth_rate)
      .slice(0, 3);

    if (highGrowthMarkets.length > 0) {
      const topMarket = highGrowthMarkets[0];
      insights.push({
        id: 'growth-opportunity',
        type: 'opportunity',
        title: `${topMarket.career_path} Showing Strong Growth`,
        description: `${topMarket.growth_rate}% growth rate in ${topMarket.location} with ${topMarket.job_postings_count} active positions.`,
        confidence: 85,
        impact: 'high',
        action: 'Analyze This Market'
      });
    }

    // Find salary opportunities
    const highSalaryMarkets = marketData
      .filter(m => m.average_salary > 80000)
      .sort((a, b) => b.average_salary - a.average_salary)
      .slice(0, 2);

    if (highSalaryMarkets.length > 0) {
      const topSalaryMarket = highSalaryMarkets[0];
      insights.push({
        id: 'salary-opportunity',
        type: 'opportunity',
        title: `High Salary Potential in ${topSalaryMarket.location}`,
        description: `${topSalaryMarket.career_path} roles averaging $${topSalaryMarket.average_salary.toLocaleString()} annually.`,
        confidence: 90,
        impact: 'high',
        action: 'View Salary Analysis'
      });
    }

    // Find market risks
    const lowDemandMarkets = marketData
      .filter(m => m.demand_score < 3 || m.growth_rate < 0)
      .sort((a, b) => a.demand_score - b.demand_score);

    if (lowDemandMarkets.length > 0) {
      const riskMarket = lowDemandMarkets[0];
      insights.push({
        id: 'market-risk',
        type: 'risk',
        title: `Market Cooling in ${riskMarket.career_path}`,
        description: `Demand score of ${riskMarket.demand_score}/10 with ${riskMarket.growth_rate}% growth rate suggests market saturation.`,
        confidence: 75,
        impact: 'medium',
        action: 'Explore Alternatives'
      });
    }

    // AI-driven recommendations
    if (selectedCareerPath && selectedLocation) {
      const relevantData = marketData.filter(m => 
        m.career_path.toLowerCase().includes(selectedCareerPath.toLowerCase()) ||
        m.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );

      if (relevantData.length > 0) {
        const avgGrowth = relevantData.reduce((sum, m) => sum + m.growth_rate, 0) / relevantData.length;
        const avgSalary = relevantData.reduce((sum, m) => sum + m.average_salary, 0) / relevantData.length;

        insights.push({
          id: 'personalized-recommendation',
          type: 'recommendation',
          title: 'Personalized Market Strategy',
          description: `Your selected market shows ${avgGrowth.toFixed(1)}% growth with $${avgSalary.toLocaleString()} average salary. Consider timing your move for optimal positioning.`,
          confidence: 88,
          impact: 'high',
          action: 'Generate Strategy'
        });
      }
    }

    return insights.slice(0, 3); // Return top 3 insights
  };

  const insights = generateInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'trend': return <TrendingDown className="h-5 w-5 text-blue-600" />;
      case 'recommendation': return <Lightbulb className="h-5 w-5 text-purple-600" />;
      default: return <Lightbulb className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'risk': return 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800';
      case 'trend': return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800';
      case 'recommendation': return 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800';
      default: return 'bg-card border-border';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return <Badge variant="destructive" className="text-xs">High Impact</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">Medium Impact</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">Low Impact</Badge>;
      default: return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Top 3 Market Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={insight.id}
            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getInsightIcon(insight.type)}
                <h4 className="font-semibold text-sm">{insight.title}</h4>
              </div>
              {getImpactBadge(insight.impact)}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {insight.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {insight.confidence}% confidence
                </span>
                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${insight.confidence}%` }}
                  />
                </div>
              </div>
              
              {insight.action && (
                <button 
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                  onClick={async () => {
                    // Track the interaction
                    await trackInsightInteraction({
                      insight_id: insight.id,
                      insight_type: insight.type,
                      action_taken: insight.action === 'View Salary Analysis' ? 'view_salary_analysis' : 
                                   insight.action === 'Generate Strategy' ? 'generate_strategy' :
                                   insight.action === 'Analyze This Market' ? 'analyzed' : 'clicked',
                      career_path: insight.type === 'opportunity' && insight.description.includes('in') ? 
                                  insight.description.split(' in ')[0].replace(/^\w+\s+\w+\s+/, '') : undefined,
                      location: insight.type === 'opportunity' && insight.description.includes('in') ? 
                               insight.description.split(' in ')[1].split(' with')[0] : undefined,
                      confidence_score: insight.confidence
                    });
                    
                    // Call the action handler
                    if (onActionClick) {
                      const careerPath = insight.type === 'opportunity' && insight.description.includes('in') ? 
                                        insight.description.split(' in ')[0].replace(/^\w+\s+\w+\s+/, '') : undefined;
                      const location = insight.type === 'opportunity' && insight.description.includes('in') ? 
                                      insight.description.split(' in ')[1].split(' with')[0] : undefined;
                      onActionClick(insight.action, careerPath, location);
                    }
                  }}
                >
                  {insight.action} →
                </button>
              )}
            </div>
          </div>
        ))}
        
        {insights.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available. Add market data to generate intelligent recommendations.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};