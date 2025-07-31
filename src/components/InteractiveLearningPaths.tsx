import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  SkipForward, 
  BookOpen, 
  Clock, 
  DollarSign, 
  Target,
  CheckCircle,
  Circle,
  ArrowRight,
  Star,
  TrendingUp,
  Award,
  Users
} from 'lucide-react';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { useCourseProgress } from '@/hooks/useCourseProgress';

interface LearningStep {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'course' | 'project' | 'certification';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // hours
  cost: number;
  prerequisites: string[];
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progress?: number; // 0-100
  resources: Array<{
    title: string;
    type: 'course' | 'article' | 'video' | 'book';
    url?: string;
    provider?: string;
    cost?: number;
    rating?: number;
  }>;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalTime: number; // hours
  totalCost: number;
  estimatedSalaryIncrease: number;
  roiScore: number;
  steps: LearningStep[];
  milestones: Array<{
    stepIndex: number;
    title: string;
    description: string;
    reward?: string;
  }>;
}

interface InteractiveLearningPathsProps {
  userSkills: string[];
  targetRole?: string;
  selectedPath?: LearningPath | null;
  onPathStart?: (path: LearningPath) => void;
  onStepComplete?: (stepId: string) => void;
}

export const InteractiveLearningPaths: React.FC<InteractiveLearningPathsProps> = ({
  userSkills,
  targetRole,
  selectedPath,
  onPathStart,
  onStepComplete
}) => {
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLearning, setIsLearning] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Course progress integration
  const { courseProgress: courseProgressData } = useCourseProgress();

  // Mock learning paths - in real app, this would come from API/database
  const mockLearningPaths: LearningPath[] = useMemo(() => [
    {
      id: 'fullstack-developer',
      title: 'Full-Stack Developer Path',
      description: 'Complete journey from frontend to backend development',
      targetRole: 'Full-Stack Developer',
      difficulty: 'intermediate',
      totalTime: 480, // 3 months
      totalCost: 850,
      estimatedSalaryIncrease: 25000,
      roiScore: 4.2,
      steps: [
        {
          id: 'html-css-basics',
          title: 'HTML & CSS Fundamentals',
          description: 'Master the building blocks of web development',
          type: 'skill',
          difficulty: 'beginner',
          estimatedTime: 40,
          cost: 0,
          prerequisites: [],
          status: 'available',
          progress: 85,
          resources: [
            {
              title: 'HTML & CSS Complete Course',
              type: 'course',
              provider: 'FreeCodeCamp',
              cost: 0,
              rating: 4.8
            }
          ]
        },
        {
          id: 'javascript-fundamentals',
          title: 'JavaScript Programming',
          description: 'Learn the language that powers the web',
          type: 'skill',
          difficulty: 'intermediate',
          estimatedTime: 60,
          cost: 50,
          prerequisites: ['html-css-basics'],
          status: 'in_progress',
          progress: 45,
          resources: [
            {
              title: 'JavaScript: The Complete Guide',
              type: 'course',
              provider: 'Udemy',
              cost: 50,
              rating: 4.6
            }
          ]
        },
        {
          id: 'react-development',
          title: 'React Frontend Development',
          description: 'Build modern user interfaces with React',
          type: 'skill',
          difficulty: 'intermediate',
          estimatedTime: 80,
          cost: 75,
          prerequisites: ['javascript-fundamentals'],
          status: 'locked',
          resources: [
            {
              title: 'React - The Complete Guide',
              type: 'course',
              provider: 'Udemy',
              cost: 75,
              rating: 4.7
            }
          ]
        },
        {
          id: 'portfolio-project',
          title: 'Portfolio Website Project',
          description: 'Build a professional portfolio to showcase your skills',
          type: 'project',
          difficulty: 'intermediate',
          estimatedTime: 40,
          cost: 0,
          prerequisites: ['react-development'],
          status: 'locked',
          resources: [
            {
              title: 'Portfolio Design Inspiration',
              type: 'article',
              cost: 0,
              rating: 4.5
            }
          ]
        }
      ],
      milestones: [
        {
          stepIndex: 1,
          title: 'Frontend Foundations',
          description: 'Completed basic frontend development skills',
          reward: '100 XP + Frontend Badge'
        },
        {
          stepIndex: 3,
          title: 'First Portfolio',
          description: 'Built and deployed your first professional portfolio',
          reward: '200 XP + Portfolio Badge'
        }
      ]
    },
    {
      id: 'data-scientist',
      title: 'Data Science Mastery',
      description: 'Transform data into insights with modern tools',
      targetRole: 'Data Scientist',
      difficulty: 'advanced',
      totalTime: 600, // 4 months
      totalCost: 1200,
      estimatedSalaryIncrease: 35000,
      roiScore: 5.1,
      steps: [
        {
          id: 'python-basics',
          title: 'Python Programming',
          description: 'Master Python for data analysis',
          type: 'skill',
          difficulty: 'beginner',
          estimatedTime: 50,
          cost: 40,
          prerequisites: [],
          status: 'available',
          resources: [
            {
              title: 'Python for Data Science',
              type: 'course',
              provider: 'Coursera',
              cost: 40,
              rating: 4.9
            }
          ]
        }
      ],
      milestones: []
    }
  ], []);

  // Get current learning path
  const currentPath = useMemo(() => {
    if (selectedPath) return selectedPath;
    if (activePathId) {
      return mockLearningPaths.find(p => p.id === activePathId) || null;
    }
    return null;
  }, [selectedPath, activePathId, mockLearningPaths]);

  // Calculate path progress
  const pathProgress = useMemo(() => {
    if (!currentPath) return 0;
    
    const completedSteps = currentPath.steps.filter(step => step.status === 'completed').length;
    return (completedSteps / currentPath.steps.length) * 100;
  }, [currentPath]);

  // Calculate time to completion
  const timeToCompletion = useMemo(() => {
    if (!currentPath) return 0;
    
    const remainingSteps = currentPath.steps.filter(step => 
      step.status !== 'completed'
    );
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  }, [currentPath]);

  // Handle path selection
  const handlePathStart = useCallback((path: LearningPath) => {
    setActivePathId(path.id);
    setCurrentStepIndex(0);
    setIsLearning(true);
    
    if (onPathStart) {
      onPathStart(path);
    }
  }, [onPathStart]);

  // Handle step completion
  const handleStepComplete = useCallback((stepId: string) => {
    if (onStepComplete) {
      onStepComplete(stepId);
    }
    
    // Move to next step
    if (currentPath) {
      const currentIndex = currentPath.steps.findIndex(step => step.id === stepId);
      if (currentIndex < currentPath.steps.length - 1) {
        setCurrentStepIndex(currentIndex + 1);
      }
    }
  }, [onStepComplete, currentPath]);

  // Format time duration
  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 8); // 8 hours per day
    if (days < 30) return `${days} days`;
    const months = Math.round(days / 30);
    return `${months} months`;
  };

  // Format cost
  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    return `$${cost.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interactive Learning Paths</h2>
          <p className="text-muted-foreground">
            Personalized learning journeys tailored to your goals
          </p>
        </div>
        {currentPath && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {Math.round(pathProgress)}% Complete
            </Badge>
            <Badge>
              {formatTime(timeToCompletion)} remaining
            </Badge>
          </div>
        )}
      </div>

      {!currentPath ? (
        /* Path Selection */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockLearningPaths.map(path => (
            <Card key={path.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{path.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {path.description}
                  </p>
                  <Badge className="mb-3">{path.targetRole}</Badge>
                </div>
                <Badge variant={
                  path.difficulty === 'beginner' ? 'secondary' :
                  path.difficulty === 'intermediate' ? 'default' : 'destructive'
                }>
                  {path.difficulty}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(path.totalTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCost(path.totalCost)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>+${path.estimatedSalaryIncrease.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span>{path.roiScore.toFixed(1)}x ROI</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Learning Steps</span>
                  <span>{path.steps.length} steps</span>
                </div>
                <div className="flex gap-1">
                  {path.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`h-2 flex-1 rounded ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'in_progress' ? 'bg-blue-500' :
                        step.status === 'available' ? 'bg-yellow-500' :
                        'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => handlePathStart(path)}
                className="w-full"
                variant={path.id === 'fullstack-developer' ? 'default' : 'outline'}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Learning Path
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        /* Active Learning Path */
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Learning Steps</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{currentPath.title}</h3>
                  <p className="text-muted-foreground mb-4">{currentPath.description}</p>
                  <div className="flex items-center gap-4">
                    <Badge>{currentPath.targetRole}</Badge>
                    <Badge variant="secondary">{currentPath.difficulty}</Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setActivePathId(null)}
                  variant="outline"
                >
                  Change Path
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Time</span>
                  </div>
                  <div className="text-2xl font-bold">{formatTime(currentPath.totalTime)}</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Investment</span>
                  </div>
                  <div className="text-2xl font-bold">{formatCost(currentPath.totalCost)}</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Salary Boost</span>
                  </div>
                  <div className="text-2xl font-bold">+${(currentPath.estimatedSalaryIncrease / 1000).toFixed(0)}k</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">ROI Score</span>
                  </div>
                  <div className="text-2xl font-bold">{currentPath.roiScore.toFixed(1)}x</div>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(pathProgress)}% complete
                    </span>
                  </div>
                  <Progress value={pathProgress} className="h-2" />
                </div>

                {currentPath.milestones.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Upcoming Milestones</h4>
                    <div className="space-y-2">
                      {currentPath.milestones.map((milestone, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Award className="h-5 w-5 text-yellow-500" />
                          <div className="flex-1">
                            <div className="font-medium">{milestone.title}</div>
                            <div className="text-sm text-muted-foreground">{milestone.description}</div>
                          </div>
                          {milestone.reward && (
                            <Badge variant="outline">{milestone.reward}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Learning Steps Tab */}
          <TabsContent value="steps" className="space-y-4">
            {currentPath.steps.map((step, index) => (
              <Card key={step.id} className={`p-4 ${
                step.status === 'in_progress' ? 'border-primary' : ''
              }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : step.status === 'in_progress' ? (
                      <Circle className="h-5 w-5 text-blue-500" />
                    ) : step.status === 'available' ? (
                      <Circle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          step.type === 'skill' ? 'default' :
                          step.type === 'course' ? 'secondary' :
                          step.type === 'project' ? 'outline' : 'destructive'
                        }>
                          {step.type}
                        </Badge>
                        <Badge variant="outline">
                          {step.difficulty}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(step.estimatedTime)}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCost(step.cost)}
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {step.resources.length} resources
                      </div>
                    </div>

                    {step.progress !== undefined && step.status === 'in_progress' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Progress</span>
                          <span className="text-xs">{step.progress}%</span>
                        </div>
                        <Progress value={step.progress} className="h-1" />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {step.status === 'available' && (
                        <Button size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Start Step
                        </Button>
                      )}
                      {step.status === 'in_progress' && (
                        <>
                          <Button size="sm">
                            Continue Learning
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStepComplete(step.id)}
                          >
                            Mark Complete
                          </Button>
                        </>
                      )}
                      {step.status === 'completed' && (
                        <Badge className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {step.status === 'locked' && (
                        <Button size="sm" disabled>
                          Locked
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Learning Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    {currentPath.steps.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed Steps</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500 mb-1">
                    {currentPath.steps.filter(s => s.status === 'in_progress').length}
                  </div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground mb-1">
                    {currentPath.steps.filter(s => s.status === 'locked').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Time Investment</h4>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Hours completed</span>
                    <span>
                      {currentPath.steps
                        .filter(s => s.status === 'completed')
                        .reduce((total, step) => total + step.estimatedTime, 0)
                      } / {currentPath.totalTime}h
                    </span>
                  </div>
                  <Progress 
                    value={(currentPath.steps
                      .filter(s => s.status === 'completed')
                      .reduce((total, step) => total + step.estimatedTime, 0) / currentPath.totalTime) * 100} 
                    className="h-2" 
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Financial Investment</h4>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Amount invested</span>
                    <span>
                      ${currentPath.steps
                        .filter(s => s.status === 'completed')
                        .reduce((total, step) => total + step.cost, 0)
                      } / ${currentPath.totalCost}
                    </span>
                  </div>
                  <Progress 
                    value={(currentPath.steps
                      .filter(s => s.status === 'completed')
                      .reduce((total, step) => total + step.cost, 0) / currentPath.totalCost) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Learning Resources</h3>
              
              <div className="space-y-4">
                {currentPath.steps.map(step => (
                  <div key={step.id} className="border-b border-border last:border-b-0 pb-4 last:pb-0">
                    <h4 className="font-medium mb-2">{step.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {step.resources.map((resource, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">{resource.title}</div>
                              {resource.provider && (
                                <div className="text-xs text-muted-foreground">{resource.provider}</div>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              {resource.cost !== undefined && (
                                <span>{formatCost(resource.cost)}</span>
                              )}
                              {resource.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{resource.rating}</span>
                                </div>
                              )}
                            </div>
                            {resource.url && (
                              <Button size="sm" variant="outline" className="h-6 text-xs">
                                View
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};