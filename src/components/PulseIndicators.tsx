import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Users, 
  DollarSign,
  Brain,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface MarketTrend {
  career_path: string;
  location: string;
  job_postings_count: number;
  average_salary: number;
  growth_rate: number;
  demand_score: number;
  competition_level: string;
  created_at: string;
}

interface PulseIndicatorsProps {
  marketData: MarketTrend[];
  selectedCareerPath?: string;
  selectedLocation?: string;
  realtimeData?: any[];
}

interface PulseMetric {
  id: string;
  label: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'average' | 'poor';
  icon: React.ReactNode;
  description: string;
  lastUpdate: string;
}

interface ActivityItem {
  id: string;
  type: 'growth' | 'demand' | 'salary' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  severity: 'high' | 'medium' | 'low';
}

export const PulseIndicators: React.FC<PulseIndicatorsProps> = ({
  marketData,
  selectedCareerPath,
  selectedLocation,
  realtimeData
}) => {
  const [pulseMetrics, setPulseMetrics] = useState<PulseMetric[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [overallPulse, setOverallPulse] = useState(0);

  useEffect(() => {
    calculatePulseMetrics();
    generateRecentActivity();
  }, [marketData, selectedCareerPath, selectedLocation, realtimeData]);

  const calculatePulseMetrics = () => {
    if (!marketData || marketData.length === 0) {
      setPulseMetrics([]);
      setOverallPulse(0);
      return;
    }

    // Filter data based on selections
    const relevantData = marketData.filter(item => {
      const careerMatch = !selectedCareerPath || 
        item.career_path.toLowerCase().includes(selectedCareerPath.toLowerCase());
      const locationMatch = !selectedLocation || 
        item.location.toLowerCase().includes(selectedLocation.toLowerCase());
      return careerMatch && locationMatch;
    });

    const dataToAnalyze = relevantData.length > 0 ? relevantData : marketData;

    // Calculate metrics
    const avgGrowth = dataToAnalyze.reduce((sum, item) => sum + item.growth_rate, 0) / dataToAnalyze.length;
    const avgDemand = dataToAnalyze.reduce((sum, item) => sum + item.demand_score, 0) / dataToAnalyze.length;
    const avgSalary = dataToAnalyze.reduce((sum, item) => sum + (item.average_salary || 0), 0) / dataToAnalyze.length;
    const totalJobs = dataToAnalyze.reduce((sum, item) => sum + (item.job_postings_count || 0), 0);

    // Normalize values to 0-100
    const growthScore = Math.min(100, Math.max(0, (avgGrowth + 10) * 4)); // -10% to 15% -> 0-100
    const demandScore = avgDemand * 10; // 0-10 -> 0-100
    const salaryScore = Math.min(100, Math.max(0, (avgSalary - 30000) / 1000)); // 30k-130k -> 0-100
    const jobsScore = Math.min(100, Math.max(0, totalJobs / 10)); // Scale job postings

    const getStatus = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
      if (score >= 80) return 'excellent';
      if (score >= 60) return 'good';
      if (score >= 40) return 'average';
      return 'poor';
    };

    const getTrend = (score: number): 'up' | 'down' | 'stable' => {
      // Mock trend calculation - would be based on historical data
      if (score >= 70) return 'up';
      if (score <= 30) return 'down';
      return 'stable';
    };

    const now = new Date().toISOString();

    const metrics: PulseMetric[] = [
      {
        id: 'growth',
        label: 'Growth Pulse',
        value: Math.round(growthScore),
        trend: getTrend(growthScore),
        status: getStatus(growthScore),
        icon: <TrendingUp className="h-4 w-4" />,
        description: `${avgGrowth.toFixed(1)}% average growth rate`,
        lastUpdate: now
      },
      {
        id: 'demand',
        label: 'Demand Pulse',
        value: Math.round(demandScore),
        trend: getTrend(demandScore),
        status: getStatus(demandScore),
        icon: <Zap className="h-4 w-4" />,
        description: `${avgDemand.toFixed(1)}/10 demand score`,
        lastUpdate: now
      },
      {
        id: 'salary',
        label: 'Salary Pulse',
        value: Math.round(salaryScore),
        trend: getTrend(salaryScore),
        status: getStatus(salaryScore),
        icon: <DollarSign className="h-4 w-4" />,
        description: `$${(avgSalary / 1000).toFixed(0)}k average salary`,
        lastUpdate: now
      },
      {
        id: 'opportunities',
        label: 'Opportunity Pulse',
        value: Math.round(jobsScore),
        trend: getTrend(jobsScore),
        status: getStatus(jobsScore),
        icon: <Users className="h-4 w-4" />,
        description: `${totalJobs} total opportunities`,
        lastUpdate: now
      }
    ];

    setPulseMetrics(metrics);
    
    // Calculate overall pulse
    const overallScore = metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
    setOverallPulse(Math.round(overallScore));
  };

  const generateRecentActivity = () => {
    // Generate mock recent activity - would be based on real data changes
    const activities: ActivityItem[] = [
      {
        id: '1',
        type: 'growth',
        title: 'Growth Spike Detected',
        description: selectedCareerPath ? 
          `${selectedCareerPath} showing 15% growth increase` : 
          'Software Engineering showing 15% growth increase',
        timestamp: '2 hours ago',
        severity: 'high'
      },
      {
        id: '2',
        type: 'demand',
        title: 'High Demand Alert',
        description: selectedLocation ? 
          `Increased job postings in ${selectedLocation}` : 
          'Increased job postings in San Francisco',
        timestamp: '4 hours ago',
        severity: 'medium'
      },
      {
        id: '3',
        type: 'salary',
        title: 'Salary Trend Update',
        description: 'Average salaries increased by 8% this quarter',
        timestamp: '6 hours ago',
        severity: 'medium'
      },
      {
        id: '4',
        type: 'alert',
        title: 'Market Analysis Complete',
        description: 'Latest market intelligence data processed',
        timestamp: '8 hours ago',
        severity: 'low'
      }
    ];

    setRecentActivity(activities.slice(0, 4));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'average': return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
      case 'poor': return 'text-red-600 bg-red-50 dark:bg-red-950';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-emerald-600" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />;
      default: return <Activity className="h-3 w-3 text-amber-600" />;
    }
  };

  const getActivityIcon = (type: string, severity: string) => {
    const iconClass = severity === 'high' ? 'text-red-600' : 
                      severity === 'medium' ? 'text-amber-600' : 'text-blue-600';
    
    switch (type) {
      case 'growth': return <TrendingUp className={`h-4 w-4 ${iconClass}`} />;
      case 'demand': return <Zap className={`h-4 w-4 ${iconClass}`} />;
      case 'salary': return <DollarSign className={`h-4 w-4 ${iconClass}`} />;
      case 'alert': return <AlertCircle className={`h-4 w-4 ${iconClass}`} />;
      default: return <Activity className={`h-4 w-4 ${iconClass}`} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Market Pulse Indicators
        </CardTitle>
        <CardDescription>
          Real-time market health metrics and recent activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Pulse Score */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Overall Market Pulse</span>
          </div>
          <div className="text-3xl font-bold text-primary">{overallPulse}</div>
          <div className="text-xs text-muted-foreground">out of 100</div>
          <Progress value={overallPulse} className="mt-2" />
        </div>

        {/* Pulse Metrics Grid */}
        <div className="grid gap-4 grid-cols-2">
          {pulseMetrics.map((metric) => (
            <div 
              key={metric.id}
              className={`p-3 rounded-lg border ${getStatusColor(metric.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {metric.icon}
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs opacity-80">{metric.description}</div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Recent Activity</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                {getActivityIcon(activity.type, activity.severity)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{activity.title}</div>
                  <div className="text-xs text-muted-foreground">{activity.description}</div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};