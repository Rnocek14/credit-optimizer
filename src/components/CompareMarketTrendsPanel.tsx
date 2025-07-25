import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Users, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useEnhancedMarketIntelligence } from '@/hooks/useEnhancedMarketIntelligence';
import { useToast } from '@/hooks/use-toast';
import { CareerPathCombobox } from '@/components/ui/CareerPathCombobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';

interface ComparisonData {
  careerPath: string;
  data: any;
}

export const CompareMarketTrendsPanel = () => {
  const { toast } = useToast();
  const { compareMarketTrends, loading } = useEnhancedMarketIntelligence();
  
  const [selectedCareerPaths, setSelectedCareerPaths] = useState<{ id: string; title: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string; emoji: string } | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonData[]>([]);

  const handleAddCareerPath = (careerPath: { id: string; title: string }) => {
    if (selectedCareerPaths.length >= 3) {
      toast({
        title: "Maximum Limit Reached",
        description: "You can compare up to 3 career paths at once",
        variant: "destructive"
      });
      return;
    }

    if (selectedCareerPaths.some(cp => cp.id === careerPath.id)) {
      toast({
        title: "Already Selected",
        description: "This career path is already in your comparison",
        variant: "destructive"
      });
      return;
    }

    setSelectedCareerPaths(prev => [...prev, careerPath]);
  };

  const handleRemoveCareerPath = (careerPathId: string) => {
    setSelectedCareerPaths(prev => prev.filter(cp => cp.id !== careerPathId));
  };

  const handleCompareMarkets = async () => {
    if (selectedCareerPaths.length < 2) {
      toast({
        title: "Insufficient Selection",
        description: "Please select at least 2 career paths to compare",
        variant: "destructive"
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location for the comparison",
        variant: "destructive"
      });
      return;
    }

    const careerTitles = selectedCareerPaths.map(cp => cp.title);
    const results = await compareMarketTrends(careerTitles, selectedLocation.value);
    
    if (results && results.length > 0) {
      setComparisonResults(results);
      toast({
        title: "Comparison Complete",
        description: `Successfully compared ${results.length} career paths in ${selectedLocation.label}`
      });
    } else {
      toast({
        title: "No Data Found",
        description: "No market data available for the selected career paths and location",
        variant: "destructive"
      });
    }
  };

  const getTrendIndicator = (value: number, isPositive: boolean = true) => {
    if (value === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
    if ((value > 0 && isPositive) || (value < 0 && !isPositive)) {
      return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    }
    return <ArrowDownRight className="w-4 h-4 text-red-600" />;
  };

  const getCompetitionColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const findBestPerformer = (field: string) => {
    if (comparisonResults.length === 0) return null;
    
    let best = comparisonResults[0];
    let bestValue = best.data?.[field] || 0;

    comparisonResults.forEach(result => {
      const value = result.data?.[field] || 0;
      if (value > bestValue) {
        best = result;
        bestValue = value;
      }
    });

    return best.careerPath;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Compare Market Trends
          </CardTitle>
          <CardDescription>
            Compare market performance across multiple career paths in a specific location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Career Paths (Select 2-3)</label>
              <CareerPathCombobox
                value={null}
                onChange={handleAddCareerPath}
                placeholder="Add career path to compare..."
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedCareerPaths.map((cp) => (
                  <Badge
                    key={cp.id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveCareerPath(cp.id)}
                  >
                    {cp.title} ✕
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <LocationCombobox
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Select location..."
              />
            </div>
          </div>

          <Button 
            onClick={handleCompareMarkets} 
            disabled={loading || selectedCareerPaths.length < 2 || !selectedLocation}
            className="w-full"
          >
            {loading ? 'Comparing...' : 'Compare Market Trends'}
          </Button>
        </CardContent>
      </Card>

      {comparisonResults.length > 0 && (
        <div className="space-y-6">
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>
                Best performers across key metrics in {selectedLocation?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Highest Average Salary</span>
                  </div>
                  <p className="font-semibold text-green-600">
                    {findBestPerformer('average_salary') || 'N/A'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Highest Growth Rate</span>
                  </div>
                  <p className="font-semibold text-blue-600">
                    {findBestPerformer('growth_rate') || 'N/A'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">Highest Demand Score</span>
                  </div>
                  <p className="font-semibold text-purple-600">
                    {findBestPerformer('demand_score') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonResults.map((result, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{result.careerPath}</CardTitle>
                  {result.careerPath === findBestPerformer('average_salary') && (
                    <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                      💰 Top Salary
                    </Badge>
                  )}
                  {result.careerPath === findBestPerformer('growth_rate') && (
                    <Badge className="absolute top-8 right-2 bg-blue-600 text-white">
                      📈 Top Growth
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.data ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Average Salary</span>
                          <div className="flex items-center gap-1">
                            {getTrendIndicator(result.data.average_salary)}
                            <span className="font-medium">
                              ${result.data.average_salary?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Job Postings</span>
                          <div className="flex items-center gap-1">
                            {getTrendIndicator(result.data.job_postings_count)}
                            <span className="font-medium">
                              {result.data.job_postings_count?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Growth Rate</span>
                          <div className="flex items-center gap-1">
                            {getTrendIndicator(result.data.growth_rate)}
                            <span className="font-medium">
                              {result.data.growth_rate || 'N/A'}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Demand Score</span>
                          <div className="flex items-center gap-1">
                            {getTrendIndicator(result.data.demand_score)}
                            <span className="font-medium">
                              {result.data.demand_score || 'N/A'}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Competition</span>
                          <Badge className={getCompetitionColor(result.data.competition_level)}>
                            {result.data.competition_level || 'N/A'}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(result.data.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No data available</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Market data for this career path in {selectedLocation?.label} is not available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};