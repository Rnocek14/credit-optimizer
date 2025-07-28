import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Target, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface StrategyStep {
  title: string;
  description: string;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

interface CareerStrategy {
  title: string;
  description: string;
  timeframe: string;
  confidenceScore: number;
  steps: StrategyStep[];
  marketFactors: string[];
  riskFactors: string[];
  successMetrics: string[];
}

interface StrategyGeneratorPanelProps {
  selectedCareerPath?: string;
  selectedLocation?: string;
  onGenerateStrategy?: () => void;
}

export function StrategyGeneratorPanel({
  selectedCareerPath,
  selectedLocation,
  onGenerateStrategy
}: StrategyGeneratorPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<CareerStrategy | null>(null);

  const handleGenerateStrategy = async () => {
    if (!selectedCareerPath || !selectedLocation) return;
    
    setIsGenerating(true);
    
    // Simulate strategy generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generatedStrategy: CareerStrategy = {
      title: `Strategic Career Plan: ${selectedCareerPath}`,
      description: `Accelerated growth strategy for ${selectedCareerPath} professionals in ${selectedLocation}`,
      timeframe: '12-18 months',
      confidenceScore: 87,
      steps: [
        {
          title: 'Skill Enhancement Phase',
          description: 'Focus on high-demand technical skills and certifications',
          timeframe: '3-4 months',
          priority: 'high'
        },
        {
          title: 'Network Building',
          description: 'Expand professional network through events and online platforms',
          timeframe: '2-3 months',
          priority: 'medium'
        },
        {
          title: 'Portfolio Development',
          description: 'Create compelling portfolio showcasing real-world projects',
          timeframe: '4-6 months',
          priority: 'high'
        },
        {
          title: 'Market Positioning',
          description: 'Build personal brand and thought leadership in target niche',
          timeframe: '6-8 months',
          priority: 'medium'
        },
        {
          title: 'Strategic Job Search',
          description: 'Target high-growth companies and negotiate optimal packages',
          timeframe: '2-3 months',
          priority: 'high'
        }
      ],
      marketFactors: [
        'High demand growth (+15.2% annually)',
        'Remote work opportunities expanding',
        'AI/ML integration driving need for skills',
        'Salary growth outpacing inflation'
      ],
      riskFactors: [
        'High competition in entry-level positions',
        'Rapid technology changes requiring continuous learning',
        'Economic uncertainty affecting hiring'
      ],
      successMetrics: [
        '25% salary increase within 12 months',
        'Secure position at target company',
        'Build network of 50+ relevant professionals',
        'Complete 3 major certification programs'
      ]
    };
    
    setStrategy(generatedStrategy);
    setIsGenerating(false);
    onGenerateStrategy?.();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedCareerPath || !selectedLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Strategy Generator
          </CardTitle>
          <CardDescription>
            Select career path and location to generate personalized strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please select both career path and location to generate your personalized career strategy.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Strategy Generator
        </CardTitle>
        <CardDescription>
          AI-powered career acceleration strategy for {selectedCareerPath} in {selectedLocation}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!strategy && !isGenerating && (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generate Your Strategy</h3>
            <p className="text-muted-foreground mb-4">
              Get a personalized career acceleration plan based on current market data and AI insights.
            </p>
            <Button onClick={handleGenerateStrategy} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="h-4 w-4 mr-2" />
              Generate Strategy
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-8">
            <div className="relative">
              <Brain className="h-12 w-12 text-purple-500 mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Generating Strategy...</h3>
            <p className="text-muted-foreground mb-4">
              Analyzing market data and creating your personalized plan
            </p>
            <Progress value={75} className="w-full max-w-xs mx-auto" />
          </div>
        )}

        {strategy && (
          <div className="space-y-6">
            {/* Strategy Overview */}
            <div className="p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{strategy.title}</h3>
                <Badge variant="secondary">
                  {strategy.confidenceScore}% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {strategy.timeframe}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {strategy.steps.length} strategic steps
                </span>
              </div>
            </div>

            {/* Strategy Steps */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Strategic Steps
              </h4>
              <div className="space-y-3">
                {strategy.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{step.title}</h5>
                        <Badge variant="outline" className={getPriorityColor(step.priority)}>
                          {step.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.timeframe}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>

            {/* Market Factors */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  Market Opportunities
                </h4>
                <ul className="space-y-1 text-sm">
                  {strategy.marketFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Factors
                </h4>
                <ul className="space-y-1 text-sm">
                  {strategy.riskFactors.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Success Metrics */}
            <div>
              <h4 className="font-medium mb-2">Success Metrics</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {strategy.successMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 rounded border bg-background">
                    <Target className="h-3 w-3 text-blue-500 shrink-0" />
                    {metric}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" onClick={() => setStrategy(null)} className="mr-2">
                Generate New Strategy
              </Button>
              <Button variant="outline">
                Export Strategy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}