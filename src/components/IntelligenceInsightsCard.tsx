import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Zap,
  ChevronRight,
  Lightbulb,
  Star,
  Clock
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timeframe?: string;
}

interface IntelligenceInsightsCardProps {
  selectedCareerPath: { id: string; title: string } | null;
  selectedLocation: { id: string; label: string; value: string; emoji: string } | null;
  analysis: any;
  marketData: any[];
  onNavigateToTab: (tab: string) => void;
}

export const IntelligenceInsightsCard: React.FC<IntelligenceInsightsCardProps> = ({
  selectedCareerPath,
  selectedLocation,
  analysis,
  marketData,
  onNavigateToTab
}) => {
  const [insights, setInsights] = useState<Insight[]>([]);

  const generateInsights = (): Insight[] => {
    const newInsights: Insight[] = [];

    // Market Data Insights
    if (marketData.length > 0) {
      const avgGrowth = marketData.reduce((acc, curr) => acc + curr.growth_rate, 0) / marketData.length;
      const highGrowthCareers = marketData.filter(m => m.growth_rate > avgGrowth * 1.2);
      
      if (highGrowthCareers.length > 0) {
        newInsights.push({
          id: 'high-growth-opportunity',
          type: 'opportunity',
          title: `${highGrowthCareers.length} High-Growth Opportunities Detected`,
          description: `Found careers with ${Math.round(avgGrowth * 1.2)}%+ growth rate. Consider exploring these emerging fields.`,
          confidence: 85,
          actionable: true,
          action: {
            label: 'View Opportunities', 
            onClick: () => {
              console.log('📍 View Opportunities clicked');
              // For now, navigate to overview and show market activity
              onNavigateToTab('overview');
              // TODO: Future enhancement - navigate to dedicated jobs/opportunities page
            }
          },
          timeframe: 'Next 6 months'
        });
      }

      // Salary trend insight
      const avgSalary = marketData.reduce((acc, curr) => acc + curr.average_salary, 0) / marketData.length;
      if (avgSalary > 80000) {
        newInsights.push({
          id: 'salary-trend',
          type: 'trend',
          title: 'Above-Average Salary Markets',
          description: `Current market shows strong compensation trends with average salary of $${Math.round(avgSalary).toLocaleString()}.`,
          confidence: 90,
          actionable: true,
          action: {
            label: 'Explore Salaries',
            onClick: () => onNavigateToTab('research')
          }
        });
      }
    }

    // Selection-Based Insights
    if (selectedCareerPath && selectedLocation) {
      newInsights.push({
        id: 'personalized-analysis',
        type: 'recommendation',
        title: `Ready to Analyze ${selectedCareerPath.title}`,
        description: `Get comprehensive market intelligence for ${selectedCareerPath.title} in ${selectedLocation.label} to uncover specific opportunities.`,
        confidence: 95,
        actionable: true,
        action: {
          label: 'Run Analysis',
          onClick: () => {
            console.log('🔍 Run Analysis clicked - navigating to analysis tab');
            onNavigateToTab('analysis');
          }
        }
      });
    }

    // Analysis-Based Insights
    if (analysis?.marketTrends?.aiInsights) {
      const aiInsights = analysis.marketTrends.aiInsights;
      
      if (aiInsights.demandTrend === 'increasing') {
        newInsights.push({
          id: 'demand-increasing',
          type: 'opportunity',
          title: 'Rising Market Demand Detected',
          description: `${selectedCareerPath?.title} shows increasing demand with ${aiInsights.confidence}% confidence. Perfect timing for career moves.`,
          confidence: aiInsights.confidence,
          actionable: true,
          action: {
            label: 'View Forecast',
            onClick: () => onNavigateToTab('analysis')
          },
          timeframe: analysis.timeframe
        });
      }

      if (aiInsights.salaryTrend === 'rising') {
        newInsights.push({
          id: 'salary-rising',
          type: 'trend',
          title: 'Salary Growth Trajectory',
          description: `Strong salary growth trends detected. Consider timing your career transition to maximize compensation.`,
          confidence: aiInsights.confidence,
          actionable: true,
          action: {
            label: 'Salary Analysis',
            onClick: () => onNavigateToTab('research')
          }
        });
      }

      if (aiInsights.marketSaturation === 'low') {
        newInsights.push({
          id: 'low-saturation',
          type: 'opportunity',
          title: 'Low Market Saturation',
          description: `Excellent opportunity! Low competition means better chances for career advancement and higher negotiation power.`,
          confidence: aiInsights.confidence,
          actionable: true,
          action: {
            label: 'Explore Trends',
            onClick: () => onNavigateToTab('analysis')
          }
        });
      }

      // Risk factor insights
      if (aiInsights.riskFactors && aiInsights.riskFactors.length > 0) {
        newInsights.push({
          id: 'risk-factors',
          type: 'warning',
          title: 'Market Risk Factors Identified',
          description: `Be aware of ${aiInsights.riskFactors.length} potential challenges: ${aiInsights.riskFactors.slice(0, 2).join(', ')}.`,
          confidence: aiInsights.confidence,
          actionable: true,
          action: {
            label: 'Review Details',
            onClick: () => onNavigateToTab('analysis')
          }
        });
      }
    }

    return newInsights.slice(0, 4); // Limit to 4 most relevant insights
  };

  useEffect(() => {
    setInsights(generateInsights());
  }, [selectedCareerPath, selectedLocation, analysis, marketData]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Target className="h-4 w-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4 text-purple-600" />;
      default:
        return <Brain className="h-4 w-4 text-primary" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50 dark:bg-amber-950';
      case 'trend':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'recommendation':
        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950';
      default:
        return 'border-l-primary bg-primary/5';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            Intelligence Insights
          </CardTitle>
          <CardDescription>
            Select a career path and location to unlock AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Insights will appear here as you explore market data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Intelligence Insights
          <Badge variant="secondary" className="ml-auto">
            {insights.length} insights
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered recommendations based on your current market analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => (
          <div 
            key={insight.id}
            className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getInsightIcon(insight.type)}
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {insight.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {insight.timeframe && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {insight.timeframe}
                      </span>
                    )}
                    {insight.actionable && (
                      <Badge variant="secondary">
                        Actionable
                      </Badge>
                    )}
                  </div>
                  
                  {insight.action && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={insight.action.onClick}
                      className="text-xs"
                    >
                      {insight.action.label}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Insight Summary */}
        <div className="mt-6 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-medium">Insight Score:</span>
            <Badge variant="secondary">
              {Math.round(insights.reduce((acc, insight) => acc + insight.confidence, 0) / insights.length)}% avg confidence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {insights.length} AI-generated insights from your market data
          </p>
        </div>
      </CardContent>
    </Card>
  );
};