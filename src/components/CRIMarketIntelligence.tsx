/**
 * Phase 7: CRI Market Intelligence Dashboard
 * Combines CRI data with real-time market insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  Users,
  MapPin,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useMayaCRIIntegration } from '@/hooks/useMayaCRIIntegration';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CRIMarketIntelligenceProps {
  userId?: string;
  careerPath?: string;
  location?: string;
}

export function CRIMarketIntelligence({ 
  userId, 
  careerPath = 'Data Analyst',
  location = 'United States'
}: CRIMarketIntelligenceProps) {
  const [selectedMetric, setSelectedMetric] = useState<'demand' | 'salary' | 'competition'>('demand');
  
  const { getMarketIntelligence } = useEnhancedMaya();
  const { criScore } = useCareerReadiness({ userId });
  const { trajectory } = useMayaCRIIntegration(userId);

  // Mock real-time market data (in production, this would come from actual APIs)
  const { data: marketData } = useQuery({
    queryKey: ['market-intelligence', careerPath, location],
    queryFn: async () => {
      // Simulate API call to market intelligence service
      return {
        demand: {
          current: 85,
          trend: 'increasing',
          change: '+12%',
          forecast: 'Strong growth expected'
        },
        salary: {
          average: 75000,
          range: { min: 55000, max: 95000 },
          trend: 'stable',
          change: '+3%'
        },
        competition: {
          level: 'moderate',
          score: 65,
          criThreshold: 70,
          topSkills: ['Python', 'SQL', 'Tableau']
        },
        opportunities: {
          total: 1247,
          remote: 423,
          trending: ['Machine Learning', 'Cloud Analytics', 'Business Intelligence']
        }
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // CRI-Market Alignment Analysis
  const { data: criAlignment } = useQuery({
    queryKey: ['cri-market-alignment', userId, careerPath],
    queryFn: async () => {
      if (!criScore) return null;

      const currentCRI = criScore.overall;
      const marketThreshold = marketData?.competition.criThreshold || 70;
      
      return {
        currentCRI,
        marketThreshold,
        gap: Math.max(marketThreshold - currentCRI, 0),
        competitiveness: currentCRI >= marketThreshold ? 'competitive' : 'developing',
        readiness: currentCRI >= marketThreshold ? 'market-ready' : 'needs-improvement',
        timeToReady: trajectory?.timeToTarget || 'calculating...'
      };
    },
    enabled: !!criScore && !!marketData
  });

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'demand': return <TrendingUp className="h-5 w-5" />;
      case 'salary': return <DollarSign className="h-5 w-5" />;
      case 'competition': return <Users className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            CRI × Market Intelligence
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {location}
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {careerPath}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* CRI Market Readiness */}
      {criAlignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Market Readiness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{criAlignment.currentCRI}</div>
                <div className="text-sm text-muted-foreground">Your CRI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{criAlignment.marketThreshold}</div>
                <div className="text-sm text-muted-foreground">Market Threshold</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${criAlignment.gap === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {criAlignment.gap}
                </div>
                <div className="text-sm text-muted-foreground">Gap to Close</div>
              </div>
            </div>

            <Progress 
              value={(criAlignment.currentCRI / criAlignment.marketThreshold) * 100} 
              className="h-3" 
            />

            <div className="flex items-center justify-between">
              <Badge 
                variant={criAlignment.competitiveness === 'competitive' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {criAlignment.competitiveness === 'competitive' ? 
                  <CheckCircle className="h-3 w-3" /> : 
                  <AlertTriangle className="h-3 w-3" />
                }
                {criAlignment.competitiveness === 'competitive' ? 'Market Competitive' : 'Developing Skills'}
              </Badge>
              
              <div className="text-sm text-muted-foreground">
                Time to market-ready: {criAlignment.timeToReady}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Market Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="demand" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Demand
              </TabsTrigger>
              <TabsTrigger value="salary" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Salary
              </TabsTrigger>
              <TabsTrigger value="competition" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Competition
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demand" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getTrendIcon(marketData?.demand.trend || 'stable')}
                    <span className="font-medium">Market Demand</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{marketData?.demand.current}%</div>
                  <div className="text-sm text-muted-foreground">
                    {marketData?.demand.change} this quarter
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Job Openings</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{marketData?.opportunities.total.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    {marketData?.opportunities.remote} remote positions
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Forecast:</strong> {marketData?.demand.forecast}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Average Salary</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    ${marketData?.salary.average.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {marketData?.salary.change} year over year
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Salary Range</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ${marketData?.salary.range.min.toLocaleString()} - ${marketData?.salary.range.max.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Based on {location} market
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competition" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Competition Level</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{marketData?.competition.level}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {marketData?.competition.score}/100
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">CRI Threshold</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{marketData?.competition.criThreshold}</div>
                  <div className="text-sm text-muted-foreground">
                    Competitive minimum
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Top In-Demand Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {marketData?.competition.topSkills.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Maya Market Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Maya's Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={() => getMarketIntelligence(careerPath, location)}
              className="w-full"
            >
              <Brain className="h-4 w-4 mr-2" />
              Get Maya's Market Intelligence Report
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Trending Opportunities</h4>
                <div className="space-y-1">
                  {marketData?.opportunities.trending.map((trend, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      {trend}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">CRI Optimization Tips</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Focus on high-demand skills to boost market readiness</p>
                  <p>• Complete practical projects for experience points</p>
                  <p>• Monitor market trends for strategic skill development</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}