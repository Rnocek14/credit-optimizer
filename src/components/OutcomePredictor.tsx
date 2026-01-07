import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Brain, Zap, Clock, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PredictionMetric {
  category: string;
  currentScore: number;
  targetScore: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  blockers: string[];
  accelerators: string[];
}

interface SuccessProbability {
  timeframe: string;
  probability: number;
  factors: string[];
  confidence: number;
}

interface AlternativePath {
  title: string;
  description: string;
  probability: number;
  timeToSwitch: string;
  reasoning: string;
  advantages: string[];
}

interface OutcomePredictorProps {
  userId: string;
  targetCareer: string;
  currentProgress: number;
  pivotData?: any;
  sharedPredictionData?: any;
}

export function OutcomePredictor({ 
  userId, 
  targetCareer = "Product Manager", 
  currentProgress = 65,
  pivotData 
}: OutcomePredictorProps) {
  const [predictionView, setPredictionView] = useState('success');
  const { toast } = useToast();

  // Mock prediction data
  const metrics: PredictionMetric[] = [
    {
      category: 'Skills Development',
      currentScore: 75,
      targetScore: 90,
      confidence: 85,
      trend: 'improving',
      blockers: ['Limited hands-on experience'],
      accelerators: ['Strong analytical background', 'Active learning pace']
    },
    {
      category: 'Market Readiness',
      currentScore: 60,
      targetScore: 80,
      confidence: 70,
      trend: 'stable',
      blockers: ['No product management experience', 'Limited portfolio'],
      accelerators: ['Strong technical background', 'Industry knowledge']
    },
    {
      category: 'Network Building',
      currentScore: 45,
      targetScore: 75,
      confidence: 60,
      trend: 'declining',
      blockers: ['Limited PM connections', 'No mentor relationship'],
      accelerators: ['Professional events access', 'Online community participation']
    },
    {
      category: 'Interview Readiness',
      currentScore: 30,
      targetScore: 85,
      confidence: 40,
      trend: 'improving',
      blockers: ['No PM interview experience', 'Case study practice needed'],
      accelerators: ['Technical interview skills', 'Communication abilities']
    }
  ];

  const successProbabilities: SuccessProbability[] = [
    {
      timeframe: '3 months',
      probability: 35,
      confidence: 75,
      factors: ['Accelerated learning', 'Market conditions', 'Competition level']
    },
    {
      timeframe: '6 months',
      probability: 75,
      confidence: 85,
      factors: ['Skill completion', 'Portfolio development', 'Network growth']
    },
    {
      timeframe: '12 months',
      probability: 90,
      confidence: 95,
      factors: ['Full preparation', 'Multiple opportunities', 'Market cycles']
    }
  ];

  const alternativePaths: AlternativePath[] = [
    {
      title: 'Technical Product Manager',
      description: 'Leverage technical background more directly',
      probability: 85,
      timeToSwitch: '2 weeks',
      reasoning: 'Better skill alignment and higher demand for technical PMs',
      advantages: ['Technical credibility', 'Faster transition', 'Higher starting salary']
    },
    {
      title: 'Data Product Manager',
      description: 'Focus on data-driven product roles',
      probability: 80,
      timeToSwitch: '1 month',
      reasoning: 'Your analytics skills provide strong foundation',
      advantages: ['Skill transferability', 'Growing market', 'Specialized expertise']
    },
    {
      title: 'Product Marketing Manager',
      description: 'Bridge between product and marketing',
      probability: 70,
      timeToSwitch: '3 weeks',
      reasoning: 'Less technical barrier with faster entry path',
      advantages: ['Communication focus', 'Creative outlet', 'Customer interaction']
    }
  ];

  // Calculate overall success score
  const overallScore = metrics.reduce((acc, metric) => acc + (metric.currentScore * 0.25), 0);
  const confidenceScore = metrics.reduce((acc, metric) => acc + (metric.confidence * 0.25), 0);

  const handleRefreshPredictions = () => {
    toast({
      title: "Predictions Updated",
      description: "Refreshing success probability analysis...",
      variant: "default"
    });
  };

  const handleExploreAlternative = (path: AlternativePath) => {
    toast({
      title: "Alternative Path",
      description: `Exploring ${path.title} transition`,
      variant: "default"
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-500/10';
      case 'declining':
        return 'text-red-600 bg-red-500/10';
      default:
        return 'text-blue-600 bg-blue-500/10';
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return '#22c55e';
    if (probability >= 60) return '#3b82f6';
    if (probability >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const pieData = successProbabilities.map((item, index) => ({
    name: item.timeframe,
    value: item.probability,
    color: getSuccessColor(item.probability)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Outcome Predictor</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered success probability for {targetCareer}
                </p>
              </div>
            </div>
            <Button onClick={handleRefreshPredictions} size="sm" variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Overall Readiness</p>
              <p className="text-2xl font-bold text-primary">{Math.round(overallScore)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Prediction Confidence</p>
              <p className="text-2xl font-bold text-green-600">{Math.round(confidenceScore)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Success Probability (6mo)</p>
              <p className="text-2xl font-bold text-blue-600">
                {successProbabilities.find(p => p.timeframe === '6 months')?.probability}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prediction Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Success Analysis</span>
            <Tabs value={predictionView} onValueChange={setPredictionView}>
              <TabsList>
                <TabsTrigger value="success">Success Probability</TabsTrigger>
                <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
                <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictionView === 'success' && (
            <div className="space-y-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={successProbabilities.map((item, index) => ({
                    timeframe: item.timeframe,
                    probability: item.probability,
                    confidence: item.confidence
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="timeframe" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}%`,
                        name === 'probability' ? 'Success Probability' : 'Confidence'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="probability" 
                      stroke="var(--primary)" 
                      strokeWidth={3}
                      name="Success Probability"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="var(--accent)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Confidence"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {successProbabilities.map((prob) => (
                  <Card key={prob.timeframe}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{prob.timeframe}</h4>
                        <Badge style={{ backgroundColor: getSuccessColor(prob.probability) + '20', color: getSuccessColor(prob.probability) }}>
                          {prob.probability}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {prob.factors.map((factor, index) => (
                          <p key={index} className="text-xs text-muted-foreground">• {factor}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {predictionView === 'metrics' && (
            <div className="space-y-4">
              {metrics.map((metric) => (
                <Card key={metric.category}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{metric.category}</h4>
                        {getTrendIcon(metric.trend)}
                      </div>
                      <Badge className={getTrendColor(metric.trend)}>
                        {metric.trend}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Current → Target</span>
                          <span className="text-sm font-medium">
                            {metric.currentScore}% → {metric.targetScore}%
                          </span>
                        </div>
                        <Progress value={metric.currentScore} className="mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Confidence: {metric.confidence}%
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-red-600">Blockers:</p>
                          {metric.blockers.map((blocker, index) => (
                            <p key={index} className="text-xs text-muted-foreground">• {blocker}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-green-600">Accelerators:</p>
                          {metric.accelerators.map((accelerator, index) => (
                            <p key={index} className="text-xs text-muted-foreground">• {accelerator}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {predictionView === 'alternatives' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Alternative Career Paths</h4>
                <p className="text-sm text-muted-foreground">
                  If current trajectory shows risks, consider these high-probability alternatives
                </p>
              </div>
              
              {alternativePaths.map((path) => (
                <Card key={path.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{path.title}</h4>
                        <p className="text-sm text-muted-foreground">{path.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{path.probability}% success</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Switch in {path.timeToSwitch}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-3">{path.reasoning}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {path.advantages.map((advantage, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {advantage}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleExploreAlternative(path)}
                      >
                        Explore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Early Warning System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Early Warning System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-700">Network Building Risk</p>
              </div>
              <p className="text-xs text-yellow-600">
                Your networking progress is behind schedule. Consider joining PM communities or finding a mentor.
              </p>
            </div>
            
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700">Skills on Track</p>
              </div>
              <p className="text-xs text-blue-600">
                Your technical skills development is progressing well. Continue current pace.
              </p>
            </div>
            
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-700">Opportunity Window</p>
              </div>
              <p className="text-xs text-green-600">
                Market conditions for PM roles are improving. Consider accelerating your timeline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}