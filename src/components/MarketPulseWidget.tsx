import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';

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
  created_at: string;
}

interface MarketPulseWidgetProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
  onActionClick?: (action: string) => void;
}

interface PulsePattern {
  id: string;
  type: 'surge' | 'decline' | 'stability' | 'volatility';
  title: string;
  description: string;
  confidence: number;
  detected_at: string;
  severity: 'low' | 'medium' | 'high';
}

export const MarketPulseWidget: React.FC<MarketPulseWidgetProps> = React.memo(({
  marketData,
  selectedCareerPath,
  selectedLocation,
  onActionClick
}) => {
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable last update time - only changes when component mounts
  const lastUpdate = useMemo(() => new Date(), []);

  useEffect(() => {
    // Start pulse animation independent of data changes
    intervalRef.current = setInterval(() => {
      setPulseAnimation(prev => !prev);
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array - animation runs independently

  // Memoized pattern detection - only recalculates when data actually changes
  const patterns = useMemo((): PulsePattern[] => {
    if (!marketData || marketData.length === 0) {
      return [{
        id: 'no-data',
        type: 'stability',
        title: 'Awaiting Market Data',
        description: 'Generate market analysis to detect live patterns and trends.',
        confidence: 0,
        detected_at: lastUpdate.toISOString(),
        severity: 'low'
      }];
    }

    const patterns: PulsePattern[] = [];

    // Analyze growth trends
    const highGrowthMarkets = marketData.filter(m => m.growth_rate > 20);
    if (highGrowthMarkets.length > 0) {
      patterns.push({
        id: 'growth-surge',
        type: 'surge',
        title: 'Growth Surge Detected',
        description: `${highGrowthMarkets.length} markets showing 20%+ growth rates`,
        confidence: 85,
        detected_at: lastUpdate.toISOString(),
        severity: 'high'
      });
    }

    // Analyze demand patterns
    const highDemandMarkets = marketData.filter(m => m.demand_score > 7);
    if (highDemandMarkets.length >= marketData.length * 0.6) {
      patterns.push({
        id: 'demand-stability',
        type: 'stability',
        title: 'Strong Market Demand',
        description: `${Math.round((highDemandMarkets.length / marketData.length) * 100)}% of markets show high demand scores`,
        confidence: 90,
        detected_at: lastUpdate.toISOString(),
        severity: 'medium'
      });
    }

    // Analyze salary trends
    const avgSalary = marketData.reduce((sum, m) => sum + m.average_salary, 0) / marketData.length;
    const highSalaryMarkets = marketData.filter(m => m.average_salary > avgSalary * 1.2);
    if (highSalaryMarkets.length > 0) {
      patterns.push({
        id: 'salary-opportunity',
        type: 'surge',
        title: 'Salary Premium Markets',
        description: `${highSalaryMarkets.length} markets offering 20%+ above average salaries`,
        confidence: 80,
        detected_at: lastUpdate.toISOString(),
        severity: 'high'
      });
    }

    // Analyze competition patterns
    const lowCompetitionMarkets = marketData.filter(m => m.competition_level === 'low');
    if (lowCompetitionMarkets.length > 0) {
      patterns.push({
        id: 'low-competition',
        type: 'surge',
        title: 'Low Competition Windows',
        description: `${lowCompetitionMarkets.length} markets with reduced competition levels`,
        confidence: 75,
        detected_at: lastUpdate.toISOString(),
        severity: 'medium'
      });
    }

    // Detect potential risks
    const decliningMarkets = marketData.filter(m => m.growth_rate < 0);
    if (decliningMarkets.length > 0) {
      patterns.push({
        id: 'market-decline',
        type: 'decline',
        title: 'Market Cooling Detected',
        description: `${decliningMarkets.length} markets showing negative growth trends`,
        confidence: 70,
        detected_at: lastUpdate.toISOString(),
        severity: 'high'
      });
    }

    // If no significant patterns, show stability
    if (patterns.length === 0) {
      patterns.push({
        id: 'market-stable',
        type: 'stability',
        title: 'Market Stability',
        description: 'No significant pattern changes detected in current analysis',
        confidence: 60,
        detected_at: lastUpdate.toISOString(),
        severity: 'low'
      });
    }

    return patterns.slice(0, 3); // Return top 3 patterns
  }, [marketData, lastUpdate]);

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'surge': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decline': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'volatility': return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'stability': return <Activity className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'surge': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'decline': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'volatility': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'stability': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
      default: return 'border-border bg-card';
    }
  };

  const getSeverityBadge = (severity: string, confidence: number) => {
    const getVariant = () => {
      if (confidence === 0) return 'outline';
      switch (severity) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        default: return 'outline';
      }
    };

    return (
      <Badge variant={getVariant()} className="text-xs">
        {confidence > 0 ? `${confidence}% confidence` : 'No Data'}
      </Badge>
    );
  };

  const PulseIndicator = () => (
    <div className="relative flex items-center justify-center">
      <div className={`w-3 h-3 bg-green-500 rounded-full ${pulseAnimation ? 'animate-pulse' : ''}`} />
      <div className={`absolute w-6 h-6 border-2 border-green-500 rounded-full ${pulseAnimation ? 'animate-ping' : ''}`} />
    </div>
  );

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Market Pulse
          </div>
          <div className="flex items-center gap-2">
            <PulseIndicator />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Update */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>

        {/* Detected Patterns */}
        <div className="space-y-3">
          {patterns.map((pattern, index) => (
            <div
              key={pattern.id}
              className={`p-3 rounded-lg border transition-all hover:shadow-sm ${getPatternColor(pattern.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPatternIcon(pattern.type)}
                  <h4 className="font-medium text-sm">{pattern.title}</h4>
                </div>
                {getSeverityBadge(pattern.severity, pattern.confidence)}
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {pattern.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Pattern #{index + 1}
                </span>
                {pattern.confidence > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pattern.confidence}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Market Activity Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {marketData.filter(m => m.growth_rate > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">Growing Markets</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {patterns.length}
              </div>
              <div className="text-xs text-muted-foreground">Active Patterns</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {marketData.length > 0 && (
          <div className="pt-2">
            <button 
              onClick={() => onActionClick?.('View Pattern Details')}
              className="w-full text-xs text-primary hover:text-primary/80 font-medium py-2 border border-primary/20 rounded-md hover:bg-primary/5 transition-all"
            >
              View Pattern Details →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});