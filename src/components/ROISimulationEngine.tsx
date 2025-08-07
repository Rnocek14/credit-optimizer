import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { DollarSign, TrendingUp, Calendar, Target, PiggyBank, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ROIProjection {
  month: number;
  currentSalary: number;
  projectedSalary: number;
  cumulativeInvestment: number;
  cumulativeReturn: number;
  netROI: number;
  marketDemandMultiplier: number;
}

interface ROISimulationEngineProps {
  userId: string;
  pivotPath?: {
    new_career: string;
    roi_score: number;
    estimated_cost: string;
    estimated_time: string;
  };
  sharedROIData?: any;
}

export function ROISimulationEngine({ userId, pivotPath }: ROISimulationEngineProps) {
  const [timeframe, setTimeframe] = useState('12');
  const [simulationView, setSimulationView] = useState('projection');
  const { toast } = useToast();

  // Mock current salary and target data
  const currentSalary = 85000;
  const targetSalary = 120000;
  const totalInvestment = 1200;
  
  // Generate simulation data
  const generateROIProjections = (): ROIProjection[] => {
    const months = parseInt(timeframe);
    const projections: ROIProjection[] = [];
    
    for (let month = 0; month <= months; month++) {
      const progress = month / months;
      const marketVariation = 1 + (Math.sin(month * 0.5) * 0.1); // Market fluctuation
      
      // Salary progression (gradual increase after pivot completion)
      const salaryIncrease = month <= 4 ? 0 : 
        (progress * (targetSalary - currentSalary)) * marketVariation;
      
      const projectedSalary = currentSalary + salaryIncrease;
      
      // Investment progression
      const investmentProgress = Math.min(progress * 1.5, 1);
      const cumulativeInvestment = totalInvestment * investmentProgress;
      
      // Calculate cumulative returns
      const monthlyGain = month <= 4 ? 0 : (projectedSalary - currentSalary) / 12;
      const cumulativeReturn = Math.max(0, monthlyGain * Math.max(0, month - 4));
      
      projections.push({
        month,
        currentSalary,
        projectedSalary,
        cumulativeInvestment,
        cumulativeReturn,
        netROI: cumulativeReturn - cumulativeInvestment,
        marketDemandMultiplier: marketVariation
      });
    }
    
    return projections;
  };

  const projections = generateROIProjections();
  const finalProjection = projections[projections.length - 1];
  const paybackMonth = projections.find(p => p.netROI > 0)?.month || parseInt(timeframe);
  
  const handleRunSimulation = () => {
    toast({
      title: "Simulation Updated",
      description: `Running ROI analysis for ${timeframe} months`,
      variant: "default"
    });
  };

  const getROIColor = (roi: number) => {
    if (roi > 10000) return 'text-green-600';
    if (roi > 0) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">ROI Simulation Engine</h3>
                <p className="text-sm text-muted-foreground">
                  {pivotPath ? `Analyzing ${pivotPath.new_career} transition` : 'Career transition analysis'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-green-500/10 to-blue-500/10">
              ROI Score: {pivotPath?.roi_score || 85}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Timeframe:</span>
              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList>
                  <TabsTrigger value="6">6 months</TabsTrigger>
                  <TabsTrigger value="12">12 months</TabsTrigger>
                  <TabsTrigger value="24">24 months</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={handleRunSimulation} size="sm">
              <Calculator className="w-4 h-4 mr-2" />
              Update Simulation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net ROI</p>
                <p className={`text-lg font-semibold ${getROIColor(finalProjection.netROI)}`}>
                  ${finalProjection.netROI.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className="text-lg font-semibold">{paybackMonth} months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salary Increase</p>
                <p className="text-lg font-semibold">
                  +${(finalProjection.projectedSalary - currentSalary).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <PiggyBank className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
                <p className="text-lg font-semibold">${totalInvestment.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simulation Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Financial Projections</span>
            <Tabs value={simulationView} onValueChange={setSimulationView}>
              <TabsList>
                <TabsTrigger value="projection">Salary Projection</TabsTrigger>
                <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
                <TabsTrigger value="market">Market Impact</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {simulationView === 'projection' ? (
                <LineChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `$${value.toLocaleString()}`,
                      name === 'currentSalary' ? 'Current Salary' : 'Projected Salary'
                    ]}
                    labelFormatter={(month) => `Month ${month}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="currentSalary" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    name="Current Salary"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projectedSalary" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Projected Salary"
                  />
                </LineChart>
              ) : simulationView === 'roi' ? (
                <AreaChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `$${value.toLocaleString()}`,
                      name === 'cumulativeInvestment' ? 'Total Investment' : 
                      name === 'cumulativeReturn' ? 'Total Returns' : 'Net ROI'
                    ]}
                    labelFormatter={(month) => `Month ${month}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeInvestment" 
                    stackId="1"
                    stroke="hsl(var(--destructive))" 
                    fill="hsl(var(--destructive))" 
                    fillOpacity={0.3}
                    name="Investment"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulativeReturn" 
                    stackId="2"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    name="Returns"
                  />
                </AreaChart>
              ) : (
                <BarChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${(value * 100).toFixed(1)}%`, 'Market Demand Multiplier']}
                    labelFormatter={(month) => `Month ${month}`}
                  />
                  <Bar 
                    dataKey="marketDemandMultiplier" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.7}
                    name="Market Demand"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-green-600 mb-2">🎯 Best Case</h4>
              <div className="space-y-2 text-sm">
                <p>Quick skill acquisition (3 months)</p>
                <p>High market demand</p>
                <p className="font-semibold">ROI: +${(finalProjection.netROI * 1.3).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600 mb-2">📊 Expected Case</h4>
              <div className="space-y-2 text-sm">
                <p>Standard timeline ({pivotPath?.estimated_time || '4 months'})</p>
                <p>Normal market conditions</p>
                <p className="font-semibold">ROI: ${finalProjection.netROI.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-orange-600 mb-2">⚠️ Conservative</h4>
              <div className="space-y-2 text-sm">
                <p>Extended timeline (+2 months)</p>
                <p>Lower market demand</p>
                <p className="font-semibold">ROI: ${(finalProjection.netROI * 0.7).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}