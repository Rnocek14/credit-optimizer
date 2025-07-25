import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, Calendar, BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Download, Zap } from 'lucide-react';
import { useEnhancedMarketIntelligence } from '@/hooks/useEnhancedMarketIntelligence';
import { CareerPathCombobox } from '@/components/ui/CareerPathCombobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

// Mock historical data generator for demo purposes
const generateMockHistoricalData = (careerPaths: string[], timeRange: string) => {
  const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : timeRange === '1Y' ? 12 : 24;
  const data = [];
  
  for (let i = months; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    const entry: any = { month, date: date.toISOString() };
    
    careerPaths.forEach((path, index) => {
      // Generate realistic trending data
      const baseValue = 60 + (index * 10);
      const trend = Math.sin(i * 0.2) * 10;
      const randomVariation = (Math.random() - 0.5) * 8;
      
      entry[`${path}_demand`] = Math.max(0, Math.min(100, baseValue + trend + randomVariation));
      entry[`${path}_salary`] = 75000 + (index * 15000) + (trend * 500) + (randomVariation * 1000);
      entry[`${path}_jobs`] = Math.max(0, 150 + (index * 50) + (trend * 20) + (randomVariation * 15));
    });
    
    data.push(entry);
  }
  
  return data;
};

interface HistoricalTrendsVisualizationProps {
  className?: string;
}

export const HistoricalTrendsVisualization: React.FC<HistoricalTrendsVisualizationProps> = ({ className }) => {
  const { getHistoricalTrends, loading } = useEnhancedMarketIntelligence();
  
  const [selectedCareerPaths, setSelectedCareerPaths] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string; emoji: string } | null>(null);
  const [timeRange, setTimeRange] = useState('6M');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [metric, setMetric] = useState<'demand' | 'salary' | 'jobs'>('demand');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Mock career paths for demo
  const mockCareerPaths = [
    { id: '1', title: 'Data Scientist' },
    { id: '2', title: 'Software Engineer' },
    { id: '3', title: 'Product Manager' },
    { id: '4', title: 'UX Designer' },
    { id: '5', title: 'DevOps Engineer' }
  ];

  const loadHistoricalData = async () => {
    if (selectedCareerPaths.length === 0) {
      setHistoricalData([]);
      return;
    }

    setIsLoadingData(true);
    try {
      // For demo purposes, use mock data. In production, this would fetch real data
      const mockData = generateMockHistoricalData(
        selectedCareerPaths.map(cp => cp.title),
        timeRange
      );
      setHistoricalData(mockData);
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadHistoricalData();
  }, [selectedCareerPaths, selectedLocation, timeRange]);

  const chartConfig = useMemo(() => {
    const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(120, 70%, 50%)', 'hsl(280, 70%, 50%)'];
    const config: any = {};
    
    selectedCareerPaths.forEach((path, index) => {
      const key = `${path.title}_${metric}`;
      config[key] = {
        label: path.title,
        color: colors[index % colors.length],
      };
    });
    
    return config;
  }, [selectedCareerPaths, metric]);

  const addCareerPath = (careerPath: { id: string; title: string }) => {
    if (selectedCareerPaths.length < 5 && !selectedCareerPaths.find(cp => cp.id === careerPath.id)) {
      setSelectedCareerPaths([...selectedCareerPaths, careerPath]);
    }
  };

  const removeCareerPath = (id: string) => {
    setSelectedCareerPaths(selectedCareerPaths.filter(cp => cp.id !== id));
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'demand': return 'Demand Score (%)';
      case 'salary': return 'Average Salary ($)';
      case 'jobs': return 'Job Postings Count';
      default: return '';
    }
  };

  const formatTooltipValue = (value: any, name: string) => {
    if (metric === 'salary') {
      return [`$${Number(value).toLocaleString()}`, name.replace(`_${metric}`, '')];
    }
    if (metric === 'jobs') {
      return [`${Number(value).toLocaleString()}`, name.replace(`_${metric}`, '')];
    }
    return [`${Number(value).toFixed(1)}%`, name.replace(`_${metric}`, '')];
  };

  const renderChart = () => {
    if (isLoadingData) {
      return <div className="h-96 flex items-center justify-center"><LoadingSkeleton /></div>;
    }

    if (selectedCareerPaths.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select career paths to view historical trends</p>
          </div>
        </div>
      );
    }

    const chartProps = {
      data: historicalData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (chartType) {
      case 'area':
        return (
          <ChartContainer config={chartConfig} className="h-96">
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent formatter={formatTooltipValue} />} />
              <Legend />
              {selectedCareerPaths.map((path, index) => (
                <Area
                  key={path.id}
                  type="monotone"
                  dataKey={`${path.title}_${metric}`}
                  stroke={chartConfig[`${path.title}_${metric}`]?.color}
                  fill={chartConfig[`${path.title}_${metric}`]?.color}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        );
      
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-96">
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent formatter={formatTooltipValue} />} />
              <Legend />
              {selectedCareerPaths.map((path, index) => (
                <Bar
                  key={path.id}
                  dataKey={`${path.title}_${metric}`}
                  fill={chartConfig[`${path.title}_${metric}`]?.color}
                />
              ))}
            </BarChart>
          </ChartContainer>
        );
      
      default:
        return (
          <ChartContainer config={chartConfig} className="h-96">
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent formatter={formatTooltipValue} />} />
              <Legend />
              {selectedCareerPaths.map((path, index) => (
                <Line
                  key={path.id}
                  type="monotone"
                  dataKey={`${path.title}_${metric}`}
                  stroke={chartConfig[`${path.title}_${metric}`]?.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">📈 Historical Trends Analysis</h3>
            <p className="text-muted-foreground">
              Track market trends and patterns over time across multiple career paths
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Chart
          </Button>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analysis Settings</CardTitle>
            <CardDescription>Configure your historical trends analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Career Path Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Career Path (Max 5)</label>
                <CareerPathCombobox
                  value={null}
                  onChange={addCareerPath}
                  placeholder="Select career path to add..."
                />
                <div className="flex flex-wrap gap-2">
                  {selectedCareerPaths.map((path) => (
                    <Badge key={path.id} variant="secondary" className="gap-1">
                      {path.title}
                      <button
                        onClick={() => removeCareerPath(path.id)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <LocationCombobox
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Select location (optional)..."
                />
              </div>
            </div>

            {/* Chart Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1M">Last Month</SelectItem>
                    <SelectItem value="3M">Last 3 Months</SelectItem>
                    <SelectItem value="6M">Last 6 Months</SelectItem>
                    <SelectItem value="1Y">Last Year</SelectItem>
                    <SelectItem value="2Y">Last 2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Metric</label>
                <Select value={metric} onValueChange={(value: 'demand' | 'salary' | 'jobs') => setMetric(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demand">Market Demand</SelectItem>
                    <SelectItem value="salary">Average Salary</SelectItem>
                    <SelectItem value="jobs">Job Postings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Chart Type</label>
                <div className="flex gap-1">
                  <Button
                    variant={chartType === 'line' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('line')}
                    className="gap-1"
                  >
                    <LineChartIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={chartType === 'area' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('area')}
                    className="gap-1"
                  >
                    <AreaChartIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={chartType === 'bar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="gap-1"
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {getMetricLabel()} Trends
            </CardTitle>
            <CardDescription>
              Historical analysis showing {getMetricLabel().toLowerCase()} patterns over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderChart()}
          </CardContent>
        </Card>

        {/* Insights Panel */}
        {selectedCareerPaths.length > 0 && historicalData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Pattern Recognition Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCareerPaths.map((path) => {
                  const pathData = historicalData.map(d => d[`${path.title}_${metric}`]).filter(v => v !== undefined && v !== null);
                  if (pathData.length < 2) return null; // Skip if insufficient data
                  
                  const latestValue = pathData[pathData.length - 1];
                  const previousValue = pathData[pathData.length - 2];
                  const trend = latestValue > previousValue ? 'up' : 'down';
                  const changePercent = ((latestValue - previousValue) / previousValue * 100).toFixed(1);
                  
                  return (
                    <Card key={path.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{path.title}</h4>
                          {trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold">
                            {metric === 'salary' ? `$${Math.round(latestValue || 0).toLocaleString()}` : 
                             metric === 'jobs' ? Math.round(latestValue || 0).toLocaleString() : 
                             `${(latestValue || 0).toFixed(1)}%`}
                          </p>
                          <p className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend === 'up' ? '+' : ''}{changePercent}% from last period
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};