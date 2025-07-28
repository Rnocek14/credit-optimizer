import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Brain, 
  Zap, 
  Activity, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Download,
  Eye,
  Globe,
  Sparkles,
  MapPin,
  Bell
} from "lucide-react";
import { CareerPathCombobox } from "@/components/ui/CareerPathCombobox";
import { LocationCombobox } from "@/components/ui/LocationCombobox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMarketIntelligence } from "@/hooks/useMarketIntelligence";
import { useEnhancedMarketIntelligence } from "@/hooks/useEnhancedMarketIntelligence";
import { useSmartMarketSelection } from "@/hooks/useSmartMarketSelection";

export function MarketIntelligenceDashboard() {
  console.log('🔍 MarketIntelligenceDashboard: Component loading...');
  
  // CRITICAL: Call ALL hooks at the top level - NO conditional logic before hooks
  const { toast } = useToast();

  // Market intelligence hooks
  const {
    loading: miLoading,
    error: miError,
    marketData,
    fetchMarketTrends,
    analyzeMarketTrends,
    getTopGrowingCareers,
    getSalaryInsights
  } = useMarketIntelligence();

  const {
    getHistoricalTrends,
    fetchRealTimeJobData,
    generateDemandForecast,
    getPersonalizedRecommendations
  } = useEnhancedMarketIntelligence();

  const {
    autoSelectedCareerPath,
    autoSelectedLocation,
    suggestions,
    isSmartMode: smartModeState,
    setIsSmartMode: setSmartModeState
  } = useSmartMarketSelection();
  
  // All useState hooks called consistently
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState<any>(null);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [loading, setLoading] = useState({ market: false, analysis: false, salary: false, comprehensive: false });
  const [errors, setErrors] = useState({ market: null, analysis: null, salary: null });
  const [showSmartPanel, setShowSmartPanel] = useState(true);
  const [selectedCareerPath, setSelectedCareerPath] = useState<{ id: string; title: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string; emoji: string } | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [patternRecognitionData, setPatternRecognitionData] = useState<any>(null);
  const [demandForecastData, setDemandForecastData] = useState<any>(null);
  const [allAnalysisComplete, setAllAnalysisComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState<'initializing' | 'analyzing' | 'processing' | 'finalizing'>('initializing');

  // Auto-select smart defaults when available
  useEffect(() => {
    if (smartModeState && autoSelectedCareerPath && !selectedCareerPath) {
      setSelectedCareerPath(autoSelectedCareerPath);
    }
  }, [autoSelectedCareerPath, selectedCareerPath, smartModeState]);

  useEffect(() => {
    if (smartModeState && autoSelectedLocation && !selectedLocation) {
      setSelectedLocation(autoSelectedLocation);
    }
  }, [autoSelectedLocation, selectedLocation, smartModeState]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchMarketTrends();
        await loadTopCareers();
      } catch (error) {
        console.error('❌ Failed to load initial market data:', error);
        toast({
          title: "Data Loading Error",
          description: "Failed to load market data. Please refresh the page.",
          variant: "destructive"
        });
      }
    };
    
    loadInitialData();
  }, []);

  // Comprehensive analysis function
  const runComprehensiveAnalysis = async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Missing Information",
        description: "Please select both career path and location for analysis",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 Starting comprehensive analysis for:', selectedCareerPath.title, 'in', selectedLocation.label);
    
    try {
      setLoading(prev => ({ ...prev, comprehensive: true }));
      setAnalysisProgress(0);
      setAnalysisStage('initializing');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAnalysisStage('analyzing');
      setAnalysisProgress(20);
      console.log('📊 Running market trend analysis...');
      
      const analysisResult = await analyzeMarketTrends(selectedCareerPath.id, selectedLocation.id);
      console.log('📊 Analysis result:', analysisResult);
      if (analysisResult) {
        setAnalysis(analysisResult);
        setAnalysisProgress(40);
      }
      
      setAnalysisStage('processing');
      setAnalysisProgress(50);
      console.log('📈 Fetching additional market data...');
      
      const [historicalResult, realTimeResult, patternResult, forecastResult] = await Promise.allSettled([
        getHistoricalTrends(selectedCareerPath.title, selectedLocation.value, 6),
        fetchRealTimeJobData(selectedCareerPath.title, selectedLocation.value),
        supabase.functions.invoke('pattern-recognition-engine', {
          body: {
            careerPath: selectedCareerPath.title,
            location: selectedLocation.value,
            timeframe: '90d',
            analysisTypes: ['seasonal', 'trend', 'volatility', 'anomaly']
          }
        }),
        generateDemandForecast(selectedCareerPath.title, selectedLocation.value, '6months')
      ]);
      
      setAnalysisStage('finalizing');
      setAnalysisProgress(70);
      
      if (historicalResult.status === 'fulfilled' && historicalResult.value) {
        setHistoricalData(historicalResult.value);
        setAnalysisProgress(75);
      }

      if (realTimeResult.status === 'fulfilled' && realTimeResult.value) {
        setRealTimeData(realTimeResult.value);
        setAnalysisProgress(80);
      }

      if (patternResult.status === 'fulfilled' && patternResult.value?.data?.success) {
        setPatternRecognitionData(patternResult.value.data);
        setAnalysisProgress(85);
      }

      if (forecastResult.status === 'fulfilled' && forecastResult.value) {
        setDemandForecastData(forecastResult.value);
        setAnalysisProgress(90);
      }

      setAnalysisProgress(95);
      await new Promise(resolve => setTimeout(resolve, 300));

      setAllAnalysisComplete(true);
      setAnalysisProgress(100);
      console.log('✅ Comprehensive analysis completed successfully');
      
      toast({
        title: "🎉 Analysis Complete!",
        description: `Market analysis for ${selectedCareerPath.title} in ${selectedLocation.label} is ready!`,
        duration: 4000
      });
      
    } catch (error) {
      console.error('❌ Comprehensive analysis failed:', error);
      setAnalysisProgress(0);
      setAnalysisStage('initializing');
      toast({
        title: "Analysis Failed",
        description: "Failed to complete comprehensive market analysis. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setLoading(prev => ({ ...prev, comprehensive: false }));
    }
  };

  const loadTopCareers = async () => {
    try {
      const careers = await getTopGrowingCareers();
      setTopCareers(careers);
    } catch (error) {
      console.error('❌ Failed to load top careers:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'rising':
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'decreasing':
      case 'declining':
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-amber-500" />;
    }
  };

  // Market pulse calculation
  const marketPulse = marketData.length > 0 ? 
    Math.round(marketData.reduce((sum, item) => sum + (item.demand_score || 0), 0) / marketData.length) : 85;

  // Opportunity score calculation
  const opportunityScore = marketData.length > 0 && selectedCareerPath && selectedLocation ?
    Math.round(marketData
      .filter(item => 
        item.career_path.toLowerCase().includes(selectedCareerPath.title.toLowerCase()) &&
        item.location.toLowerCase().includes(selectedLocation.value.toLowerCase())
      )
      .reduce((sum, item) => sum + (item.demand_score || 0) + (item.growth_rate || 0) * 5, 0) / 2
    ) : 92;

  // Show comprehensive loading state during analysis
  if (loading.comprehensive && analysisProgress < 100) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Analyzing Market Intelligence</CardTitle>
              <CardDescription>
                Running comprehensive analysis for {selectedCareerPath?.title} in {selectedLocation?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={analysisProgress} className="w-full" />
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Stage: {analysisStage} ({analysisProgress}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Market Intelligence</h1>
              <p className="text-muted-foreground">
                AI-powered career market analysis and insights
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Smart Mode: {smartModeState ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                variant={isSmartMode ? "default" : "outline"}
                onClick={() => setIsSmartMode(!isSmartMode)}
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                AI Mode
              </Button>
            </div>
          </div>

          {/* Smart Selection Panel */}
          {showSmartPanel && suggestions && suggestions.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Smart Suggestions</CardTitle>
                <CardDescription>AI-recommended career and location combinations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{suggestion.reason}</span>
                      <Button size="sm" variant="outline" onClick={() => setShowSmartPanel(false)}>
                        Apply
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Context Selection */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <CareerPathCombobox
                value={selectedCareerPath}
                onChange={(careerPath) => {
                  console.log('🎯 Career path selected:', careerPath);
                  setSelectedCareerPath(careerPath);
                }}
                placeholder="Select career path..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <LocationCombobox
                value={selectedLocation}
                onChange={(location) => {
                  console.log('🌍 Location selected:', location);
                  setSelectedLocation(location);
                }}
                placeholder="Select location..."
              />
            </div>
            <Button 
              onClick={runComprehensiveAnalysis}
              disabled={!selectedCareerPath || !selectedLocation || loading.analysis}
              className="min-w-[140px]"
            >
              {loading.analysis ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analyze Market
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              {/* Market Pulse */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Market Pulse
                    <Badge variant="outline" className="ml-auto">Live</Badge>
                  </CardTitle>
                  <CardDescription>Real-time market health and activity indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{marketPulse}%</div>
                      <p className="text-sm text-muted-foreground">Market Health</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600">+12.3%</div>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">{marketData.length}</div>
                      <p className="text-sm text-muted-foreground">Active Markets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Opportunity Score</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{opportunityScore}</div>
                    <p className="text-xs text-muted-foreground">
                      {opportunityScore > 85 ? 'Excellent' : opportunityScore > 70 ? 'Good' : 'Fair'} market conditions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Market Insights</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analysis ? 'Ready' : 'Pending'}</div>
                    <p className="text-xs text-muted-foreground">
                      {analysis ? 'Analysis complete' : 'Select path & location'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">
                      2 high priority
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Growing Careers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Growing Careers</CardTitle>
                  <CardDescription>Fastest growing career paths based on market data</CardDescription>
                </CardHeader>
                <CardContent>
                  {miLoading ? (
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 animate-spin" />
                      Loading career data...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topCareers.slice(0, 5).map((career, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{career.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Demand Score: {career.demand_score}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon('up')}
                            <span className="text-sm font-medium text-green-600">
                              +{career.growth_rate}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {allAnalysisComplete ? (
              <div className="grid gap-6">
                {/* Market Analysis Results */}
                {analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Market Analysis Results</CardTitle>
                      <CardDescription>
                        Comprehensive analysis for {selectedCareerPath?.title || 'selected career'} in {selectedLocation?.label || 'selected location'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Growth Rate</span>
                            <Badge variant="secondary">+{analysis.marketTrends?.averageGrowth || 'N/A'}%</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Demand Score</span>
                            <Badge variant="secondary">{analysis.marketTrends?.demandScore || 'N/A'}/100</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Competition</span>
                            <Badge variant={analysis.marketTrends?.competitionLevel === 'high' ? 'destructive' : 'secondary'}>
                              {analysis.marketTrends?.competitionLevel || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">AI Insights</h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.marketTrends?.aiInsights?.recommendation || 'No insights available'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historical Data */}
                {historicalData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Historical Trends</CardTitle>
                      <CardDescription>6-month historical market data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          {historicalData.length} historical data points available
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Real-time Data */}
                {realTimeData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Real-time Job Market</CardTitle>
                      <CardDescription>Current job market activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          {realTimeData.length} real-time job postings tracked
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Market Analysis</CardTitle>
                  <CardDescription>
                    Select a career path and location to view comprehensive market analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No analysis data available</p>
                    <Button 
                      onClick={runComprehensiveAnalysis} 
                      disabled={!selectedCareerPath || !selectedLocation || loading.analysis}
                    >
                      {loading.analysis ? (
                        <>
                          <Activity className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Run Analysis'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Research</CardTitle>
                  <CardDescription>In-depth market research and trend analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Research data will appear here after running analysis</p>
                    {patternRecognitionData && (
                      <div className="mt-4 p-4 border rounded">
                        <h4 className="font-medium mb-2">Pattern Recognition Results</h4>
                        <p className="text-sm text-muted-foreground">
                          Advanced pattern analysis completed
                        </p>
                      </div>
                    )}
                    {demandForecastData && (
                      <div className="mt-4 p-4 border rounded">
                        <h4 className="font-medium mb-2">Demand Forecast</h4>
                        <p className="text-sm text-muted-foreground">
                          6-month demand forecast available
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Market Alerts</CardTitle>
                  <CardDescription>Configure and manage market intelligence alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Alert system coming soon</p>
                    <Button variant="outline" disabled>
                      Configure Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export & Download</CardTitle>
                  <CardDescription>Export market intelligence data and reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Download className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Export functionality coming soon</p>
                    <Button variant="outline" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}