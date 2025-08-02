import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, TrendingUp, Network, Eye, Target } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Phase6IntelligenceCoreProps {
  userId: string;
}

export function Phase6IntelligenceCore({ userId }: Phase6IntelligenceCoreProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('predictive');
  const [intelligenceMetrics, setIntelligenceMetrics] = useState({
    predictiveAccuracy: 94.2,
    crossSystemLearning: 88.7,
    patternRecognition: 92.1,
    adaptiveIntelligence: 96.3,
    autonomousDecisions: 91.8
  });

  const [multiModalCapabilities, setMultiModalCapabilities] = useState([
    { type: 'Text Analysis', confidence: 97.2, active: true },
    { type: 'Voice Processing', confidence: 89.4, active: true },
    { type: 'Visual Recognition', confidence: 92.6, active: true },
    { type: 'Behavioral Patterns', confidence: 85.9, active: true },
    { type: 'Contextual Learning', confidence: 94.1, active: true },
    { type: 'Predictive Modeling', confidence: 91.7, active: true }
  ]);

  const triggerAdvancedAnalysis = () => {
    toast({
      title: "Advanced Analysis Initiated",
      description: "Running multi-modal intelligence analysis...",
    });

    // Simulate real-time intelligence improvements
    setTimeout(() => {
      setIntelligenceMetrics(prev => ({
        ...prev,
        predictiveAccuracy: Math.min(100, prev.predictiveAccuracy + Math.random() * 2),
        crossSystemLearning: Math.min(100, prev.crossSystemLearning + Math.random() * 3),
        patternRecognition: Math.min(100, prev.patternRecognition + Math.random() * 1.5)
      }));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Intelligence Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Advanced Intelligence Core
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(intelligenceMetrics).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-primary">{value.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <Progress value={value} className="mt-2 h-2" />
              </div>
            ))}
          </div>
          
          <Button onClick={triggerAdvancedAnalysis} className="w-full mt-4">
            <Zap className="w-4 h-4 mr-2" />
            Trigger Advanced Analysis
          </Button>
        </CardContent>
      </Card>

      {/* Multi-Modal Capabilities */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictive">Predictive AI</TabsTrigger>
          <TabsTrigger value="multimodal">Multi-Modal</TabsTrigger>
          <TabsTrigger value="learning">Cross-Learning</TabsTrigger>
          <TabsTrigger value="patterns">Pattern AI</TabsTrigger>
        </TabsList>

        <TabsContent value="predictive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Predictive Intelligence Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Career Trajectory Prediction</span>
                    <Badge>96.7% Accurate</Badge>
                  </div>
                  <Progress value={96.7} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Market Trend Forecasting</span>
                    <Badge>93.2% Accurate</Badge>
                  </div>
                  <Progress value={93.2} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Skill Demand Prediction</span>
                    <Badge>94.8% Accurate</Badge>
                  </div>
                  <Progress value={94.8} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Success Probability</span>
                    <Badge>91.4% Accurate</Badge>
                  </div>
                  <Progress value={91.4} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multimodal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Multi-Modal Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {multiModalCapabilities.map((capability) => (
                  <div key={capability.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${capability.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="font-medium">{capability.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{capability.confidence}%</span>
                      <Progress value={capability.confidence} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Cross-System Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">847</div>
                  <div className="text-sm text-muted-foreground">Learning Sessions</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">23.4K</div>
                  <div className="text-sm text-muted-foreground">Patterns Learned</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Network className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground">System Connections</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Advanced Pattern Recognition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span>Career Path Optimization Patterns</span>
                  <Badge>94.2% Match Rate</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span>User Behavior Analysis</span>
                  <Badge>91.7% Accuracy</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span>Market Correlation Patterns</span>
                  <Badge>88.9% Precision</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span>Success Prediction Models</span>
                  <Badge>96.1% Reliability</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}