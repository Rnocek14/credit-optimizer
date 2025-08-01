import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { TrendingUp, AlertCircle, Target, Clock, RefreshCw } from 'lucide-react';

interface RealTimeInsight {
  id: string;
  type: 'market_alert' | 'skill_gap' | 'opportunity' | 'prediction';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: string;
  data?: any;
}

export function MayaRealTimeInsights() {
  const { getResponseInsights, lastResponse } = useEnhancedMaya();
  const [insights, setInsights] = useState<RealTimeInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const responseInsights = getResponseInsights();

  useEffect(() => {
    // Generate mock real-time insights for demo
    generateMockInsights();
    const interval = setInterval(generateMockInsights, 30000);
    return () => clearInterval(interval);
  }, [lastResponse]);

  const generateMockInsights = () => {
    setLoading(true);
    
    const mockInsights: RealTimeInsight[] = [
      {
        id: '1',
        type: 'market_alert',
        title: 'Market Demand Alert',
        description: 'Product Manager roles showing 15% increase in demand this week',
        priority: 'high',
        actionable: true,
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        data: { threshold: 85, current: 91 }
      },
      {
        id: '2',
        type: 'skill_gap',
        title: 'Skill Gap Identified',
        description: 'Strategic Planning skills gap detected for Senior PM transition',
        priority: 'medium',
        actionable: true,
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        data: { gap_percentage: 65 }
      },
      {
        id: '3',
        type: 'opportunity',
        title: 'Career Opportunity',
        description: 'Optimal timing detected for product management transition',
        priority: 'high',
        actionable: true,
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        data: { success_probability: 0.85 }
      },
      {
        id: '4',
        type: 'prediction',
        title: 'Market Forecast',
        description: 'AI predicts 25% salary growth in PM roles over next 6 months',
        priority: 'medium',
        actionable: false,
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        data: { confidence: 0.92, prediction_type: 'salary_growth' }
      }
    ];

    if (responseInsights?.hasMarketData) {
      mockInsights.push({
        id: '5',
        type: 'market_alert',
        title: 'Live Market Update',
        description: 'Real-time market intelligence updated from Maya analysis',
        priority: 'high',
        actionable: true,
        timestamp: new Date().toISOString(),
        data: { source: 'maya_ai' }
      });
    }

    setInsights(mockInsights);
    setLastUpdate(new Date());
    setLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'market_alert': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'skill_gap': return <Target className="w-4 h-4 text-blue-500" />;
      case 'opportunity': return <AlertCircle className="w-4 h-4 text-green-500" />;
      case 'prediction': return <Clock className="w-4 h-4 text-purple-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Real-Time Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateMockInsights}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated {formatTimeAgo(lastUpdate.toISOString())}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intelligence Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{insights.filter(i => i.priority === 'high').length}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{insights.filter(i => i.type === 'market_alert').length}</div>
            <div className="text-xs text-muted-foreground">Market Alerts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{insights.filter(i => i.actionable).length}</div>
            <div className="text-xs text-muted-foreground">Actionable</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{insights.filter(i => i.type === 'prediction').length}</div>
            <div className="text-xs text-muted-foreground">Predictions</div>
          </div>
        </div>

        {/* Real-Time Insights List */}
        <div className="space-y-3">
          {loading && insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading real-time insights...
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No real-time insights yet</p>
              <p className="text-sm text-muted-foreground">
                Maya will analyze your data and provide insights as they emerge
              </p>
            </div>
          ) : (
            insights.map((insight) => (
              <Card key={insight.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs">
                            Actionable
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      
                      {insight.data && (
                        <div className="text-xs text-muted-foreground">
                          {insight.type === 'market_alert' && insight.data.threshold && (
                            <span>Threshold: {insight.data.threshold}, Current: {insight.data.current}</span>
                          )}
                          {insight.type === 'prediction' && insight.data.confidence && (
                            <span>Confidence: {Math.round(insight.data.confidence * 100)}%</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="capitalize">{insight.type.replace('_', ' ')}</span>
                        <span>{formatTimeAgo(insight.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}