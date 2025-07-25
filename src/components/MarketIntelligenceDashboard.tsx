import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  DollarSign, 
  Users, 
  Zap, 
  BarChart3,
  Target,
  Bell,
  Download,
  Eye,
  Brain,
  Globe,
  Activity
} from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useToast } from '@/hooks/use-toast';
import { CareerPathCombobox } from '@/components/ui/CareerPathCombobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { MarketIntelligenceExportPanel } from './MarketIntelligenceExportPanel';
import { EnhancedMarketAlertSystem } from './EnhancedMarketAlertSystem';
import { CompareMarketTrendsPanel } from './CompareMarketTrendsPanel';
import { SuggestedMarketMovesCard } from './SuggestedMarketMovesCard';
import { MarketForecastPanel } from './MarketForecastPanel';
import { RealTimeJobDataPanel } from './RealTimeJobDataPanel';
import { HistoricalTrendsVisualization } from './HistoricalTrendsVisualization';
import { PatternRecognitionPanel } from './PatternRecognitionPanel';
import { LoadingSkeleton } from './LoadingSkeleton';
import { MarketDataSeeder } from './MarketDataSeeder';
import { IntelligentWorkflowGuide } from './IntelligentWorkflowGuide';
import { IntelligenceInsightsCard } from './IntelligenceInsightsCard';

export const MarketIntelligenceDashboard = () => {
  const { toast } = useToast();
  const {
    loading,
    error,
    marketData,
    fetchMarketTrends,
    analyzeMarketTrends,
    getTopGrowingCareers,
    getSalaryInsights
  } = useMarketIntelligence();

  const [selectedCareerPath, setSelectedCareerPath] = useState<{ id: string; title: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string; emoji: string } | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [topCareers, setTopCareers] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const loadTopCareers = async () => {
    try {
      const careers = await getTopGrowingCareers();
      setTopCareers(careers);
    } catch (error) {
      console.error('❌ Failed to load top careers:', error);
    }
  };

  const handleMarketAnalysis = async () => {
    if (!selectedCareerPath || !selectedLocation) {
      toast({
        title: "Missing Information",
        description: "Please select both career path and location for analysis",
        variant: "destructive"
      });
      return;
    }

    const result = await analyzeMarketTrends(selectedCareerPath.id, selectedLocation.id);
    if (result) {
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: `Market analysis for ${selectedCareerPath.title} in ${selectedLocation.label} is ready`
      });
    }
  };

  const handleSalaryAnalysis = async () => {
    if (!selectedCareerPath) {
      toast({
        title: "Missing Information",
        description: "Please select a career path for salary analysis",
        variant: "destructive"
      });
      return;
    }

    const result = await getSalaryInsights(selectedCareerPath.title);
    if (result) {
      setSalaryData(result);
      toast({
        title: "Salary Analysis Complete",
        description: `Salary insights for ${selectedCareerPath.title} are ready`
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-amber-500" />;
    }
  };

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    }
  };

  const handleTabNavigation = (tab: string) => {
    setActiveTab(tab);
  };

  // Overview Dashboard Component
  const OverviewDashboard = () => {
    if (loading && marketData.length === 0) {
      return <LoadingSkeleton variant="dashboard" />;
    }

    return (
      <div className="space-y-6">
        {/* Intelligent Workflow & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <IntelligentWorkflowGuide
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              analysis={analysis}
              onNavigateToTab={handleTabNavigation}
              onAnalysisRequest={handleMarketAnalysis}
            />
          </div>
          <div>
            <IntelligenceInsightsCard
              selectedCareerPath={selectedCareerPath}
              selectedLocation={selectedLocation}
              analysis={analysis}
              marketData={marketData}
              onNavigateToTab={handleTabNavigation}
            />
          </div>
        </div>

        {/* Data Seeder (only show if no data) */}
        {marketData.length === 0 && (
          <MarketDataSeeder />
        )}
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Markets</p>
                <p className="text-2xl font-bold">{marketData.length}</p>
              </div>
              <Globe className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Growth Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {marketData.length > 0 ? (marketData.reduce((acc, curr) => acc + curr.growth_rate, 0) / marketData.length).toFixed(1) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Salary</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${marketData.length > 0 ? Math.round(marketData.reduce((acc, curr) => acc + curr.average_salary, 0) / marketData.length).toLocaleString() : 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold text-purple-600">
                  {marketData.reduce((acc, curr) => acc + curr.job_postings_count, 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personalized Recommendations */}
      <SuggestedMarketMovesCard />

        {/* Market Trends Overview */}
        {marketData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Overview
              </CardTitle>
              <CardDescription>
                Quick insights from your market intelligence data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {marketData.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Markets Tracked</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">
                    +{(marketData.reduce((acc, curr) => acc + curr.growth_rate, 0) / marketData.length).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Growth</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {marketData.reduce((acc, curr) => acc + curr.job_postings_count, 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${Math.round(marketData.reduce((acc, curr) => acc + curr.average_salary, 0) / marketData.length / 1000)}k
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Growing Careers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Opportunities
            </CardTitle>
            <CardDescription>
              Highest growth potential careers in your selected markets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton variant="table" count={5} />
            ) : (
              <div className="grid gap-4">
                {topCareers.slice(0, 5).map((career, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{career.career_path}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          {career.growth_rate}% growth
                        </span>
                         <span className="flex items-center gap-1">
                           <DollarSign className="h-3 w-3 text-blue-500" />
                           ${career.average_salary?.toLocaleString() || 'N/A'}
                         </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {career.demand_score}% demand
                  </Badge>
                  <Badge className={getCompetitionColor(career.competition_level)}>
                    {career.competition_level}
                  </Badge>
                </div>
              </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Intelligence</h1>
            <p className="text-muted-foreground">
              AI-powered career market analysis and insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCareerPath && selectedLocation && (
              <Badge variant="outline" className="px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                {selectedCareerPath.title} in {selectedLocation.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Global Controls */}
        <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CareerPathCombobox
                value={selectedCareerPath}
                onChange={setSelectedCareerPath}
                placeholder="Select career path..."
              />
              <LocationCombobox
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Select location..."
              />
              <Button 
                onClick={handleMarketAnalysis} 
                disabled={loading || !selectedCareerPath || !selectedLocation}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts & Export
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewDashboard />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {loading && !analysis ? (
            <LoadingSkeleton variant="dashboard" />
          ) : (
            <div className="grid gap-6">
            {/* Market Analysis Results */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Market Analysis Results
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights for {selectedCareerPath?.title} in {selectedLocation?.label}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Demand Trend</p>
                            <p className="text-xl font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                              {getTrendIcon(analysis.marketTrends.aiInsights.demandTrend)}
                              {analysis.marketTrends.aiInsights.demandTrend}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-600">
                              {analysis.marketTrends.demandScore}%
                            </div>
                            <Progress value={analysis.marketTrends.demandScore} className="w-16 mt-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Salary Trend</p>
                            <p className="text-xl font-bold flex items-center gap-2 text-blue-800 dark:text-blue-200">
                              {getTrendIcon(analysis.marketTrends.aiInsights.salaryTrend)}
                              {analysis.marketTrends.aiInsights.salaryTrend}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {analysis.marketTrends.aiInsights.growthRate}%
                            </div>
                            <Progress value={Math.abs(analysis.marketTrends.aiInsights.growthRate)} className="w-16 mt-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Market Saturation</p>
                            <p className="text-xl font-bold text-purple-800 dark:text-purple-200">
                              {analysis.marketTrends.aiInsights.marketSaturation}
                            </p>
                          </div>
                          <Badge className={getCompetitionColor(analysis.marketTrends.competitionLevel)}>
                            {analysis.marketTrends.competitionLevel}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Market Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="font-medium mb-3 text-emerald-700 dark:text-emerald-300">Market Drivers</p>
                          <div className="space-y-2">
                            {analysis.marketTrends.aiInsights.keyDrivers.map((driver: string, index: number) => (
                              <Badge key={index} variant="outline" className="mr-2 mb-2">
                                {driver}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium mb-3 text-red-700 dark:text-red-300">Risk Factors</p>
                          <div className="space-y-2">
                            {analysis.marketTrends.aiInsights.riskFactors.map((risk: string, index: number) => (
                              <Badge key={index} variant="destructive" className="mr-2 mb-2">
                                {risk}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <p className="font-medium mb-2">Strategic Recommendation</p>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {analysis.marketTrends.aiInsights.recommendation}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm font-medium">Confidence Score:</span>
                          <Badge variant="secondary">
                            {analysis.marketTrends.aiInsights.confidence}%
                          </Badge>
                          <Progress value={analysis.marketTrends.aiInsights.confidence} className="w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}

            {/* Historical Trends */}
            <HistoricalTrendsVisualization />

            {/* Pattern Recognition */}
            {selectedCareerPath && selectedLocation && (
              <PatternRecognitionPanel 
                careerPath={selectedCareerPath.title} 
                location={selectedLocation.value} 
              />
            )}

            {/* Advanced Analytics */}
            <div className="grid gap-6">
              <MarketForecastPanel 
                careerPath={selectedCareerPath?.title} 
                location={selectedLocation?.value} 
              />
              <RealTimeJobDataPanel 
                careerPath={selectedCareerPath?.title} 
                location={selectedLocation?.value} 
              />
            </div>
          </div>
          )}
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="space-y-6">
          {loading && !salaryData ? (
            <LoadingSkeleton variant="dashboard" />
          ) : (
            <div className="grid gap-6">
            {/* Salary Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary Intelligence
                </CardTitle>
                <CardDescription>
                  Comprehensive salary analysis and market positioning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={handleSalaryAnalysis} disabled={loading || !selectedCareerPath}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Salaries
                  </Button>
                </div>

                {salaryData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Average Salary</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            ${salaryData.averageSalary.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Median Salary</p>
                          <p className="text-2xl font-bold text-blue-600">
                            ${salaryData.medianSalary.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Sample Size</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {salaryData.sampleSize}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {salaryData.topPayingLocation && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Top Paying Market</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">{salaryData.topPayingLocation.location}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">
                                ${salaryData.topPayingLocation.average_salary.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {salaryData.topPayingLocation.growth_rate}% growth
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compare Trends */}
            <CompareMarketTrendsPanel />
          </div>
          )}
        </TabsContent>

        {/* Alerts & Export Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6">
            <EnhancedMarketAlertSystem />
            <MarketIntelligenceExportPanel
              selectedCareerPath={selectedCareerPath?.title}
              selectedLocation={selectedLocation?.value}
              marketData={marketData}
              analysisData={analysis}
              isLoading={loading}
              onRefreshData={fetchMarketTrends}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-destructive font-medium">Error: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};