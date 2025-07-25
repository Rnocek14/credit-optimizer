import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Clock } from "lucide-react";
import { useEnhancedMarketIntelligence } from "@/hooks/useEnhancedMarketIntelligence";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MarketForecastPanelProps {
  careerPath?: string;
  location?: string;
  autoData?: any;
  autoTrigger?: boolean;
}

export function MarketForecastPanel({ careerPath, location, autoData, autoTrigger }: MarketForecastPanelProps) {
  const { generateDemandForecast, loadingForecasts, forecastError } = useEnhancedMarketIntelligence();
  const [forecast, setForecast] = useState<any>(null);
  const [timeHorizon, setTimeHorizon] = useState('6months');

  // Auto-populate data when provided from comprehensive analysis
  useEffect(() => {
    if (autoData && autoTrigger) {
      console.log('🔥 Auto-populating forecast data:', autoData);
      setForecast(autoData);
    }
  }, [autoData, autoTrigger]);

  const handleGenerateForecast = async () => {
    console.log('🔮 Generate Forecast clicked:', { careerPath, location, timeHorizon });
    
    if (!careerPath || !location) {
      console.warn('❌ Missing required data:', { careerPath, location });
      return;
    }
    
    const result = await generateDemandForecast(careerPath, location, timeHorizon);
    console.log('📊 Forecast result:', result);
    
    if (result) {
      setForecast(result);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-success';
      case 'decreasing': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-success';
    if (confidence >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  // Generate timeline chart data
  const generateTimelineData = () => {
    if (!forecast?.timelineEvents) return [];
    
    return forecast.timelineEvents.map((event: any, index: number) => ({
      month: event.month,
      name: `Month ${event.month}`,
      impact: event.impact === 'positive' ? 1 : event.impact === 'negative' ? -1 : 0,
      event: event.event
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Market Demand Forecast
        </CardTitle>
        <CardDescription>
          AI-powered demand forecasting for career paths
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Time Horizon</label>
            <Select value={timeHorizon} onValueChange={setTimeHorizon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="2years">2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleGenerateForecast}
            disabled={loadingForecasts || !careerPath || !location}
          >
            {loadingForecasts ? 'Forecasting...' : (autoData && autoTrigger ? 'Re-generate Forecast' : 'Generate Forecast')}
          </Button>
        </div>

        {forecastError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{forecastError}</AlertDescription>
          </Alert>
        )}

        {forecast && forecast.demandProjection && (
          <div className="space-y-6">
            {/* Demand & Salary Projections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getTrendIcon(forecast.demandProjection.trend)}
                    Demand Projection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Trend</span>
                      <Badge variant="outline" className={getTrendColor(forecast.demandProjection.trend)}>
                        {forecast.demandProjection.trend}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Growth Rate</span>
                      <span className="font-medium">{forecast.demandProjection.growthRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <Badge className={getConfidenceColor(forecast.demandProjection.confidence)}>
                        {forecast.demandProjection.confidence}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Salary Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expected Change</span>
                      <span className={`font-medium ${forecast.salaryProjection.expectedChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {forecast.salaryProjection.expectedChange > 0 ? '+' : ''}{forecast.salaryProjection.expectedChange}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <Badge className={getConfidenceColor(forecast.salaryProjection.confidence)}>
                        {forecast.salaryProjection.confidence}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Chart */}
            {forecast.timelineEvents?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline Forecast</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateTimelineData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[-1.5, 1.5]} />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-medium">{label}</p>
                                  <p className="text-sm text-muted-foreground">{data.event}</p>
                                  <p className={`text-sm ${data.impact > 0 ? 'text-success' : data.impact < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    Impact: {data.impact > 0 ? 'Positive' : data.impact < 0 ? 'Negative' : 'Neutral'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="impact" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Market Drivers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecast.marketFactors?.map((factor: string, index: number) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecast.riskFactors?.map((risk: string, index: number) => (
                      <Badge key={index} variant="destructive" className="mr-2 mb-2">
                        {risk}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Opportunities */}
            {forecast.opportunities?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-warning" />
                    Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecast.opportunities.map((opportunity: string, index: number) => (
                      <Badge key={index} variant="outline" className="mr-2 mb-2 border-success text-success">
                        {opportunity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {forecast.recommendations && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {forecast.recommendations}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}