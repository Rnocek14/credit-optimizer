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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function MarketIntelligenceDashboard() {
  console.log('🔍 MarketIntelligenceDashboard: Component loading...');
  
  // CRITICAL: Call ALL hooks at the top level - NO conditional logic before hooks
  const unifiedContext = useUnifiedCareerContext();
  const { data: progressData } = useUnifiedProgress();
  const { toast } = useToast();
  
  // All useState hooks called consistently
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState<any>(null);
  const [salaryInsights, setSalaryInsights] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [loading, setLoading] = useState({ market: false, analysis: false, salary: false });
  const [errors, setErrors] = useState({ market: null, analysis: null, salary: null });

  // Extract values with safe defaults AFTER all hooks are called
  const selectedCareerPath = unifiedContext?.selectedCareerPath || '';
  const selectedLocation = unifiedContext?.selectedLocation || '';
  const currentGoal = unifiedContext?.currentGoal || '';
  const setSelectedCareerPath = unifiedContext?.setSelectedCareerPath || (() => {});
  const setSelectedLocation = unifiedContext?.setSelectedLocation || (() => {});
  const setCurrentGoal = unifiedContext?.setCurrentGoal || (() => {});
  
  // Auto-initialize with default values if context is empty
  useEffect(() => {
    if (unifiedContext && !selectedCareerPath && !selectedLocation) {
      console.log('🔍 Auto-initializing default selections...');
      setSelectedCareerPath('software-engineer');
      setSelectedLocation('united-states');
    }
  }, [unifiedContext, selectedCareerPath, selectedLocation]);

  // Handle market analysis - memoized callback
  const handleMarketAnalysis = useCallback(async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Selection Required",
        description: "Please select both a career path and location to analyze market trends.",
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, analysis: true }));
    setActiveTab('analysis');
    
    try {
      console.log('🚀 Fetching market analysis data for:', selectedCareerPath, 'in', selectedLocation);
      
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

      let analysisResult;
      if (marketData && marketData.length > 0) {
        const avgGrowth = marketData.reduce((sum, item) => sum + (item.growth_rate || 0), 0) / marketData.length;
        const avgDemand = marketData.reduce((sum, item) => sum + (item.demand_score || 0), 0) / marketData.length;
        const avgSalary = marketData.reduce((sum, item) => sum + (item.average_salary || 0), 0) / marketData.length;
        
        analysisResult = {
          growth_rate: Math.round(avgGrowth * 10) / 10,
          demand_score: Math.round(avgDemand),
          competition_level: avgDemand > 80 ? 'high' : avgDemand > 50 ? 'medium' : 'low',
          salary_range: avgSalary > 0 ? `$${Math.round(avgSalary * 0.8).toLocaleString()} - $${Math.round(avgSalary * 1.2).toLocaleString()}` : '$65,000 - $95,000',
          market_insights: `Based on ${marketData.length} data points: ${avgGrowth > 10 ? 'Strong growth momentum' : avgGrowth > 5 ? 'Steady growth pattern' : 'Stable market conditions'}.`,
          dataSource: 'real',
          dataPoints: marketData.length
        };
      } else {
        analysisResult = {
          growth_rate: 8.5,
          demand_score: 92,
          competition_level: 'medium',
          salary_range: '$65,000 - $95,000',
          market_insights: 'Mock data: High demand in tech hubs, moderate competition.',
          dataSource: 'mock',
          dataPoints: 0
        };
      }
      
      setAnalysis(analysisResult);
      
      toast({
        title: "Analysis Complete",
        description: `Market analysis for ${selectedCareerPath} in ${selectedLocation} is ready.`,
      });
    } catch (error) {
      console.error('Market analysis error:', error);
      setErrors(prev => ({ ...prev, analysis: 'Failed to analyze market trends' }));
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing market trends. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, analysis: false }));
    }
  }, [selectedCareerPath, selectedLocation, setActiveTab, toast]);

  // Load top careers on mount
  useEffect(() => {
    const loadTopCareers = async () => {
      setLoading(prev => ({ ...prev, market: true }));
      try {
        console.log('📈 Fetching top growing careers from database');
        
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

        if (topCareersData && topCareersData.length > 0) {
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
          const mockCareers = [
            { title: 'Data Analyst', growth_rate: 8.5, demand_score: 92 },
            { title: 'Software Engineer', growth_rate: 12.3, demand_score: 96 },
            { title: 'Product Manager', growth_rate: 6.7, demand_score: 88 },
          ];
          setTopCareers(mockCareers);
        }
      } catch (error) {
        console.error('Error loading career data:', error);
        setErrors(prev => ({ ...prev, market: 'Failed to load career data' }));
        
        const mockCareers = [
          { title: 'Data Analyst', growth_rate: 8.5, demand_score: 92 },
          { title: 'Software Engineer', growth_rate: 12.3, demand_score: 96 },
          { title: 'Product Manager', growth_rate: 6.7, demand_score: 88 },
        ];
        setTopCareers(mockCareers);
      } finally {
        setLoading(prev => ({ ...prev, market: false }));
      }
    };

    loadTopCareers();
  }, []);

  // Get trend icon helper
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
                  console.log('🌍 Location selected:', location);
                  setSelectedLocation(location?.value || null);
                }}
                placeholder="Select location..."
              />
            </div>
            <Button 
              onClick={handleMarketAnalysis}
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Market Pulse</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">
                    +5% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Opportunity Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">92</div>
                  <p className="text-xs text-muted-foreground">
                    Strong market conditions
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
                {loading.market ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" />
                    Loading career data...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topCareers.map((career, index) => (
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
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Analysis Results</CardTitle>
                <CardDescription>
                  Comprehensive analysis for {selectedCareerPath || 'selected career'} in {selectedLocation || 'selected location'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading.analysis ? (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" />
                    Analyzing market trends...
                  </div>
                ) : analysis ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Growth Rate</span>
                        <Badge variant="secondary">+{analysis.growth_rate}%</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Demand Score</span>
                        <Badge variant="secondary">{analysis.demand_score}/100</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Competition</span>
                        <Badge variant={analysis.competition_level === 'high' ? 'destructive' : analysis.competition_level === 'medium' ? 'default' : 'secondary'}>
                          {analysis.competition_level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Salary Range</span>
                        <span className="text-sm font-medium">{analysis.salary_range}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Market Insights</h4>
                      <p className="text-sm text-muted-foreground">{analysis.market_insights}</p>
                      <div className="mt-4 text-xs text-muted-foreground">
                        Data source: {analysis.dataSource} | Points: {analysis.dataPoints}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No analysis data available</p>
                    <Button onClick={handleMarketAnalysis} disabled={!selectedCareerPath || !selectedLocation}>
                      Run Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Research Tab */}
          <TabsContent value="research" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Research Center</CardTitle>
                <CardDescription>In-depth market research and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Research tools coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Alerts</CardTitle>
                <CardDescription>Stay informed about important market changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active alerts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}