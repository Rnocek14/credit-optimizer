import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Clock, Zap, TrendingUp, AlertTriangle, CheckCircle, Calendar, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimelineAdjustment {
  type: 'accelerate' | 'standard' | 'decelerate';
  description: string;
  impact: string;
  newDuration: string;
  confidence: number;
  reasoning: string;
}

interface MilestoneAdjustment {
  milestoneId: string;
  currentOrder: number;
  suggestedOrder: number;
  reason: string;
  impact: 'positive' | 'neutral' | 'negative';
}

interface PivotTimelineAdjustorProps {
  userId: string;
  currentProgress: number;
  originalTimeline: string;
  targetCareer: string;
  sharedTimelineData?: any;
}

export function PivotTimelineAdjustor({ 
  userId, 
  currentProgress, 
  originalTimeline = "4 months",
  targetCareer = "Product Manager"
}: PivotTimelineAdjustorProps) {
  const [intensityLevel, setIntensityLevel] = useState([50]);
  const [selectedAdjustment, setSelectedAdjustment] = useState<string>('standard');
  const { toast } = useToast();

  // Mock data for timeline adjustments based on current progress
  const adjustments: TimelineAdjustment[] = [
    {
      type: 'accelerate',
      description: 'Fast Track Path',
      impact: '2 months faster',
      newDuration: '2 months',
      confidence: 75,
      reasoning: 'Your current pace is 30% ahead of schedule. We can accelerate by focusing on critical skills and leveraging your existing experience.'
    },
    {
      type: 'standard',
      description: 'Original Timeline',
      impact: 'On schedule',
      newDuration: originalTimeline,
      confidence: 90,
      reasoning: 'Maintain current pace for optimal learning depth and retention. This provides the best balance of speed and thoroughness.'
    },
    {
      type: 'decelerate',
      description: 'Extended Learning',
      impact: '2 months longer',
      newDuration: '6 months',
      confidence: 95,
      reasoning: 'A more thorough approach with additional hands-on projects and mentorship. Better for long-term mastery and confidence.'
    }
  ];

  // Mock milestone reordering suggestions
  const milestoneAdjustments: MilestoneAdjustment[] = [
    {
      milestoneId: 'm2',
      currentOrder: 2,
      suggestedOrder: 1,
      reason: 'Analytics skills are foundational and will accelerate later milestones',
      impact: 'positive'
    },
    {
      milestoneId: 'm3',
      currentOrder: 3,
      suggestedOrder: 4,
      reason: 'User research can be done in parallel with final project',
      impact: 'neutral'
    }
  ];

  // Calculate dynamic adjustments based on intensity
  const getIntensityAdjustments = () => {
    const intensity = intensityLevel[0];
    let timeMultiplier = 1;
    let description = 'Standard pace';
    
    if (intensity < 30) {
      timeMultiplier = 1.5;
      description = 'Relaxed pace - more time for deep learning';
    } else if (intensity > 70) {
      timeMultiplier = 0.7;
      description = 'Intensive pace - accelerated timeline';
    }
    
    return { timeMultiplier, description };
  };

  const handleApplyAdjustment = (adjustmentType: string) => {
    toast({
      title: "Timeline Updated",
      description: `Applied ${adjustmentType} timeline adjustment`,
      variant: "default"
    });
    setSelectedAdjustment(adjustmentType);
  };

  const handleMayaRecommendation = () => {
    toast({
      title: "Maya AI Analysis",
      description: "Getting personalized timeline recommendations...",
      variant: "default"
    });
  };

  const getAdjustmentColor = (type: string) => {
    switch (type) {
      case 'accelerate':
        return 'border-blue-500 bg-blue-500/5';
      case 'decelerate':
        return 'border-orange-500 bg-orange-500/5';
      default:
        return 'border-green-500 bg-green-500/5';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const { timeMultiplier, description } = getIntensityAdjustments();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Timeline Adjuster</h3>
                <p className="text-sm text-muted-foreground">
                  Optimize your {targetCareer} transition timeline
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-accent/10">
              {currentProgress}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Current Progress</span>
            <span className="text-sm text-muted-foreground">{originalTimeline} target</span>
          </div>
          <Progress value={currentProgress} className="mb-2" />
          <p className="text-xs text-muted-foreground">
            Based on your current pace, you're {currentProgress > 60 ? 'ahead of' : 'on'} schedule
          </p>
        </CardContent>
      </Card>

      {/* Learning Intensity Adjuster */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Learning Intensity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Intensity Level</span>
              <span className="text-sm text-muted-foreground">{intensityLevel[0]}%</span>
            </div>
            <Slider
              value={intensityLevel}
              onValueChange={setIntensityLevel}
              max={100}
              min={10}
              step={10}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Relaxed</span>
              <span>Standard</span>
              <span>Intensive</span>
            </div>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated completion: {Math.round(4 * timeMultiplier)} months
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Adjustment Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Timeline Adjustments</span>
            <Button onClick={handleMayaRecommendation} size="sm" variant="outline">
              <Bot className="w-4 h-4 mr-2" />
              Ask Maya
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adjustments.map((adjustment) => (
              <div
                key={adjustment.type}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedAdjustment === adjustment.type 
                    ? getAdjustmentColor(adjustment.type) 
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
                onClick={() => setSelectedAdjustment(adjustment.type)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{adjustment.description}</h4>
                  <Badge variant="secondary">{adjustment.impact}</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {adjustment.reasoning}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence:</span>
                    <Progress value={adjustment.confidence} className="w-16 h-2" />
                    <span className="text-xs">{adjustment.confidence}%</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={selectedAdjustment === adjustment.type ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyAdjustment(adjustment.type);
                    }}
                  >
                    {selectedAdjustment === adjustment.type ? 'Applied' : 'Apply'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestone Reordering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Smart Milestone Reordering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestoneAdjustments.map((adjustment) => (
              <div key={adjustment.milestoneId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getImpactIcon(adjustment.impact)}
                  <div>
                    <p className="font-medium text-sm">
                      Move milestone {adjustment.currentOrder} → {adjustment.suggestedOrder}
                    </p>
                    <p className="text-xs text-muted-foreground">{adjustment.reason}</p>
                  </div>
                </div>
                
                <Button size="sm" variant="outline">
                  Apply
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Maya's Timeline Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm font-medium text-blue-700">📈 Acceleration Opportunity</p>
              <p className="text-xs text-blue-600 mt-1">
                Your rapid progress in analytics suggests you can fast-track the data skills milestone by 3 weeks.
              </p>
            </div>
            
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-700">🎯 Optimization Tip</p>
              <p className="text-xs text-green-600 mt-1">
                Combining user research with your final project will save 2 weeks and provide better practical experience.
              </p>
            </div>
            
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm font-medium text-orange-700">⚠️ Market Timing</p>
              <p className="text-xs text-orange-600 mt-1">
                Product manager hiring typically peaks in Q1. Consider timing your completion for January 2025.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}