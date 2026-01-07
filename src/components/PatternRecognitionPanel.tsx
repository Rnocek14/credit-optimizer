import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from "recharts";
import { Brain, TrendingUp, Activity, AlertTriangle, BarChart3, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PatternRecognitionPanelProps {
  careerPath: string;
  location: string;
  autoData?: any;
  autoTrigger?: boolean;
}

interface Pattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  confidence_score: number;
  detected_at: string;
  valid_until?: string;
}

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  anomaly_score: number;
  detected_at: string;
  metadata: any;
}

interface Correlation {
  career_path_b: string;
  correlation_coefficient: number;
  correlation_type: string;
  strength: string;
}

export function PatternRecognitionPanel({ careerPath, location, autoData, autoTrigger }: PatternRecognitionPanelProps) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingPatterns();
    fetchAnomalies();
    fetchCorrelations();
  }, [careerPath, location]);

  // Auto-populate data when provided from comprehensive analysis
  useEffect(() => {
    if (autoData && autoTrigger) {
      console.log('🔥 Auto-populating pattern recognition data:', autoData);
      if (autoData.patterns) {
        setPatterns(autoData.patterns);
      }
      if (autoData.anomalies) {
        setAnomalies(autoData.anomalies);
      }
      if (autoData.correlations) {
        setCorrelations(autoData.correlations);
      }
      setLastAnalysis(new Date().toISOString());
    }
  }, [autoData, autoTrigger]);

  const fetchExistingPatterns = async () => {
    const { data, error } = await supabase
      .from('pattern_recognition_results')
      .select('*')
      .eq('career_path', careerPath)
      .eq('location', location)
      .gte('valid_until', new Date().toISOString())
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Error fetching patterns:', error);
      return;
    }

    // Deduplicate patterns by type, keeping only the most recent of each type
    const uniquePatterns = data ? data.reduce((acc: Pattern[], current: Pattern) => {
      const existingIndex = acc.findIndex(p => p.pattern_type === current.pattern_type);
      if (existingIndex === -1) {
        acc.push(current);
      } else if (new Date(current.detected_at) > new Date(acc[existingIndex].detected_at)) {
        acc[existingIndex] = current;
      }
      return acc;
    }, []) : [];

    setPatterns(uniquePatterns);
  };

  const fetchAnomalies = async () => {
    const { data, error } = await supabase
      .from('anomaly_detections')
      .select('*')
      .eq('career_path', careerPath)
      .eq('location', location)
      .is('resolved_at', null)
      .order('detected_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching anomalies:', error);
      return;
    }

    setAnomalies(data || []);
  };

  const fetchCorrelations = async () => {
    const { data, error } = await supabase
      .from('market_correlations')
      .select('*')
      .eq('career_path_a', careerPath)
      .eq('location', location)
      .order('correlation_coefficient', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching correlations:', error);
      return;
    }

    setCorrelations(data || []);
  };

  const runPatternAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pattern-recognition-engine', {
        body: {
          careerPath,
          location,
          timeframe: '90d',
          analysisTypes: ['seasonal', 'trend', 'volatility', 'anomaly']
        }
      });

      if (error) throw error;

      if (data.success) {
        setLastAnalysis(new Date().toISOString());
        await fetchExistingPatterns();
        await fetchAnomalies();
        await fetchCorrelations();
        
        toast({
          title: "Pattern Analysis Complete",
          description: `Found ${data.patterns?.length || 0} patterns and ${data.anomalies?.length || 0} anomalies.`,
        });
      } else {
        // Handle cooldown period
        if (data.message?.includes('already run recently')) {
          toast({
            title: "Analysis Recently Completed",
            description: "Pattern analysis was run within the last 24 hours. Results are still valid.",
            variant: "default",
          });
          // Still fetch existing data
          await fetchExistingPatterns();
          await fetchAnomalies();
          await fetchCorrelations();
        } else {
          throw new Error(data.message || 'Analysis failed');
        }
      }
    } catch (error) {
      console.error('Pattern analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to complete pattern analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'seasonal': return <Activity className="h-4 w-4" />;
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'volatility': return <BarChart3 className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCorrelationColor = (coefficient: number) => {
    const abs = Math.abs(coefficient);
    if (abs > 0.7) return 'var(--primary)';
    if (abs > 0.5) return 'var(--secondary)';
    return 'var(--muted)';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Advanced Pattern Recognition</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of market patterns, trends, and anomalies
          </p>
        </div>
        <Button 
          onClick={runPatternAnalysis} 
          disabled={isAnalyzing}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          {isAnalyzing ? 'Analyzing...' : (autoData && autoTrigger ? 'Re-run Analysis' : 'Run Analysis')}
        </Button>
      </div>

      {lastAnalysis && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Last analysis: {new Date(lastAnalysis).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">Patterns ({patterns.length})</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies ({anomalies.length})</TabsTrigger>
          <TabsTrigger value="correlations">Correlations ({correlations.length})</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          {patterns.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No patterns detected. Run analysis to discover market patterns.
                </p>
              </CardContent>
            </Card>
          ) : (
            patterns.map((pattern) => (
              <Card key={pattern.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {getPatternIcon(pattern.pattern_type)}
                      {pattern.pattern_type ? 
                        pattern.pattern_type.charAt(0).toUpperCase() + pattern.pattern_type.slice(1) + ' Pattern' :
                        'Unknown Pattern'
                      }
                    </CardTitle>
                    <Badge variant="outline">
                      {Math.round(pattern.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={pattern.confidence_score * 100} className="h-2" />
                    
                    {pattern.pattern_type === 'seasonal' && pattern.pattern_data.season && (
                      <div className="text-sm">
                        <p><strong>Peak Season:</strong> {pattern.pattern_data.season}</p>
                        <p><strong>Average Change:</strong> {pattern.pattern_data.averageChange?.toFixed(1)}%</p>
                      </div>
                    )}
                    
                    {pattern.pattern_type === 'trend' && (
                      <div className="text-sm">
                        <p><strong>Direction:</strong> {pattern.pattern_data.direction}</p>
                        <p><strong>Strength:</strong> {pattern.pattern_data.strength?.toFixed(3)}</p>
                        <p><strong>Duration:</strong> {pattern.pattern_data.duration}</p>
                      </div>
                    )}
                    
                    {pattern.pattern_type === 'volatility' && (
                      <div className="text-sm">
                        <p><strong>Level:</strong> {pattern.pattern_data.level}</p>
                        <p><strong>Coefficient:</strong> {pattern.pattern_data.coefficient?.toFixed(3)}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Detected: {new Date(pattern.detected_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {anomalies.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No anomalies detected. The market is behaving normally.
                </p>
              </CardContent>
            </Card>
          ) : (
            anomalies.map((anomaly) => (
              <Card key={anomaly.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4" />
                      {anomaly.anomaly_type ? 
                        anomaly.anomaly_type.charAt(0).toUpperCase() + anomaly.anomaly_type.slice(1) + ' Anomaly' :
                        'Unknown Anomaly'
                      }
                    </CardTitle>
                    <Badge variant={getSeverityColor(anomaly.severity) as any}>
                      {anomaly.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">{anomaly.metadata?.description}</p>
                    <p className="text-sm">
                      <strong>Anomaly Score:</strong> {anomaly.anomaly_score.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Detected: {new Date(anomaly.detected_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="correlations" className="space-y-4">
          {correlations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No significant correlations found. Run analysis to discover market relationships.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market Correlations</CardTitle>
                  <CardDescription>
                    How this career path correlates with others in {location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={correlations.map((c, i) => ({ 
                        x: i, 
                        y: c.correlation_coefficient,
                        name: c.career_path_b,
                        coefficient: c.correlation_coefficient
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          domain={[0, correlations.length - 1]}
                          tickFormatter={(value) => correlations[value]?.career_path_b?.substring(0, 10) || ''}
                        />
                        <YAxis domain={[-1, 1]} />
                        <Tooltip 
                          formatter={(value: any, name: string, props: any) => [
                            `${(value * 100).toFixed(1)}%`,
                            'Correlation'
                          ]}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.name || ''}
                        />
                        <Scatter dataKey="y">
                          {correlations.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getCorrelationColor(entry.correlation_coefficient)} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {correlations.map((correlation, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{correlation.career_path_b}</p>
                        <p className="text-sm text-muted-foreground">
                          {correlation.strength} {correlation.correlation_type} correlation
                        </p>
                      </div>
                      <Badge 
                        variant={correlation.correlation_type === 'positive' ? 'default' : 'secondary'}
                      >
                        {(correlation.correlation_coefficient * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI-Generated Insights</CardTitle>
              <CardDescription>
                Intelligent analysis of patterns and market conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.length > 0 && (
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Pattern Summary:</strong> Detected {patterns.length} significant pattern(s) 
                      with an average confidence of {Math.round(patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length * 100)}%.
                    </AlertDescription>
                  </Alert>
                )}
                
                {anomalies.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Anomaly Alert:</strong> {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} detected. 
                      {anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && 
                        ' Critical anomalies require immediate attention.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
                
                {correlations.length > 0 && (
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Market Relationships:</strong> This career path shows significant correlation 
                      with {correlations.length} other career{correlations.length === 1 ? '' : 's'} in your location.
                    </AlertDescription>
                  </Alert>
                )}
                
                {patterns.length === 0 && anomalies.length === 0 && correlations.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    Run pattern analysis to generate AI insights for this career path and location.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}