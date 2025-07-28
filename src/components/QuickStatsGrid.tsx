import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

interface MarketTrend {
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
}

interface QuickStatsGridProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  description: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  description, 
  trend = 'neutral' 
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-3 w-3" />;
      case 'down': return <ArrowDownRight className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {change !== undefined && (
            <Badge variant="outline" className={`text-xs ${getTrendColor()}`}>
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                {change > 0 ? '+' : ''}{change}%
              </div>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
        <CardDescription className="text-xs mt-1">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export const QuickStatsGrid: React.FC<QuickStatsGridProps> = ({
  marketData,
  selectedCareerPath,
  selectedLocation
}) => {
  const stats = useMemo(() => {
    if (!marketData || marketData.length === 0) {
      return {
        growingCareersCount: 0,
        avgGrowthRate: 0,
        highDemandCount: 0,
        avgSalary: 0,
        totalJobs: 0,
        topMarkets: 0
      };
    }

    // Filter data based on selections if available
    const relevantData = marketData.filter(item => {
      const careerMatch = !selectedCareerPath || 
        item.career_path.toLowerCase().includes(selectedCareerPath.toLowerCase());
      const locationMatch = !selectedLocation || 
        item.location.toLowerCase().includes(selectedLocation.toLowerCase());
      return careerMatch && locationMatch;
    });

    const dataToAnalyze = relevantData.length > 0 ? relevantData : marketData;

    const growingCareers = dataToAnalyze.filter(item => item.growth_rate > 5);
    const highDemandCareers = dataToAnalyze.filter(item => item.demand_score >= 7);
    const avgGrowth = dataToAnalyze.reduce((sum, item) => sum + item.growth_rate, 0) / dataToAnalyze.length;
    const avgSalary = dataToAnalyze.reduce((sum, item) => sum + (item.average_salary || 0), 0) / dataToAnalyze.length;
    const totalJobs = dataToAnalyze.reduce((sum, item) => sum + (item.job_postings_count || 0), 0);
    const uniqueMarkets = new Set(dataToAnalyze.map(item => `${item.career_path}-${item.location}`)).size;

    return {
      growingCareersCount: growingCareers.length,
      avgGrowthRate: avgGrowth,
      highDemandCount: highDemandCareers.length,
      avgSalary: avgSalary,
      totalJobs: totalJobs,
      topMarkets: uniqueMarkets
    };
  }, [marketData, selectedCareerPath, selectedLocation]);

  // Calculate trends (mock calculation - would be based on historical data)
  const growthTrend = stats.avgGrowthRate > 10 ? 'up' : stats.avgGrowthRate < 5 ? 'down' : 'neutral';
  const demandTrend = stats.highDemandCount > stats.growingCareersCount * 0.6 ? 'up' : 'down';
  const salaryTrend = stats.avgSalary > 75000 ? 'up' : stats.avgSalary < 50000 ? 'down' : 'neutral';

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Growing Careers"
        value={stats.growingCareersCount}
        change={12}
        changeLabel="vs last month"
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        description="Careers with 5%+ growth rate"
        trend={growthTrend}
      />

      <StatCard
        title="High Demand"
        value={stats.highDemandCount}
        change={8}
        changeLabel="this quarter"
        icon={<Target className="h-4 w-4 text-blue-600" />}
        description="Careers with 7+ demand score"
        trend={demandTrend}
      />

      <StatCard
        title="Avg Growth Rate"
        value={`${stats.avgGrowthRate.toFixed(1)}%`}
        change={stats.avgGrowthRate > 10 ? 5 : -2}
        changeLabel="market average"
        icon={<Activity className="h-4 w-4 text-purple-600" />}
        description="Average career growth rate"
        trend={growthTrend}
      />

      <StatCard
        title="Avg Salary"
        value={`$${(stats.avgSalary / 1000).toFixed(0)}k`}
        change={stats.avgSalary > 75000 ? 6 : -3}
        changeLabel="vs national"
        icon={<DollarSign className="h-4 w-4 text-green-600" />}
        description="Average market salary"
        trend={salaryTrend}
      />
    </div>
  );
};