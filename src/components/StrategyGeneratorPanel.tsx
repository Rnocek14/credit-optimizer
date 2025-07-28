import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  Zap,
  Download,
  RefreshCw
} from 'lucide-react';

interface StrategyStep {
  id: string;
  title: string;
  description: string;
  timeframe: string;
  priority: 'high' | 'medium' | 'low';
  cost: string;
  completionRate: number;
  actions: string[];
}

interface CareerStrategy {
  title: string;
  description: string;
  timeToCompletion: string;
  successProbability: number;
  estimatedROI: string;
  steps: StrategyStep[];
  marketFactors: {
    opportunities: string[];
    challenges: string[];
  };
  riskFactors: string[];
  successMetrics: string[];
}

interface StrategyGeneratorPanelProps {
  selectedCareerPath?: { id: string; title: string };
  selectedLocation?: { id: string; label: string; value: string };
  onGenerateStrategy?: (strategy: CareerStrategy) => void;
}

export const StrategyGeneratorPanel: React.FC<StrategyGeneratorPanelProps> = ({
  selectedCareerPath,
  selectedLocation,
  onGenerateStrategy
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<CareerStrategy | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateStrategy = async () => {
    if (!selectedCareerPath || !selectedLocation) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Simulate strategy generation with progress updates
      const steps = [
        'Analyzing market trends...',
        'Identifying skill gaps...',
        'Generating career roadmap...',
        'Calculating ROI projections...',
        'Finalizing strategy...'
      ];
      
      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setGenerationProgress(((i + 1) / steps.length) * 100);
      }
      
      // Generate mock strategy based on selected career path and location
      const mockStrategy: CareerStrategy = {
        title: `${selectedCareerPath.title} Career Strategy`,
        description: `Comprehensive 18-month strategy to advance your career as a ${selectedCareerPath.title} in ${selectedLocation.label}`,
        timeToCompletion: '18 months',
        successProbability: 85,
        estimatedROI: '$25,000 - $45,000',
        steps: [
          {
            id: '1',
            title: 'Skill Assessment & Gap Analysis',
            description: 'Conduct comprehensive skills audit and identify key areas for improvement',
            timeframe: '2-4 weeks',
            priority: 'high',
            cost: 'Free - $500',
            completionRate: 0,
            actions: [
              'Complete technical skills assessment',
              'Identify top 3 skill gaps',
              'Research industry certification requirements',
              'Set up learning plan with milestones'
            ]
          },
          {
            id: '2',
            title: 'Strategic Skill Development',
            description: 'Focus on high-impact skills most valued in your target market',
            timeframe: '3-6 months',
            priority: 'high',
            cost: '$1,000 - $3,000',
            completionRate: 0,
            actions: [
              'Enroll in advanced certification programs',
              'Complete 2-3 hands-on projects',
              'Build portfolio showcasing new skills',
              'Seek mentorship from industry leaders'
            ]
          },
          {
            id: '3',
            title: 'Network Expansion & Brand Building',
            description: 'Build strategic professional network and enhance online presence',
            timeframe: '2-4 months',
            priority: 'medium',
            cost: '$200 - $800',
            completionRate: 0,
            actions: [
              'Optimize LinkedIn profile and portfolio',
              'Attend 6+ industry networking events',
              'Join 2-3 professional associations',
              'Publish thought leadership content'
            ]
          },
          {
            id: '4',
            title: 'Market Positioning & Job Search',
            description: 'Position yourself strategically for target roles and compensation',
            timeframe: '1-3 months',
            priority: 'high',
            cost: '$500 - $1,500',
            completionRate: 0,
            actions: [
              'Tailor resume for target positions',
              'Practice interview skills',
              'Apply to 15-20 strategic positions',
              'Negotiate optimal compensation package'
            ]
          }
        ],
        marketFactors: {
          opportunities: [
            `High demand for ${selectedCareerPath.title} roles in ${selectedLocation.label}`,
            'Remote work options expanding market reach',
            'Emerging technologies creating new specializations',
            'Industry growth creating advancement opportunities'
          ],
          challenges: [
            'Increased competition from skilled professionals',
            'Rapid technology changes requiring continuous learning',
            'Economic uncertainty affecting hiring timelines',
            'Skills gap between current and desired compensation level'
          ]
        },
        riskFactors: [
          'Market saturation in specific skill areas',
          'Economic downturn affecting job availability',
          'Technology disruption changing role requirements',
          'Competition from remote workers globally'
        ],
        successMetrics: [
          '20-40% salary increase within 18 months',
          'Successfully transition to target role',
          'Build network of 50+ relevant connections',
          'Complete 3+ certifications or major projects',
          'Establish thought leadership in chosen specialization'
        ]
      };
      
      setStrategy(mockStrategy);
      onGenerateStrategy?.(mockStrategy);
      
    } catch (error) {
      console.error('Strategy generation failed:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (!selectedCareerPath || !selectedLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Career Strategy Generator
          </CardTitle>
          <CardDescription>
            AI-powered personalized career strategy and roadmap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Select a career path and location to generate your personalized strategy
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Career Strategy Generator
          </CardTitle>
          <CardDescription>
            AI-powered personalized career strategy for {selectedCareerPath.title} in {selectedLocation.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!strategy && !isGenerating && (
            <div className="text-center py-6">
              <div className="mb-6">
                <Zap className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Generate Your Strategy</h3>
                <p className="text-muted-foreground mb-6">
                  Get a comprehensive 18-month career advancement plan tailored to your goals
                </p>
              </div>
              
              <Button onClick={handleGenerateStrategy} size="lg" className="min-w-[200px]">
                <Target className="w-4 h-4 mr-2" />
                Generate Strategy
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-8">
              <div className="mb-6">
                <RefreshCw className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
                <h3 className="text-lg font-semibold mb-2">Generating Your Strategy</h3>
                <p className="text-muted-foreground mb-4">
                  Analyzing market data and creating your personalized roadmap...
                </p>
                <Progress value={generationProgress} className="w-full max-w-md mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(generationProgress)}% complete
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {strategy && (
        <div className="space-y-6">
          {/* Strategy Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {strategy.title}
              </CardTitle>
              <CardDescription>{strategy.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 rounded-lg border bg-muted/20">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="font-semibold">{strategy.timeToCompletion}</div>
                  <div className="text-sm text-muted-foreground">Time to Completion</div>
                </div>
                <div className="text-center p-4 rounded-lg border bg-muted/20">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="font-semibold">{strategy.successProbability}%</div>
                  <div className="text-sm text-muted-foreground">Success Probability</div>
                </div>
                <div className="text-center p-4 rounded-lg border bg-muted/20">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <div className="font-semibold">{strategy.estimatedROI}</div>
                  <div className="text-sm text-muted-foreground">Estimated ROI</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button onClick={() => setStrategy(null)} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New Strategy
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Strategy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};