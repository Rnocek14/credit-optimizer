import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import RealTimeMarketPulse from "@/components/RealTimeMarketPulse";
import { PredictiveAnalyticsPanel } from "@/components/PredictiveAnalyticsPanel";
import { LayoutControls } from "@/components/LayoutControls";
import { useToast } from "@/hooks/use-toast";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { LocationROIExplorer } from "@/components/LocationROIExplorer";
import { CareerROIPanel } from "@/components/CareerROIPanel";
import { SuggestedMarketMovesCard } from "@/components/SuggestedMarketMovesCard";
import { DebugPanel } from "@/components/DebugPanel";
import { getCachedStableMarketData } from "@/lib/stableMarketData";
import { supabase } from "@/integrations/supabase/client";

export function MarketIntelligenceDashboard() {
  console.log('🔍 MarketIntelligenceDashboard: Component loading...');
  // Use unified state management - ensure all hooks are called consistently
  const unifiedContext = useUnifiedCareerContext();
  const { data: progressData } = useUnifiedProgress();
  const { recommendations } = useIntelligentRecommendations();
  const { syncData } = useSmartSync();
  const { setLoading, isLoading, setError, getError } = useStandardizedState(['market', 'analysis', 'salary']);
  
  // Debug logging to track context values
  console.log('🔍 MarketIntelligenceDashboard: unifiedContext:', unifiedContext);
  console.log('🔍 MarketIntelligenceDashboard: selectedCareerPath:', unifiedContext?.selectedCareerPath);
  console.log('🔍 MarketIntelligenceDashboard: selectedLocation:', unifiedContext?.selectedLocation);
  
  // Extract values with safe defaults and auto-initialization
  const selectedCareerPath = unifiedContext?.selectedCareerPath || '';
  const selectedLocation = unifiedContext?.selectedLocation || '';
  const currentGoal = unifiedContext?.currentGoal || '';
  const setSelectedCareerPath = unifiedContext?.setSelectedCareerPath || (() => {});
  const setSelectedLocation = unifiedContext?.setSelectedLocation || (() => {});
  const setCurrentGoal = unifiedContext?.setCurrentGoal || (() => {});
  
  // Auto-initialize with default values if context is empty
  React.useEffect(() => {
    if (unifiedContext && !selectedCareerPath && !selectedLocation) {
      console.log('🔍 Auto-initializing default selections...');
      setSelectedCareerPath('software-engineer');
      setSelectedLocation('united-states');
    }
  }, [unifiedContext, selectedCareerPath, selectedLocation, setSelectedCareerPath, setSelectedLocation]);

  // Component state
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState<any>(null);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [isSmartMode, setIsSmartMode] = useState(false);

  // Utility hooks - called consistently
  const { toast } = useToast();
  const { trackInsightInteraction } = useInsightTracking();

  // Handle market analysis with unified state - memoized
  const handleMarketAnalysis = useCallback(async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Selection Required",
        description: "Please select both a career path and location to analyze market trends.",
        variant: "destructive",
      });
      return;
    }

    setLoading('analysis', true);
    setActiveTab('analysis'); // Navigate to analysis tab immediately
    
    try {
      console.log('🚀 Fetching real market analysis data for:', selectedCareerPath, 'in', selectedLocation);
      
      // Fetch real data from Supabase
      const { data: marketData, error } = await supabase
        .from('market_trends')
        .select('*')
        .or(`career_path.ilike.%${selectedCareerPath}%,career_path.ilike.%${selectedCareerPath.replace(/\s+/g, '%')}%`)
        .or(`location.ilike.%${selectedLocation}%,location.ilike.%${selectedLocation.replace(/\s+/g, '%')}%`)
        .limit(5);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch market data');
      }

      console.log('📊 Market data fetched:', marketData);

      let analysisResult;
      if (marketData && marketData.length > 0) {
        // Use real data
        const avgGrowth = marketData.reduce((sum, item) => sum + (item.growth_rate || 0), 0) / marketData.length;
        const avgDemand = marketData.reduce((sum, item) => sum + (item.demand_score || 0), 0) / marketData.length;
        const avgSalary = marketData.reduce((sum, item) => sum + (item.average_salary || 0), 0) / marketData.length;
        
        analysisResult = {
          growth_rate: Math.round(avgGrowth * 10) / 10,
          demand_score: Math.round(avgDemand),
          competition_level: avgDemand > 80 ? 'high' : avgDemand > 50 ? 'medium' : 'low',
          salary_range: avgSalary > 0 ? `$${Math.round(avgSalary * 0.8).toLocaleString()} - $${Math.round(avgSalary * 1.2).toLocaleString()}` : '$65,000 - $95,000',
          market_insights: `Based on ${marketData.length} data points: ${avgGrowth > 10 ? 'Strong growth momentum' : avgGrowth > 5 ? 'Steady growth pattern' : 'Stable market conditions'} with ${avgDemand > 80 ? 'high' : avgDemand > 50 ? 'moderate' : 'low'} demand levels.`,
          dataSource: 'real',
          dataPoints: marketData.length
        };
      } else {
        // Fallback to mock data with indicator
        analysisResult = {
          growth_rate: 8.5,
          demand_score: 92,
          competition_level: 'medium',
          salary_range: '$65,000 - $95,000',
          market_insights: 'Mock data: High demand in tech hubs, moderate competition. (Real data not available for this combination)',
          dataSource: 'mock',
          dataPoints: 0
        };
      }
      
      setAnalysis(analysisResult);
      
      toast({
        title: "Analysis Complete",
        description: `Market analysis for ${selectedCareerPath} in ${selectedLocation} is ready. Found ${analysisResult.dataPoints} relevant data points.`,
      });
    } catch (error) {
      console.error('Market analysis error:', error);
      setError('analysis', 'Failed to analyze market trends');
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing market trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading('analysis', false);
    }
  }, [selectedCareerPath, selectedLocation, setLoading, setError, setActiveTab, toast]);

  // Handle salary analysis - memoized
  const handleSalaryAnalysis = useCallback(async () => {
    if (!selectedCareerPath) {
      toast({
        title: "Career Path Required",
        description: "Please select a career path to analyze salary data.",
        variant: "destructive",
      });
      return;
    }

    setLoading('salary', true);
    setActiveTab('analysis'); // Navigate to analysis tab immediately
    
    try {
      console.log('💰 Fetching real salary data for:', selectedCareerPath);
      
      // Fetch real salary data from Supabase
      const { data: salaryData, error } = await supabase
        .from('market_trends')
        .select('average_salary, location, growth_rate')
        .or(`career_path.ilike.%${selectedCareerPath}%,career_path.ilike.%${selectedCareerPath.replace(/\s+/g, '%')}%`)
        .not('average_salary', 'is', null)
        .order('average_salary', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch salary data');
      }

      console.log('💰 Salary data fetched:', salaryData);

      let salaryResult;
      if (salaryData && salaryData.length > 0) {
        // Calculate real salary insights
        const salaries = salaryData.map(item => item.average_salary).filter(Boolean);
        const locations = salaryData.map(item => item.location).filter(Boolean);
        const growthRates = salaryData.map(item => item.growth_rate).filter(Boolean);
        
        const avgSalary = salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length;
        const medianSalary = salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)];
        const topSalaryLocation = locations[0]; // First location (highest salary due to ordering)
        const avgGrowth = growthRates.length > 0 ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 5.2;
        
        salaryResult = {
          average_salary: Math.round(avgSalary),
          median_salary: Math.round(medianSalary || avgSalary * 0.95),
          top_location: topSalaryLocation || 'San Francisco, CA',
          salary_growth: Math.round(avgGrowth * 10) / 10,
          dataSource: 'real',
          dataPoints: salaryData.length
        };
      } else {
        // Fallback to mock data
        salaryResult = {
          average_salary: 75000,
          median_salary: 72000,
          top_location: 'San Francisco, CA',
          salary_growth: 5.2,
          dataSource: 'mock',
          dataPoints: 0
        };
      }
      
      setSalaryInsights(salaryResult);
      
      toast({
        title: "Salary Analysis Complete",
        description: `Salary insights for ${selectedCareerPath} are ready. Analyzed ${salaryResult.dataPoints} salary data points.`,
      });
    } catch (error) {
      console.error('Salary analysis error:', error);
      setError('salary', 'Failed to analyze salary data');
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing salary data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading('salary', false);
    }
  }, [selectedCareerPath, setLoading, setError, setActiveTab, toast]);
  
  // Enhanced action handler that actually executes actions
  const handleUnifiedAction = useCallback(async (actionData: any) => {
    console.log('🎯 Unified action handler:', actionData);
    
    if (!actionData || !actionData.type) {
      console.warn('Invalid action data:', actionData);
      return;
    }

    try {
      // Handle different action types
      switch (actionData.type) {
        case 'Analyze This Market':
          // Auto-populate selection if provided in action data
          if (actionData.careerPath && actionData.careerPath !== selectedCareerPath) {
            setSelectedCareerPath(actionData.careerPath);
          }
          if (actionData.location && actionData.location !== selectedLocation) {
            setSelectedLocation(actionData.location);
          }
          
          toast({
            title: "Starting market analysis...",
            description: `Analyzing ${actionData.careerPath || selectedCareerPath} in ${actionData.location || selectedLocation}`,
          });
          
          // Wait for state to update, then run analysis
          setTimeout(async () => {
            await handleMarketAnalysis();
          }, 200);
          break;
          
        case 'View Salary Analysis':
          // Auto-populate career path if provided
          if (actionData.careerPath && actionData.careerPath !== selectedCareerPath) {
            setSelectedCareerPath(actionData.careerPath);
          }
          
          toast({
            title: "Loading salary analysis...",
            description: `Analyzing salary trends for ${actionData.careerPath || selectedCareerPath}`,
          });
          
          // Wait for state to update, then run analysis
          setTimeout(async () => {
            await handleSalaryAnalysis();
          }, 200);
          break;
          
        case 'Generate Strategy':
          toast({
            title: "Generating strategy...",
            description: "Creating personalized market strategy based on current data",
          });
          // Set active tab to analysis to show results
          setActiveTab('analysis');
          break;
          
        case 'Run Analysis':
          await handleMarketAnalysis();
          setActiveTab('analysis');
          break;
          
        case 'Explore Opportunities':
          setActiveTab('research');
          break;
          
        case 'View Forecast':
          setActiveTab('analysis');
          break;
          
        default:
          console.log('Unhandled action type:', actionData.type);
          toast({
            title: "Action triggered",
            description: `Executing ${actionData.type}...`,
          });
      }
    } catch (error) {
      console.error('Error handling unified action:', error);
      toast({
        title: "Action failed",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    }
  }, [selectedCareerPath, selectedLocation, handleMarketAnalysis, handleSalaryAnalysis, setActiveTab, setSelectedCareerPath, setSelectedLocation, toast]);

  // Initialize and sync data
  useEffect(() => {
    loadTopCareers();
    // Sync data when context changes
    if (selectedCareerPath || selectedLocation) {
      syncData();
    }
  }, [selectedCareerPath, selectedLocation, syncData]);

  // Real market data from database - cached and optimized
  const stableMarketData = useMemo(() => {
    console.log('🔄 Loading real market data for:', selectedCareerPath, selectedLocation);
    return getCachedStableMarketData(
      selectedCareerPath,
      selectedLocation
    );
  }, [selectedCareerPath, selectedLocation]);

  // Load top careers data from database - memoized to prevent unnecessary calls
  const loadTopCareers = useCallback(async () => {
    setLoading('market', true);
    try {
      console.log('📈 Fetching top growing careers from database');
      
      // Fetch real top growing careers
      const { data: topCareersData, error } = await supabase
        .from('market_trends')
        .select('career_path, growth_rate, demand_score')
        .not('growth_rate', 'is', null)
        .not('demand_score', 'is', null)
        .order('growth_rate', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Database error fetching top careers:', error);
        throw error;
      }

      console.log('📈 Top careers data fetched:', topCareersData);

      if (topCareersData && topCareersData.length > 0) {
        // Use real data and aggregate by career path
        const careerMap = new Map();
        topCareersData.forEach(item => {
          const career = item.career_path;
          if (!careerMap.has(career)) {
            careerMap.set(career, {
              title: career,
              growth_rate: item.growth_rate,
              demand_score: item.demand_score,
              count: 1
            });
          } else {
            const existing = careerMap.get(career);
            existing.growth_rate = (existing.growth_rate + item.growth_rate) / 2;
            existing.demand_score = (existing.demand_score + item.demand_score) / 2;
            existing.count++;
          }
        });
        
        const realCareers = Array.from(careerMap.values())
          .sort((a, b) => b.growth_rate - a.growth_rate)
          .slice(0, 5);
        
        setTopCareers(realCareers);
      } else {
        // Fallback to mock data if no real data available
        const mockCareers = [
          { title: 'Data Analyst', growth_rate: 8.5, demand_score: 92 },
          { title: 'Software Engineer', growth_rate: 12.3, demand_score: 96 },
          { title: 'Product Manager', growth_rate: 6.7, demand_score: 88 },
        ];
        setTopCareers(mockCareers);
      }
    } catch (error) {
      console.error('Error loading career data:', error);
      setError('market', 'Failed to load career data');
      
      // Fallback to mock data on error
      const mockCareers = [
        { title: 'Data Analyst', growth_rate: 8.5, demand_score: 92 },
        { title: 'Software Engineer', growth_rate: 12.3, demand_score: 96 },
        { title: 'Product Manager', growth_rate: 6.7, demand_score: 88 },
      ];
      setTopCareers(mockCareers);
    } finally {
      setLoading('market', false);
    }
  }, [setLoading, setError]);


  // Handle insight actions - FIXED to properly route actions
  const handleInsightAction = useCallback(async (actionData: any) => {
    console.log('🎯 handleInsightAction received:', actionData);
    
    // Handle direct string actions (legacy support)
    if (typeof actionData === 'string') {
      const legacyAction = { type: actionData };
      console.log('🔄 Converting string action to object:', legacyAction);
      await handleUnifiedAction(legacyAction);
      return;
    }
    
    // Handle object actions
    if (actionData && typeof actionData === 'object') {
      console.log('✅ Processing object action:', actionData);
      await handleUnifiedAction(actionData);
      return;
    }
    
    console.warn('⚠️ Unknown action format:', actionData);
  }, [handleUnifiedAction]);

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
                onChange={(careerPath) => {
                  console.log('🎯 Career path selected:', careerPath);
                  setSelectedCareerPath(careerPath?.title || null);
                }}
                placeholder="Select career path..."
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <LocationCombobox
                value={selectedLocation ? { id: selectedLocation, label: selectedLocation, value: selectedLocation, emoji: "🌍" } : null}
                onChange={(location) => {
                  console.log('🎯 Location selected:', location);
                  setSelectedLocation(location?.label || null);
                }}
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
            {/* Smart Selection Panel */}
            {recommendations.length > 0 && (
              <SmartSelectionPanel
                suggestions={recommendations.map(rec => ({
                  careerPath: { id: rec.id || 'default', title: rec.message },
                  location: { id: 'default', label: selectedLocation || 'Global', value: selectedLocation || 'global', emoji: '🌍' },
                  reason: rec.type,
                  priority: 1
                }))}
                onSuggestionSelect={(careerPath, location) => {
                  setSelectedCareerPath(careerPath.title);
                  setSelectedLocation(location.label);
                }}
                onQuickAnalyze={(careerPath, location) => {
                  setSelectedCareerPath(careerPath.title);
                  setSelectedLocation(location.label);
                  setTimeout(() => handleMarketAnalysis(), 200);
                }}
                isVisible={true}
              />
            )}

            {/* Intelligence Insights Card */}
            <IntelligenceInsightsCard
              selectedCareerPath={selectedCareerPath ? { id: selectedCareerPath, title: selectedCareerPath } : null}
              selectedLocation={selectedLocation ? { id: selectedLocation, label: selectedLocation, value: selectedLocation, emoji: "🌍" } : null}
              analysis={analysis}
              marketData={stableMarketData}
              onNavigateToTab={setActiveTab}
            />
            {/* Top Intelligence Panel */}
            <TopMarketInsights
              marketData={stableMarketData}
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              onActionClick={handleInsightAction}
            />

            {/* Core Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              <OpportunityScoreWidget
                marketData={stableMarketData}
                selectedCareerPath={selectedCareerPath}
                selectedLocation={selectedLocation}
              />

              <RealTimeMarketPulse />

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

              {/* Quick Actions with Job Lookups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      console.log('🔍 Quick Job Search clicked');
                      setActiveTab('research');
                      toast({
                        title: "Opening Job Search",
                        description: "Loading job market research tools...",
                      });
                    }}
                  >
                    <Users className="w-3 h-3 mr-2" />
                    Quick Job Lookup
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={async () => {
                      console.log('📊 Run Analysis clicked');
                      await handleMarketAnalysis();
                      setActiveTab('analysis');
                    }}
                    disabled={!selectedCareerPath || !selectedLocation}
                  >
                    <BarChart3 className="w-3 h-3 mr-2" />
                    Run Analysis
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={async () => {
                      console.log('💰 Salary Insights clicked');
                      await handleSalaryAnalysis();
                      setActiveTab('analysis');
                    }}
                    disabled={!selectedCareerPath}
                  >
                    <DollarSign className="w-3 h-3 mr-2" />
                    Salary Insights
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      console.log('🎯 Market Research clicked');
                      setActiveTab('research');
                    }}
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
                marketData={stableMarketData}
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
            {/* Analysis Results */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Market Analysis Results
                    {analysis.dataSource && (
                      <Badge variant={analysis.dataSource === 'real' ? 'default' : 'secondary'} className="text-xs">
                        {analysis.dataSource === 'real' ? `${analysis.dataPoints} data points` : 'Mock data'}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Analysis for {selectedCareerPath} in {selectedLocation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{analysis.growth_rate}%</div>
                      <div className="text-sm text-muted-foreground">Growth Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{analysis.demand_score}/100</div>
                      <div className="text-sm text-muted-foreground">Demand Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 capitalize">{analysis.competition_level}</div>
                      <div className="text-sm text-muted-foreground">Competition</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">{analysis.salary_range}</div>
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

            {/* Salary Insights */}
            {salaryInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Salary Analysis Results
                    {salaryInsights.dataSource && (
                      <Badge variant={salaryInsights.dataSource === 'real' ? 'default' : 'secondary'} className="text-xs">
                        {salaryInsights.dataSource === 'real' ? `${salaryInsights.dataPoints} data points` : 'Mock data'}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">${salaryInsights.average_salary.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Average Salary</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">${salaryInsights.median_salary.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Median Salary</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{salaryInsights.top_location}</div>
                      <div className="text-sm text-muted-foreground">Top Location</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">+{salaryInsights.salary_growth}%</div>
                      <div className="text-sm text-muted-foreground">Growth Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Advanced Analytics</h3>
                <SalaryInsightsExplorer />
              </Card>
              
              <div className="lg:col-span-1">
                <PredictiveAnalyticsPanel />
              </div>
            </div>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-6">
            {/* Quick Job Lookup Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Quick Job Lookup
                </CardTitle>
                <CardDescription>
                  Find relevant job opportunities for your selected career path and location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCareerPath && selectedLocation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          window.open(`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(selectedCareerPath)}&location=${encodeURIComponent(selectedLocation)}`, '_blank');
                          toast({
                            title: "Opening LinkedIn Jobs",
                            description: `Searching for ${selectedCareerPath} positions in ${selectedLocation}`,
                          });
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Search LinkedIn
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          window.open(`https://www.indeed.com/jobs?q=${encodeURIComponent(selectedCareerPath)}&l=${encodeURIComponent(selectedLocation)}`, '_blank');
                          toast({
                            title: "Opening Indeed",
                            description: `Searching for ${selectedCareerPath} positions in ${selectedLocation}`,
                          });
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Search Indeed
                      </Button>
                    </div>
                    
                    <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-l-blue-500">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-sm mb-1">Smart Search Tips</div>
                          <p className="text-sm text-muted-foreground">
                            Based on your selection ({selectedCareerPath} in {selectedLocation}), 
                            try searching for related keywords like "data analysis", "software development", 
                            or "product strategy" to expand your opportunities.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Select a career path and location above to enable job search functionality
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Research Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Research Tools</CardTitle>
                <CardDescription>
                  Market forecasting and trend analysis tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => setActiveTab('analysis')}
                  >
                    <BarChart3 className="w-6 h-6 mb-2 text-primary" />
                    <div className="font-medium">Market Trends</div>
                    <div className="text-xs text-muted-foreground">Analyze historical and predicted trends</div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-auto p-4 flex flex-col items-start text-left"
                    onClick={() => {
                      toast({
                        title: "Feature Coming Soon",
                        description: "Salary benchmarking tools will be available in the next update",
                      });
                    }}
                  >
                    <DollarSign className="w-6 h-6 mb-2 text-green-600" />
                    <div className="font-medium">Salary Benchmarks</div>
                    <div className="text-xs text-muted-foreground">Compare compensation across markets</div>
                  </Button>
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