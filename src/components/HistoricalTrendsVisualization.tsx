import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
    const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    
    const monthData: any = { month };
    
    careerPaths.forEach(careerPath => {
      const baseValue = Math.random() * 50 + 50; // 50-100 base
      const variance = (Math.random() - 0.5) * 10; // ±5 variance
      
      monthData[`${careerPath}_demand`] = Math.max(0, Math.min(100, baseValue + variance));
      monthData[`${careerPath}_salary`] = Math.round((80000 + Math.random() * 60000) / 1000) * 1000;
      monthData[`${careerPath}_jobs`] = Math.round(200 + Math.random() * 800);
    });
    
    data.push(monthData);
  }
  
  return data;
};

interface HistoricalTrendsVisualizationProps {
  selectedCareerPaths?: Array<{ id: string; title: string }>;
  selectedLocation?: { id: string; label: string; value: string };
}

export const HistoricalTrendsVisualization: React.FC<HistoricalTrendsVisualizationProps> = ({
  selectedCareerPaths: propCareerPaths = [],
  selectedLocation: propLocation
}) => {
  const { getHistoricalTrends } = useEnhancedMarketIntelligence();
  
  const [selectedCareerPaths, setSelectedCareerPaths] = useState<Array<{ id: string; title: string }>>(propCareerPaths);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; label: string; value: string } | null>(propLocation || null);
  const [timeRange, setTimeRange] = useState('6M');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [metric, setMetric] = useState<'demand' | 'salary' | 'jobs'>('demand');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Update internal state when props change
  useEffect(() => {
    setSelectedCareerPaths(propCareerPaths);
  }, [propCareerPaths]);

  useEffect(() => {
    setSelectedLocation(propLocation || null);
  }, [propLocation]);

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (selectedCareerPaths.length === 0) {
        setHistoricalData([]);
        return;
      }

      setIsLoadingData(true);
      try {
        // For demo purposes, we'll use mock data
        // In production, you would fetch real historical data
        const mockData = generateMockHistoricalData(
          selectedCareerPaths.map(cp => cp.title),
          timeRange
        );
        setHistoricalData(mockData);
      } catch (error) {
        console.error('Error loading historical data:', error);
        setHistoricalData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadHistoricalData();
  }, [selectedCareerPaths, selectedLocation, timeRange]);

  const chartConfig = useMemo(() => {
    const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(120, 70%, 50%)', 'hsl(280, 70%, 50%)'];
    const config: any = {};
    
    selectedCareerPaths.forEach((path, index) => {
      const color = colors[index % colors.length];
      config[`${path.title}_demand`] = { color, label: `${path.title} Demand` };
      config[`${path.title}_salary`] = { color, label: `${path.title} Salary` };
      config[`${path.title}_jobs`] = { color, label: `${path.title} Jobs` };
    });
    
    return config;
  }, [selectedCareerPaths]);

  const formatTooltipValue = (value: any, name: string) => {
    if (name.includes('salary')) {
      return [`$${value?.toLocaleString()}`, name.replace('_salary', ' Salary')];
    }
    if (name.includes('jobs')) {
      return [`${value?.toLocaleString()} jobs`, name.replace('_jobs', ' Jobs')];
    }
    return [`${value?.toFixed(1)}%`, name.replace('_demand', ' Demand')];
  };

  const handleCareerPathAdd = (careerPath: { id: string; title: string }) => {
    if (!selectedCareerPaths.find(cp => cp.id === careerPath.id)) {
      setSelectedCareerPaths([...selectedCareerPaths, careerPath]);
    }
  };

  const handleCareerPathRemove = (careerPathId: string) => {
    setSelectedCareerPaths(selectedCareerPaths.filter(cp => cp.id !== careerPathId));
  };

  const renderChart = () => {
    if (isLoadingData) {
      return <LoadingSkeleton variant="chart" />;
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

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={384}>
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {selectedCareerPaths.map((path) => (
              <Area
                key={path.id}
                type="monotone"
                dataKey={`${path.title}_${metric}`}
                stroke={chartConfig[`${path.title}_${metric}`]?.color || 'hsl(var(--primary))'}
                fill={chartConfig[`${path.title}_${metric}`]?.color || 'hsl(var(--primary))'}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={384}>
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {selectedCareerPaths.map((path) => (
              <Bar
                key={path.id}
                dataKey={`${path.title}_${metric}`}
                fill={chartConfig[`${path.title}_${metric}`]?.color || 'hsl(var(--primary))'}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default to line chart
    return (
      <ResponsiveContainer width="100%" height={384}>
        <LineChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          {selectedCareerPaths.map((path) => (
            <Line
              key={path.id}
              type="monotone"
              dataKey={`${path.title}_${metric}`}
              stroke={chartConfig[`${path.title}_${metric}`]?.color || 'hsl(var(--primary))'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const exportChart = () => {
    // Implementation for chart export
    console.log('Exporting chart data:', historicalData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historical Market Trends
          </CardTitle>
          <CardDescription>
            Track career market evolution over time with interactive visualizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value="trends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
              <TabsTrigger value="comparison">Comparative View</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-4">
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <SelectItem value="demand">Demand Score</SelectItem>
                      <SelectItem value="salary">Average Salary</SelectItem>
                      <SelectItem value="jobs">Job Count</SelectItem>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <Button variant="outline" size="sm" onClick={exportChart} className="w-full gap-1">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Career Path Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selected Career Paths</h4>
                  <CareerPathCombobox
                    value={null}
                    onChange={handleCareerPathAdd}
                    placeholder="Add career path..."
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedCareerPaths.map((path) => (
                    <Badge
                      key={path.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleCareerPathRemove(path.id)}
                    >
                      {path.title} ×
                    </Badge>
                  ))}
                  {selectedCareerPaths.length === 0 && (
                    <p className="text-sm text-muted-foreground">No career paths selected</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {metric === 'demand' ? 'Demand Trends' : 
                 metric === 'salary' ? 'Salary Trends' : 'Job Market Trends'}
              </CardTitle>
              <CardDescription>
                Historical data for {selectedLocation?.label || 'All Locations'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};