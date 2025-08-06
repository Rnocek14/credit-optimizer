import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Brain, 
  Route, 
  TrendingUp, 
  Target, 
  Star,
  CheckCircle,
  Clock,
  Award,
  Users
} from 'lucide-react';
import { EnhancedUserProfile } from '@/components/EnhancedUserProfile';
import { PersonalizedPathGenerator } from '@/components/PersonalizedPathGenerator';
import { AdaptiveLearningTracker } from '@/components/AdaptiveLearningTracker';
import { InteractiveLearningPaths } from '@/components/InteractiveLearningPaths';
import { IntelligentLearningPathManager } from '@/components/IntelligentLearningPathManager';
import { MayaGoalAssistant } from '@/components/MayaGoalAssistant';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

export default function Phase2Dashboard() {
  const { state } = useUnifiedData();
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [generatedPath, setGeneratedPath] = useState<any>(null);
  
  // Mock user ID for demo - in real app this would come from authentication
  const userId = state.user?.id || '2b458624-d498-4cca-a63d-9341cc20e363';

  const handleProfileUpdated = () => {
    console.log('Profile updated - refreshing recommendations');
  };

  const handlePathGenerated = (path: any) => {
    setGeneratedPath(path);
    console.log('New path generated:', path);
  };

  const phases = [
    { 
      id: 'profile', 
      name: 'Enhanced Profile', 
      completed: false, 
      description: 'Detailed learning preferences and skill assessment',
      icon: <User className="w-5 h-5" />
    },
    { 
      id: 'ai-paths', 
      name: 'AI Path Generation', 
      completed: false, 
      description: 'Personalized learning paths powered by AI',
      icon: <Brain className="w-5 h-5" />
    },
    { 
      id: 'interactive', 
      name: 'Interactive Learning', 
      completed: false, 
      description: 'Engaging, step-by-step learning experiences',
      icon: <Route className="w-5 h-5" />
    },
    { 
      id: 'adaptive', 
      name: 'Adaptive Tracking', 
      completed: false, 
      description: 'AI-powered progress optimization',
      icon: <TrendingUp className="w-5 h-5" />
    },
    { 
      id: 'maya', 
      name: 'Maya Integration', 
      completed: false, 
      description: 'Conversational AI for personalized guidance',
      icon: <Star className="w-5 h-5" />
    },
    { 
      id: 'social', 
      name: 'Social Learning', 
      completed: false, 
      description: 'Collaborative learning and mentorship',
      icon: <Users className="w-5 h-5" />
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
          <Brain className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Phase 2: Personalized AI Learning Paths</span>
        </div>
        <h1 className="text-4xl font-bold">Intelligent Learning Experience</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Experience AI-powered personalization that adapts to your learning style, pace, and career goals
        </p>
      </div>

      {/* Phase Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Phase 2 Progress Overview
          </CardTitle>
          <CardDescription>
            Track your progress through the Personalized AI Learning Paths implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phases.map((phase) => (
              <Card key={phase.id} className={`p-4 ${phase.completed ? 'bg-green-50 border-green-200' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${phase.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {phase.completed ? <CheckCircle className="w-5 h-5" /> : phase.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{phase.name}</h3>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                    {phase.completed && (
                      <Badge className="mt-2" variant="secondary">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>25% Complete</span>
            </div>
            <Progress value={25} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Main Functionality Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="ai-generator" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Route className="w-4 h-4" />
            Interactive
          </TabsTrigger>
          <TabsTrigger value="adaptive" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Adaptive
          </TabsTrigger>
          <TabsTrigger value="path-manager" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Path Manager
          </TabsTrigger>
          <TabsTrigger value="maya" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Maya
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <EnhancedUserProfile 
            userId={userId} 
            onProfileUpdated={handleProfileUpdated}
          />
        </TabsContent>

        <TabsContent value="ai-generator" className="space-y-6">
          <PersonalizedPathGenerator 
            userId={userId}
            onPathGenerated={handlePathGenerated}
          />
        </TabsContent>

        <TabsContent value="interactive" className="space-y-6">
          <InteractiveLearningPaths 
            userSkills={['JavaScript', 'React', 'Node.js']}
            targetRole="Full-Stack Developer"
            selectedPath={generatedPath}
            onPathStart={(path) => console.log('Started path:', path)}
            onStepComplete={(stepId) => console.log('Completed step:', stepId)}
          />
        </TabsContent>

        <TabsContent value="adaptive" className="space-y-6">
          <AdaptiveLearningTracker 
            userId={userId}
            currentPath={generatedPath}
          />
        </TabsContent>

        <TabsContent value="path-manager" className="space-y-6">
          {selectedGoal ? (
            <IntelligentLearningPathManager 
              goalId={selectedGoal.id}
              userId={userId}
              goal={selectedGoal}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Goal Selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a career goal to generate intelligent learning paths
                </p>
                <div className="space-y-2">
                  {['Full-Stack Developer', 'Data Scientist', 'Product Manager'].map((role) => (
                    <Card 
                      key={role} 
                      className="p-3 cursor-pointer hover:bg-primary/5"
                      onClick={() => setSelectedGoal({ 
                        id: `goal_${role.toLowerCase().replace(/\s+/g, '_')}`, 
                        target_role: role,
                        title: `Become a ${role}`
                      })}
                    >
                      <div className="text-sm font-medium">{role}</div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maya" className="space-y-6">
          {selectedGoal ? (
            <MayaGoalAssistant 
              goalId={selectedGoal.id}
              userId={userId}
              goal={selectedGoal}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Maya Assistant Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Select a goal from the Path Manager tab to start conversational AI assistance
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Success Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 2 Success Metrics</CardTitle>
          <CardDescription>
            Key indicators of personalized learning effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">45%</div>
              <div className="text-xs text-muted-foreground">Faster Learning</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">92%</div>
              <div className="text-xs text-muted-foreground">Goal Alignment</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">78%</div>
              <div className="text-xs text-muted-foreground">Engagement Rate</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">85%</div>
              <div className="text-xs text-muted-foreground">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}