import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, DollarSign, Users, AlertTriangle, Brain, Zap, Activity, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { CareerPathCombobox } from "@/components/ui/CareerPathCombobox";
import { LocationCombobox } from "@/components/ui/LocationCombobox";
import { useUnifiedCareerContext } from "@/contexts/UnifiedDataContext";
import { useUnifiedProgress } from "@/contexts/UnifiedDataContext";
import { useIntelligentRecommendations } from "@/hooks/useUnifiedState";
import { useSmartSync } from "@/hooks/useUnifiedState";
import { useStandardizedState } from "@/hooks/useStandardizedLoading";
import { useUnifiedActionHandler } from "@/components/UnifiedActionHandler";
import { TopMarketInsights } from "@/components/TopMarketInsights";
import { SmartSelectionPanel } from "@/components/SmartSelectionPanel";
import { IntelligenceInsightsCard } from "@/components/IntelligenceInsightsCard";
import { OpportunityScoreWidget } from "@/components/OpportunityScoreWidget";
import { MarketPulseWidget } from "@/components/MarketPulseWidget";
import { IntelligentWorkflowGuide } from "@/components/IntelligentWorkflowGuide";
import { SmartSuggestionsWidget } from "@/components/SmartSuggestionsWidget";
import { HistoricalTrendsVisualization } from "@/components/HistoricalTrendsVisualization";
import { PatternRecognitionPanel } from "@/components/PatternRecognitionPanel";
import { MarketForecastPanel } from "@/components/MarketForecastPanel";
import { RealTimeJobDataPanel } from "@/components/RealTimeJobDataPanel";
import { EnhancedMarketAlertSystem } from "@/components/EnhancedMarketAlertSystem";
import { MarketIntelligenceExportPanel } from "@/components/MarketIntelligenceExportPanel";
import { SalaryInsightsExplorer } from "@/components/SalaryInsightsExplorer";
import { CompareMarketTrendsPanel } from "@/components/CompareMarketTrendsPanel";
import { LayoutControls } from "@/components/LayoutControls";
import { useToast } from "@/hooks/use-toast";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { LocationROIExplorer } from "@/components/LocationROIExplorer";
import { CareerROIPanel } from "@/components/CareerROIPanel";
import { SuggestedMarketMovesCard } from "@/components/SuggestedMarketMovesCard";
import { DebugPanel } from "@/components/DebugPanel";

export function MarketIntelligenceDashboard() {
  // Use unified state management with fallback
  const unifiedContext = useUnifiedCareerContext();
  const { selectedCareerPath, selectedLocation, currentGoal, setSelectedCareerPath, setSelectedLocation, setCurrentGoal } = unifiedContext || {
    selectedCareerPath: null,
    selectedLocation: null, 
    currentGoal: null,
    setSelectedCareerPath: () => {},
    setSelectedLocation: () => {},
    setCurrentGoal: () => {}
  };
  const { data: progressData } = useUnifiedProgress();
  const { recommendations } = useIntelligentRecommendations();
  const { syncData } = useSmartSync();
  const { setLoading, isLoading, setError, getError } = useStandardizedState(['market', 'analysis', 'salary']);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState<any>(null);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [isSmartMode, setIsSmartMode] = useState(false);

  // Legacy hooks for data fetching (to be gradually removed)
  const { toast } = useToast();
  const { trackInsightInteraction } = useInsightTracking();
  
  // Simplified action handler
  const handleUnifiedAction = (actionData: any) => {
    console.log('Unified action:', actionData);
  };

  // Initialize and sync data
  useEffect(() => {
    loadTopCareers();
    // Sync data when context changes
    if (selectedCareerPath || selectedLocation) {
      syncData();
    }
  }, [selectedCareerPath, selectedLocation, syncData]);

  // Load top careers data
  const loadTopCareers = async () => {
    setLoading('market', true);
    try {
      // Mock data for now
      const mockCareers = [
        { title: 'Data Analyst', growth_rate: 8.5, demand_score: 92 },
        { title: 'Software Engineer', growth_rate: 12.3, demand_score: 96 },
        { title: 'Product Manager', growth_rate: 6.7, demand_score: 88 },
      ];
      setTopCareers(mockCareers);
    } catch (error) {
      setError('market', 'Failed to load career data');
    } finally {
      setLoading('market', false);
    }
  };

  // Handle market analysis with unified state
  const handleMarketAnalysis = async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Selection Required",
        description: "Please select both a career path and location to analyze market trends.",
        variant: "destructive",
      });
      return;
    }

    setLoading('analysis', true);
    try {
      // Mock analysis for now
      const mockAnalysis = {
        growth_rate: 8.5,
        demand_score: 92,
        competition_level: 'medium',
        salary_range: '$65,000 - $95,000',
        market_insights: 'High demand in tech hubs, moderate competition'
      };
      setAnalysis(mockAnalysis);
      
      toast({
        title: "Analysis Complete",
        description: `Market analysis for ${selectedCareerPath} in ${selectedLocation} is ready.`,
      });
    } catch (error) {
      setError('analysis', 'Failed to analyze market trends');
    } finally {
      setLoading('analysis', false);
    }
  };

  // Handle salary analysis
  const handleSalaryAnalysis = async () => {
    if (!selectedCareerPath) {
      toast({
        title: "Career Path Required",
        description: "Please select a career path to analyze salary data.",
        variant: "destructive",
      });
      return;
    }

    setLoading('salary', true);
    try {
      // Mock salary data
      const mockSalary = {
        average_salary: 75000,
        median_salary: 72000,
        top_location: 'San Francisco, CA',
        salary_growth: 5.2
      };
      setSalaryInsights(mockSalary);
      
      toast({
        title: "Salary Analysis Complete",
        description: `Salary insights for ${selectedCareerPath} are ready.`,
      });
    } catch (error) {
      setError('salary', 'Failed to analyze salary data');
    } finally {
      setLoading('salary', false);
    }
  };

  // Handle insight actions
  const handleInsightAction = (action: string, context?: any) => {
    console.log('Insight action:', action, context);
    handleUnifiedAction({ action, context });
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'down': return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

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
                Unified State: Active
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

          {/* Context Selection */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <CareerPathCombobox
                value={selectedCareerPath ? { id: selectedCareerPath, title: selectedCareerPath } : null}
                onChange={(careerPath) => setSelectedCareerPath(careerPath?.title || null)}
                placeholder="Select career path..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <LocationCombobox
                value={selectedLocation ? { id: selectedLocation, label: selectedLocation, value: selectedLocation, emoji: "🌍" } : null}
                onChange={(location) => setSelectedLocation(location?.value || null)}
                placeholder="Select location..."
              />
            </div>
            <Button 
              onClick={handleMarketAnalysis}
              disabled={isLoading('analysis')}
              className="shrink-0"
            >
              {isLoading('analysis') ? (
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

        {/* Error Display */}
        {(getError('market') || getError('analysis') || getError('salary')) && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>{getError('market') || getError('analysis') || getError('salary')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Indicators */}
        {progressData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Unified Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{progressData.skillProgress}%</div>
                  <div className="text-sm text-muted-foreground">Skill Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{progressData.readinessScore}%</div>
                  <div className="text-sm text-muted-foreground">Readiness Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{progressData.marketAlignment}%</div>
                  <div className="text-sm text-muted-foreground">Market Alignment</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{progressData.overallProgress}%</div>
                  <div className="text-sm text-muted-foreground">Overall Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Intelligent Recommendations */}
        {recommendations.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{rec.message}</div>
                      <div className="text-sm text-muted-foreground">Type: {rec.type}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInsightAction(rec.action)}
                    >
                      Take Action
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            {/* Top Intelligence Panel */}
            <TopMarketInsights
              marketData={topCareers.map(career => ({
                id: Math.random().toString(),
                career_path: career.title,
                location: selectedLocation || 'Global',
                job_postings_count: Math.floor(Math.random() * 1000) + 100,
                average_salary: Math.floor(Math.random() * 50000) + 60000,
                growth_rate: career.growth_rate,
                demand_score: career.demand_score,
                competition_level: 'medium',
                ai_insights: {}
              }))}
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              onActionClick={handleInsightAction}
            />

            {/* Core Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <OpportunityScoreWidget
                marketData={topCareers.map(career => ({
                  id: Math.random().toString(),
                  career_path: career.title,
                  location: selectedLocation || 'Global',
                  job_postings_count: Math.floor(Math.random() * 1000) + 100,
                  average_salary: Math.floor(Math.random() * 50000) + 60000,
                  growth_rate: career.growth_rate,
                  demand_score: career.demand_score,
                  competition_level: 'medium'
                }))}
                selectedCareerPath={selectedCareerPath}
                selectedLocation={selectedLocation}
              />

              <MarketPulseWidget
                marketData={topCareers.map(career => ({
                  id: Math.random().toString(),
                  career_path: career.title,
                  location: selectedLocation || 'Global',
                  job_postings_count: Math.floor(Math.random() * 1000) + 100,
                  average_salary: Math.floor(Math.random() * 50000) + 60000,
                  growth_rate: career.growth_rate,
                  demand_score: career.demand_score,
                  competition_level: 'medium',
                  ai_insights: {},
                  created_at: new Date().toISOString()
                }))}
                selectedCareerPath={selectedCareerPath}
                selectedLocation={selectedLocation}
                onActionClick={(action) => handleInsightAction(action)}
              />

              {/* Quick Market Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Market Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading('market') ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse h-6 bg-muted rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Growing Careers</span>
                        <span className="font-medium">{topCareers.filter(c => c.growth_rate > 0).length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Growth</span>
                        <span className="font-medium">
                          {(topCareers.reduce((sum, c) => sum + c.growth_rate, 0) / Math.max(topCareers.length, 1)).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">High Demand</span>
                        <span className="font-medium">{topCareers.filter(c => c.demand_score > 80).length}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Smart Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={handleMarketAnalysis}
                    disabled={!selectedCareerPath || !selectedLocation}
                  >
                    <BarChart3 className="w-3 h-3 mr-2" />
                    Run Analysis
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={handleSalaryAnalysis}
                    disabled={!selectedCareerPath}
                  >
                    <DollarSign className="w-3 h-3 mr-2" />
                    Salary Insights
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => setActiveTab('research')}
                  >
                    <Target className="w-3 h-3 mr-2" />
                    Market Research
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Intelligence Workflow and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IntelligentWorkflowGuide
                selectedCareerPath={selectedCareerPath ? { id: selectedCareerPath, title: selectedCareerPath } : null}
                selectedLocation={selectedLocation ? { id: selectedLocation, label: selectedLocation, value: selectedLocation, emoji: "🌍" } : null}
                analysis={analysis}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onAnalysisRequest={handleMarketAnalysis}
              />

              <IntelligenceInsightsCard
                selectedCareerPath={selectedCareerPath ? { id: selectedCareerPath, title: selectedCareerPath } : null}
                selectedLocation={selectedLocation ? { id: selectedLocation, label: selectedLocation, value: selectedLocation, emoji: "🌍" } : null}
                analysis={analysis}
                marketData={topCareers.map(career => ({
                  id: Math.random().toString(),
                  career_path: career.title,
                  location: selectedLocation || 'Global',
                  job_postings_count: Math.floor(Math.random() * 1000) + 100,
                  average_salary: Math.floor(Math.random() * 50000) + 60000,
                  growth_rate: career.growth_rate,
                  demand_score: career.demand_score,
                  competition_level: 'medium'
                }))}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            </div>

            {/* Market Analysis Results - Enhanced Display */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Market Analysis Results</CardTitle>
                  <CardDescription>
                    Analysis for {selectedCareerPath} in {selectedLocation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{analysis.growth_rate}%</div>
                      <div className="text-sm text-muted-foreground">Growth Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.demand_score}/100</div>
                      <div className="text-sm text-muted-foreground">Demand Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 capitalize">{analysis.competition_level}</div>
                      <div className="text-sm text-muted-foreground">Competition</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{analysis.salary_range}</div>
                      <div className="text-sm text-muted-foreground">Salary Range</div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-l-primary">
                    <div className="flex items-start gap-3">
                      <Brain className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium text-sm mb-1">AI Market Insights</div>
                        <p className="text-sm text-muted-foreground">{analysis.market_insights}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Salary Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleSalaryAnalysis}
                    disabled={isLoading('salary')}
                    className="w-full mb-4"
                  >
                    {isLoading('salary') ? 'Analyzing...' : 'Analyze Salary Data'}
                  </Button>
                  
                  {salaryInsights && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Average Salary:</span>
                        <span className="font-bold">${salaryInsights.average_salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Median Salary:</span>
                        <span className="font-bold">${salaryInsights.median_salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Top Location:</span>
                        <span className="font-bold">{salaryInsights.top_location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Growth Rate:</span>
                        <span className="font-bold text-green-600">+{salaryInsights.salary_growth}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Market Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground">
                    Advanced trend analysis coming soon...
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Research Tools</CardTitle>
                <CardDescription>
                  Advanced research and forecasting tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  Research tools will be available in the next update...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Alerts</CardTitle>
                <CardDescription>
                  Set up alerts for market changes and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  Alert system will be available in the next update...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Debug Panel for QA */}
      <DebugPanel />
    </div>
  );
}