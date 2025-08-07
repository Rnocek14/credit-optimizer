import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useSemanticPlanning } from '@/hooks/useSemanticPlanning';
import { TransitionTimeline } from './TransitionTimeline';
import { SimulationMetrics } from './SimulationMetrics';
import { Play, RefreshCw, Target, MapPin, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransitionParameters {
  currentRole: string;
  targetRole: string;
  location: string;
  timeline: string;
  budget: string;
  riskTolerance: 'low' | 'medium' | 'high';
  priorityFocus: 'speed' | 'cost' | 'success_rate';
}

interface SimulationResult {
  pathId: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    cost: number;
    successRate: number;
    skills: string[];
    resources: string[];
  }>;
  metrics: {
    totalDuration: string;
    totalCost: number;
    overallSuccessRate: number;
    riskLevel: string;
    confidence: number;
  };
  mayaRecommendations: string[];
}

export function CareerTransitionSimulator() {
  const [parameters, setParameters] = useState<TransitionParameters>({
    currentRole: '',
    targetRole: '',
    location: '',
    timeline: '12',
    budget: '5000',
    riskTolerance: 'medium',
    priorityFocus: 'success_rate'
  });
  
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');
  
  const { askAboutCareerTransition, getResponseInsights } = useEnhancedMaya();
  const { generateEnhancedPlan, calculateSkillGap } = useSemanticPlanning();
  const { toast } = useToast();

  const handleParameterChange = useCallback((field: keyof TransitionParameters, value: string) => {
    setParameters(prev => ({ ...prev, [field]: value }));
  }, []);

  const runSimulation = useCallback(async () => {
    if (!parameters.currentRole || !parameters.targetRole) {
      toast({
        title: "Missing Information",
        description: "Please specify both current and target roles to run simulation.",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    try {
      // Get Maya's transition analysis
      const mayaResponse = await askAboutCareerTransition(
        parameters.targetRole,
        parameters.location,
        `${parameters.timeline} months`
      );

      // Generate enhanced learning path
      const learningPaths = await generateEnhancedPlan(parameters.targetRole, {
        current_job_id: parameters.currentRole,
        location: parameters.location,
        budget_limit: parseInt(parameters.budget),
        time_constraint_months: parseInt(parameters.timeline)
      });

      // Calculate skill gap
      const skillGap = await calculateSkillGap(
        parameters.currentRole,
        parameters.targetRole
      );

      // Process results into simulation format
      const bestPath = learningPaths[0];
      if (bestPath) {
        // Create simulation milestones from path nodes
        const pathNodes = bestPath.nodes || [];
        const nodesPerMilestone = Math.max(1, Math.ceil(pathNodes.length / 4)); // Group nodes into 4 milestones
        const milestones = [];
        
        for (let i = 0; i < pathNodes.length; i += nodesPerMilestone) {
          const milestoneNodes = pathNodes.slice(i, i + nodesPerMilestone);
          const milestoneIndex = Math.floor(i / nodesPerMilestone);
          
          milestones.push({
            id: `milestone-${milestoneIndex}`,
            title: milestoneNodes[0]?.title || `Phase ${milestoneIndex + 1}`,
            description: `Complete ${milestoneNodes.length} learning component${milestoneNodes.length > 1 ? 's' : ''}`,
            duration: `${Math.ceil((bestPath.total_time || 480) / 4 / 40)} weeks`, // Divide total time by 4 milestones, convert to weeks
            cost: (bestPath.total_cost || 5000) / 4, // Divide total cost by 4 milestones
            successRate: 75 + Math.random() * 20, // Random success rate 75-95%
            skills: milestoneNodes.map(node => node.title || 'Learning component'),
            resources: ['Online courses', 'Practice projects', 'Mentorship sessions']
          });
        }

        const result: SimulationResult = {
          pathId: crypto.randomUUID(),
          milestones,
          metrics: {
            totalDuration: `${Math.ceil((bestPath.total_time || 480) / 40)} weeks`,
            totalCost: bestPath.total_cost || 5000,
            overallSuccessRate: (bestPath.confidence_score || 0.8) * 100,
            riskLevel: skillGap.transition_difficulty > 0.7 ? 'High' : skillGap.transition_difficulty > 0.4 ? 'Medium' : 'Low',
            confidence: bestPath.personalization_score || 0.8
          },
          mayaRecommendations: mayaResponse ? [
            "Consider building foundational skills first",
            "Network within your target industry",
            "Start with side projects to demonstrate capabilities"
          ] : []
        };

        setSimulationResult(result);
        setActiveTab('results');
        
        toast({
          title: "Simulation Complete!",
          description: `Generated transition plan with ${result.milestones.length} milestones.`
        });
      }
    } catch (error) {
      console.error('Simulation error:', error);
      toast({
        title: "Simulation Failed",
        description: "Unable to generate transition plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  }, [parameters, askAboutCareerTransition, generateEnhancedPlan, calculateSkillGap, toast]);

  const resetSimulation = useCallback(() => {
    setSimulationResult(null);
    setActiveTab('setup');
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Career Transition Simulator
          </CardTitle>
          <CardDescription>
            Simulate your career transition with AI-powered insights and personalized roadmaps
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup Parameters</TabsTrigger>
          <TabsTrigger value="results" disabled={!simulationResult}>Simulation Results</TabsTrigger>
          <TabsTrigger value="timeline" disabled={!simulationResult}>Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Role Transition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentRole">Current Role</Label>
                  <Input
                    id="currentRole"
                    placeholder="e.g., Software Developer"
                    value={parameters.currentRole}
                    onChange={(e) => handleParameterChange('currentRole', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Product Manager"
                    value={parameters.targetRole}
                    onChange={(e) => handleParameterChange('targetRole', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Preferred Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., San Francisco, Remote"
                    value={parameters.location}
                    onChange={(e) => handleParameterChange('location', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Constraints & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timeline (months)</Label>
                  <Select
                    value={parameters.timeline}
                    onValueChange={(value) => handleParameterChange('timeline', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="18">18 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget ($)</Label>
                  <Select
                    value={parameters.budget}
                    onValueChange={(value) => handleParameterChange('budget', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">$1,000</SelectItem>
                      <SelectItem value="5000">$5,000</SelectItem>
                      <SelectItem value="10000">$10,000</SelectItem>
                      <SelectItem value="20000">$20,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Risk Tolerance</Label>
                  <Select
                    value={parameters.riskTolerance}
                    onValueChange={(value) => handleParameterChange('riskTolerance', value as 'low' | 'medium' | 'high')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Conservative</SelectItem>
                      <SelectItem value="medium">Balanced</SelectItem>
                      <SelectItem value="high">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority Focus</Label>
                  <Select
                    value={parameters.priorityFocus}
                    onValueChange={(value) => handleParameterChange('priorityFocus', value as 'speed' | 'cost' | 'success_rate')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speed">Fastest Path</SelectItem>
                      <SelectItem value="cost">Most Affordable</SelectItem>
                      <SelectItem value="success_rate">Highest Success Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={runSimulation}
              disabled={isSimulating || !parameters.currentRole || !parameters.targetRole}
              size="lg"
              className="min-w-[200px]"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Simulation
                </>
              )}
            </Button>
            {simulationResult && (
              <Button onClick={resetSimulation} variant="outline" size="lg">
                Reset
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {simulationResult && (
            <>
              <SimulationMetrics metrics={simulationResult.metrics} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Transition Milestones</CardTitle>
                  <CardDescription>
                    Step-by-step breakdown of your career transition journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {simulationResult.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium">{milestone.title}</h4>
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {milestone.duration}
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${milestone.cost.toLocaleString()}
                            </Badge>
                            <Badge variant="secondary">
                              {milestone.successRate.toFixed(0)}% success rate
                            </Badge>
                          </div>
                          {milestone.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {milestone.skills.map(skill => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {simulationResult.mayaRecommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Maya's Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {simulationResult.mayaRecommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {simulationResult && (
            <TransitionTimeline milestones={simulationResult.milestones} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}