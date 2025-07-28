import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  BarChart3,
  ArrowUpRight,
  Users,
  Target,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';

interface SalaryAnalysisPanelProps {
  careerPath?: string;
  location?: string;
  onLocationSelect?: (location: string) => void;
}

interface SalaryData {
  careerPath: string;
  averageSalary: number;
  medianSalary: number;
  topPayingLocation: any;
  locationData: any[];
  sampleSize: number;
}

interface LocationSalaryData {
  location: string;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  job_count?: number;
}

export const SalaryAnalysisPanel: React.FC<SalaryAnalysisPanelProps> = ({
  careerPath,
  location,
  onLocationSelect
}) => {
  const { getSalaryInsights, loading } = useMarketIntelligence();
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (careerPath) {
      loadSalaryData();
    }
  }, [careerPath]);

  const loadSalaryData = async () => {
    if (!careerPath) return;

    try {
      setError(null);
      const data = await getSalaryInsights(careerPath);
      setSalaryData(data);
    } catch (err) {
      setError('Failed to load salary analysis');
      console.error('❌ Salary analysis error:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSalaryData();
    setRefreshing(false);
  };

  const formatSalary = (salary: number) => {
    if (salary >= 1000000) {
      return `$${(salary / 1000000).toFixed(1)}M`;
    } else if (salary >= 1000) {
      return `$${(salary / 1000).toFixed(0)}k`;
    }
    return `$${salary.toLocaleString()}`;
  };

  const getSalaryGrade = (salary: number) => {
    if (salary >= 150000) return { grade: 'Excellent', color: 'bg-emerald-500' };
    if (salary >= 100000) return { grade: 'Good', color: 'bg-blue-500' };
    if (salary >= 70000) return { grade: 'Average', color: 'bg-amber-500' };
    return { grade: 'Below Average', color: 'bg-red-500' };
  };

  const getTopLocations = (): LocationSalaryData[] => {
    if (!salaryData?.locationData) return [];
    
    return salaryData.locationData
      .filter(item => item.average_salary > 0)
      .sort((a, b) => b.average_salary - a.average_salary)
      .slice(0, 5)
      .map(item => ({
        location: item.location,
        average_salary: item.average_salary,
        growth_rate: item.growth_rate,
        demand_score: item.demand_score,
        job_count: item.job_postings_count
      }));
  };

  const getPercentile = (value: number, total: number) => {
    return Math.round((value / total) * 100);
  };

  if (!careerPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Analysis
          </CardTitle>
          <CardDescription>
            Select a career path to view detailed salary analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2" />
            <p>Choose a career path to analyze salary trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !salaryData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Analysis
          </CardTitle>
          <CardDescription>
            Analyzing salary data for {careerPath}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !salaryData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <DollarSign className="h-5 w-5" />
            Salary Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-4">
              {error || 'No salary data available'}
            </p>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Retry Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topLocations = getTopLocations();
  const averageGrade = getSalaryGrade(salaryData.averageSalary);
  const medianGrade = getSalaryGrade(salaryData.medianSalary);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Salary Analysis: {careerPath}
        </CardTitle>
        <CardDescription>
          Comprehensive salary breakdown and market positioning
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
            {salaryData.sampleSize} markets analyzed
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Salary Metrics */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Salary</span>
              <Badge className={averageGrade.color}>
                {averageGrade.grade}
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {formatSalary(salaryData.averageSalary)}
            </div>
            <div className="text-xs text-muted-foreground">
              Across all markets
            </div>
          </div>

          <div className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Median Salary</span>
              <Badge className={medianGrade.color}>
                {medianGrade.grade}
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {formatSalary(salaryData.medianSalary)}
            </div>
            <div className="text-xs text-muted-foreground">
              50th percentile
            </div>
          </div>
        </div>

        {/* Top Paying Location */}
        {salaryData.topPayingLocation && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Top Paying Market</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLocationSelect?.(salaryData.topPayingLocation.location)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Analyze
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xl font-bold">
                  {formatSalary(salaryData.topPayingLocation.average_salary)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {salaryData.topPayingLocation.location}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span>{salaryData.topPayingLocation.growth_rate}% growth</span>
              </div>
            </div>
          </div>
        )}

        {/* Top 5 Markets */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Top Paying Markets
          </h4>
          <div className="space-y-3">
            {topLocations.map((locationData, index) => (
              <div 
                key={locationData.location}
                className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                    #{index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium text-sm">{locationData.location}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{formatSalary(locationData.average_salary)}</span>
                      <span>•</span>
                      <span>{locationData.demand_score}/10 demand</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs">
                      {locationData.growth_rate >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span>{locationData.growth_rate}%</span>
                    </div>
                    {locationData.job_count && (
                      <div className="text-xs text-muted-foreground">
                        {locationData.job_count} jobs
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLocationSelect?.(locationData.location)}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why This Matters */}
        <div className="p-4 rounded-lg bg-muted/50 border border-muted">
          <h5 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Why This Matters
          </h5>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Understanding salary ranges helps you negotiate better compensation and choose optimal career locations.
            </p>
            <p>
              The {getPercentile(salaryData.averageSalary, 200000)}th percentile average suggests this career path offers {averageGrade.grade.toLowerCase()} earning potential.
            </p>
            {salaryData.topPayingLocation && (
              <p>
                Consider targeting opportunities in {salaryData.topPayingLocation.location} for maximum salary potential.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};