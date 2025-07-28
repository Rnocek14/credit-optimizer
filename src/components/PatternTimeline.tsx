import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap,
  Clock,
  BarChart3,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PatternTimelineProps {
  careerPath?: string;
  location?: string;
  limit?: number;
}

interface PatternEvent {
  id: string;
  pattern_type: string;
  confidence_score: number;
  detected_at: string;
  career_path: string;
  location: string;
  pattern_data: any;
  anomaly_score?: number;
  valid_until?: string;
}

const PATTERN_TYPES = {
  seasonal: { label: 'Seasonal Pattern', icon: Activity, color: 'bg-blue-500' },
  trend: { label: 'Market Trend', icon: TrendingUp, color: 'bg-emerald-500' },
  volatility: { label: 'Volatility Alert', icon: AlertTriangle, color: 'bg-amber-500' },
  anomaly: { label: 'Market Anomaly', icon: Zap, color: 'bg-red-500' },
  growth: { label: 'Growth Pattern', icon: BarChart3, color: 'bg-purple-500' },
  demand: { label: 'Demand Shift', icon: TrendingUp, color: 'bg-cyan-500' }
};

export const PatternTimeline: React.FC<PatternTimelineProps> = ({
  careerPath,
  location,
  limit = 10
}) => {
  const [patterns, setPatterns] = useState<PatternEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [careerPath, location]);

  const loadPatterns = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('pattern_recognition_results')
        .select('*')
        .order('detected_at', { ascending: false });

      if (careerPath) {
        query = query.ilike('career_path', `%${careerPath}%`);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      const { data, error: fetchError } = await query.limit(limit);

      if (fetchError) {
        throw new Error(`Failed to load patterns: ${fetchError.message}`);
      }

      setPatterns(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pattern timeline');
      console.error('❌ Pattern timeline error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPatterns();
    setRefreshing(false);
  };

  const getPatternConfig = (type: string) => {
    return PATTERN_TYPES[type as keyof typeof PATTERN_TYPES] || {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      icon: Brain,
      color: 'bg-gray-500'
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600';
    if (confidence >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatPatternData = (data: any) => {
    if (!data) return 'No additional data available';
    
    if (typeof data === 'string') return data;
    
    if (data.summary) return data.summary;
    
    // Extract key insights from pattern data
    const insights = [];
    if (data.confidence) insights.push(`${data.confidence}% confidence`);
    if (data.strength) insights.push(`${data.strength} strength`);
    if (data.period) insights.push(`${data.period} period`);
    if (data.trend_direction) insights.push(`${data.trend_direction} trend`);
    
    return insights.length > 0 ? insights.join(' • ') : 'Pattern detected';
  };

  const isPatternActive = (pattern: PatternEvent) => {
    if (!pattern.valid_until) return true;
    return new Date(pattern.valid_until) > new Date();
  };

  if (loading && patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Pattern Timeline
          </CardTitle>
          <CardDescription>
            Loading pattern recognition history...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Pattern Timeline
        </CardTitle>
        <CardDescription>
          AI-detected market patterns and anomalies over time
        </CardDescription>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-xs">
            {patterns.length} patterns found
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="p-4 border border-destructive/20 rounded-lg mb-4 bg-destructive/5">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No patterns detected yet</p>
            <p className="text-xs">Run market analysis to generate pattern insights</p>
          </div>
        ) : (
          <div className="space-y-4">
            {patterns.map((pattern) => {
              const config = getPatternConfig(pattern.pattern_type);
              const Icon = config.icon;
              const isActive = isPatternActive(pattern);
              const isExpanded = expanded === pattern.id;

              return (
                <div 
                  key={pattern.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-sm ${
                    isActive ? 'border-primary/20 bg-primary/5' : 'border-muted bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{config.label}</h4>
                          <Badge 
                            variant={isActive ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {isActive ? 'Active' : 'Expired'}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          {pattern.career_path} • {pattern.location}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {formatPatternData(pattern.pattern_data)}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Confidence:</span>
                            <span className={`text-xs font-medium ${getConfidenceColor(pattern.confidence_score)}`}>
                              {pattern.confidence_score}%
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(pattern.detected_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          
                          {pattern.anomaly_score && pattern.anomaly_score > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span className="text-xs text-amber-600">
                                {pattern.anomaly_score.toFixed(1)} anomaly
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <Progress 
                            value={pattern.confidence_score} 
                            className="h-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isExpanded ? null : pattern.id)}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-muted">
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Pattern Details:</span>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(pattern.pattern_data, null, 2)}
                          </pre>
                        </div>
                        
                        {pattern.valid_until && (
                          <div>
                            <span className="font-medium">Valid Until:</span>
                            <span className="ml-2 text-muted-foreground">
                              {format(new Date(pattern.valid_until), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};