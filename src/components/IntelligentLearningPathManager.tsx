import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Route, 
  BookOpen, 
  Award, 
  Briefcase, 
  Clock, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  Target,
  CheckCircle,
  Play,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IntelligentLearningPathManagerProps {
  goalId: string;
  userId: string;
  goal: any;
}

interface LearningPath {
  id: string;
  path_type: string;
  path_nodes: any;
  estimated_completion_weeks: number;
  cost_estimate: number;
  difficulty_level: number;
  success_rate: number;
  personalization_score: number;
  market_alignment_score: number;
}

export function IntelligentLearningPathManager({ goalId, userId, goal }: IntelligentLearningPathManagerProps) {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchLearningPaths();
  }, [goalId, userId]);

  const fetchLearningPaths = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_learning_paths')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setLearningPaths(data || []);
      if (data && data.length > 0 && !selectedPath) {
        setSelectedPath(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch learning paths:', error);
    }
  };

  const generateLearningPath = async (pathType: 'primary' | 'alternative' | 'accelerated') => {
    setIsGenerating(true);
    try {
      console.log('🛤️ Generating learning path:', pathType);
      
      const { data, error } = await supabase.functions.invoke('goal-learning-path-generator', {
        body: {
          goalId,
          userId,
          pathType
        }
      });

      if (error) throw error;

      if (data.success) {
        await fetchLearningPaths();
        toast({
          title: "Learning Path Generated",
          description: `${pathType} path created with ${data.milestonesCreated} milestones.`,
        });
      } else {
        throw new Error(data.error || 'Path generation failed');
      }
    } catch (error) {
      console.error('Path generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'skill': return <Target className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'certification': return <Award className="w-4 h-4" />;
      case 'project': return <Briefcase className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500';
    if (difficulty <= 3) return 'bg-yellow-500';
    if (difficulty <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPathTypeDescription = (pathType: string) => {
    switch (pathType) {
      case 'primary': return 'Most direct and efficient route to your goal';
      case 'alternative': return 'Different approach with alternative skill focus';
      case 'accelerated': return 'Fast-track path for quicker completion';
      default: return 'Custom learning pathway';
    }
  };

  if (learningPaths.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Route className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Intelligent Learning Paths</CardTitle>
          <CardDescription>
            Generate AI-powered, personalized learning paths for your career goal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => generateLearningPath('primary')} 
              disabled={isGenerating}
              variant="default"
            >
              <Route className="w-4 h-4 mr-2" />
              Primary Path
            </Button>
            <Button 
              onClick={() => generateLearningPath('alternative')} 
              disabled={isGenerating}
              variant="outline"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Alternative
            </Button>
            <Button 
              onClick={() => generateLearningPath('accelerated')} 
              disabled={isGenerating}
              variant="secondary"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Accelerated
            </Button>
          </div>
          {isGenerating && (
            <Alert>
              <Route className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                Generating your personalized learning path... This may take a few moments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Path Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            Learning Path Manager
          </CardTitle>
          <CardDescription>
            Choose and manage your AI-generated learning paths
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {learningPaths.map((path) => (
              <Card 
                key={path.id} 
                className={`cursor-pointer transition-all ${
                  selectedPath?.id === path.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedPath(path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={selectedPath?.id === path.id ? "default" : "secondary"}>
                      {path.path_type}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {path.estimated_completion_weeks}w
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {getPathTypeDescription(path.path_type)}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Success Rate</span>
                      <span>{Math.round(path.success_rate * 100)}%</span>
                    </div>
                    <Progress value={path.success_rate * 100} className="h-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => generateLearningPath('primary')} 
              disabled={isGenerating}
              variant="outline"
              size="sm"
            >
              Generate New Path
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Path Details */}
      {selectedPath && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Path Overview</CardTitle>
                <CardDescription>
                  {getPathTypeDescription(selectedPath.path_type)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 border rounded-lg">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-semibold">{selectedPath.estimated_completion_weeks}</div>
                    <div className="text-xs text-muted-foreground">Weeks</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="font-semibold">${selectedPath.cost_estimate}</div>
                    <div className="text-xs text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="font-semibold">{selectedPath.difficulty_level}/5</div>
                    <div className="text-xs text-muted-foreground">Difficulty</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="font-semibold">{Math.round(selectedPath.success_rate * 100)}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Personalization Score</h4>
                    <Progress value={selectedPath.personalization_score * 100} className="mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round(selectedPath.personalization_score * 100)}% - Tailored to your profile
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Market Alignment</h4>
                    <Progress value={selectedPath.market_alignment_score * 100} className="mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round(selectedPath.market_alignment_score * 100)}% - Current market relevance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Roadmap</CardTitle>
                <CardDescription>
                  Step-by-step path to achieving your goal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(Array.isArray(selectedPath.path_nodes) ? selectedPath.path_nodes : []).map((node: any, index: number) => (
                    <div key={index} className="flex gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                        {getNodeIcon(node.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{node.title}</h4>
                            <p className="text-sm text-muted-foreground">{node.description}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{node.type}</Badge>
                            <span className="text-muted-foreground">{node.estimatedWeeks}w</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getDifficultyColor(node.difficulty)}`} />
                            <span>Difficulty {node.difficulty}/5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>${node.costEstimate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{Math.round(node.marketRelevance * 100)}% relevant</span>
                          </div>
                        </div>

                        {node.personalizedReason && (
                          <Alert className="mt-3">
                            <Target className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {node.personalizedReason}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex justify-between items-center mt-3">
                          <div className="text-xs text-muted-foreground">
                            Prerequisites: {node.prerequisites?.length || 0}
                          </div>
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Path Analytics</CardTitle>
                <CardDescription>
                  Detailed metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Learning Metrics</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Time Investment</span>
                          <span className="text-sm font-medium">{selectedPath.estimated_completion_weeks} weeks</span>
                        </div>
                        <Progress value={75} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Cost Efficiency</span>
                          <span className="text-sm font-medium">85%</span>
                        </div>
                        <Progress value={85} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Skill Coverage</span>
                          <span className="text-sm font-medium">92%</span>
                        </div>
                        <Progress value={92} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Success Indicators</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Market Demand</span>
                          <span className="text-sm font-medium">{Math.round(selectedPath.market_alignment_score * 100)}%</span>
                        </div>
                        <Progress value={selectedPath.market_alignment_score * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Personal Fit</span>
                          <span className="text-sm font-medium">{Math.round(selectedPath.personalization_score * 100)}%</span>
                        </div>
                        <Progress value={selectedPath.personalization_score * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Success Probability</span>
                          <span className="text-sm font-medium">{Math.round(selectedPath.success_rate * 100)}%</span>
                        </div>
                        <Progress value={selectedPath.success_rate * 100} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Strategy</CardTitle>
                <CardDescription>
                  Strategic approach and key milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Strategy details will be available after path generation.</p>
                  <p className="text-sm">This includes focus areas, milestones, and risk mitigation.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}