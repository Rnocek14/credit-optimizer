import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, MapPin, DollarSign, Users, Zap } from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useToast } from '@/hooks/use-toast';
import { CareerPathCombobox } from '@/components/ui/CareerPathCombobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';

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

  useEffect(() => {
    fetchMarketTrends();
    loadTopCareers();
  }, [fetchMarketTrends]);

  const loadTopCareers = async () => {
    const careers = await getTopGrowingCareers();
    setTopCareers(careers);
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

    const result = await analyzeMarketTrends(selectedCareerPath.title, selectedLocation.value);
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
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Zap className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Market Intelligence Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time market analysis and career insights powered by AI
        </p>
      </div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trending Careers</TabsTrigger>
          <TabsTrigger value="salary">Salary Insights</TabsTrigger>
          <TabsTrigger value="data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Market Analysis
              </CardTitle>
              <CardDescription>
                Get comprehensive market analysis for any career and location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <Button 
                onClick={handleMarketAnalysis} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Analyzing...' : 'Analyze Market'}
              </Button>

              {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Demand Trend</p>
                          <p className="font-semibold flex items-center gap-2">
                            {getTrendIcon(analysis.marketTrends.aiInsights.demandTrend)}
                            {analysis.marketTrends.aiInsights.demandTrend}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {analysis.marketTrends.demandScore}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Salary Trend</p>
                          <p className="font-semibold flex items-center gap-2">
                            {getTrendIcon(analysis.marketTrends.aiInsights.salaryTrend)}
                            {analysis.marketTrends.aiInsights.salaryTrend}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {analysis.marketTrends.aiInsights.growthRate}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Competition</p>
                          <p className="font-semibold">{analysis.marketTrends.competitionLevel}</p>
                        </div>
                        <Badge className={getCompetitionColor(analysis.marketTrends.competitionLevel)}>
                          {analysis.marketTrends.aiInsights.marketSaturation}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {analysis?.marketTrends.aiInsights && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-medium mb-2">Key Market Drivers:</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.marketTrends.aiInsights.keyDrivers.map((driver: string, index: number) => (
                            <Badge key={index} variant="outline">{driver}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium mb-2">Risk Factors:</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.marketTrends.aiInsights.riskFactors.map((risk: string, index: number) => (
                            <Badge key={index} variant="destructive">{risk}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-2">Recommendation:</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.marketTrends.aiInsights.recommendation}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Confidence:</span>
                        <Badge variant="secondary">
                          {analysis.marketTrends.aiInsights.confidence}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Growing Careers
              </CardTitle>
              <CardDescription>
                Careers with the highest growth rates and demand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCareers.map((career, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{career.career_path}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {career.growth_rate}% growth
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${career.average_salary?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Demand: {career.demand_score}%
                      </Badge>
                      <Badge className={getCompetitionColor(career.competition_level)}>
                        {career.competition_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Salary Intelligence
              </CardTitle>
              <CardDescription>
                Comprehensive salary analysis by location and career
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <CareerPathCombobox
                    value={selectedCareerPath}
                    onChange={setSelectedCareerPath}
                    placeholder="Select career path for salary analysis..."
                  />
                </div>
                <Button onClick={handleSalaryAnalysis} disabled={loading}>
                  Analyze Salaries
                </Button>
              </div>

              {salaryData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Average Salary</p>
                        <p className="text-2xl font-bold text-green-600">
                          ${salaryData.averageSalary.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Median Salary</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${salaryData.medianSalary.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">Data Points</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {salaryData.sampleSize}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {salaryData.topPayingLocation && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Paying Location</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{salaryData.topPayingLocation.location}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
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
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Market Data Overview
              </CardTitle>
              <CardDescription>
                Raw market trend data from our database ({marketData.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketData.slice(0, 10).map((trend) => (
                  <div key={trend.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{trend.career_path}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trend.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ${trend.average_salary.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {trend.growth_rate}% growth
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">{trend.job_postings_count} jobs</Badge>
                      <Badge variant="secondary">Demand: {trend.demand_score}%</Badge>
                      <Badge className={getCompetitionColor(trend.competition_level)}>
                        {trend.competition_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 font-medium">Error: {error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};