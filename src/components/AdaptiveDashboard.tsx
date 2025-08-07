import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, ArrowRight, TrendingUp, Target, BookOpen, 
  Brain, Zap, CheckCircle, Clock, Star, Users
} from "lucide-react";
import { useUserJourney } from "@/contexts/UserJourneyContext";
import { useNavigate } from "react-router-dom";
import { useModelRouter } from "@/hooks/useModelRouter";

export function AdaptiveDashboard() {
  const { state, actions } = useUserJourney();
  const navigate = useNavigate();
  const { callRouter } = useModelRouter();
  const [mayaInsights, setMayaInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    generateMayaInsights();
  }, [state.currentPhase, state.role, state.goals]);

  const generateMayaInsights = async () => {
    if (!state.user) return;

    setIsLoadingInsights(true);
    try {
      const prompt = `
        As Maya, the AI career guide, provide personalized insights for this user:
        
        Role: ${state.role}
        Phase: ${state.currentPhase}
        Goals: ${state.goals.join(', ')}
        Completed Steps: ${state.completedSteps.length}
        
        Generate:
        1. A personalized welcome message (conversational, encouraging)
        2. Top 3 priority actions for today
        3. Weekly focus area
        4. Motivational insight based on their progress
        5. Feature recommendations
        
        Return as JSON with keys: welcomeMessage, priorityActions, weeklyFocus, insight, features
      `;

      const response = await callRouter({
        task: 'chat',
        messages: [{ role: 'user', content: prompt }]
      });

      try {
        const insights = JSON.parse(response.message?.content || '{}');
        setMayaInsights(insights);
      } catch {
        // Fallback if JSON parsing fails
        setMayaInsights({
          welcomeMessage: "Welcome back! Let's continue building your career path.",
          priorityActions: ["Complete your profile", "Take a skill assessment", "Explore career paths"],
          weeklyFocus: "Skill Development",
          insight: "You're making great progress!",
          features: ["resume-builder", "skill-tree", "market-intelligence"]
        });
      }
    } catch (error) {
      console.error('Error generating Maya insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const getPhaseProgress = () => {
    const phases = ['discovery', 'assessment', 'planning', 'execution', 'optimization'];
    const currentIndex = phases.indexOf(state.currentPhase);
    return ((currentIndex + 1) / phases.length) * 100;
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'discovery': return Target;
      case 'assessment': return BookOpen;
      case 'planning': return Brain;
      case 'execution': return Zap;
      case 'optimization': return TrendingUp;
      default: return Sparkles;
    }
  };

  const handleFeatureClick = (feature: string) => {
    actions.trackFeatureEngagement(feature);
    
    const featureRoutes: Record<string, string> = {
      'resume-builder': '/resume-builder',
      'skill-tree': '/skill-tree',
      'market-intelligence': '/market-intelligence',
      'career-planning': '/planner',
      'course-recommendations': '/explore-courses',
      'maya-chat': '/mentor',
      'timeline-planning': '/timeline',
      'phase-progression': `/phase${Math.min(7, 4 + ['discovery', 'assessment', 'planning', 'execution', 'optimization'].indexOf(state.currentPhase))}`
    };

    const route = featureRoutes[feature];
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="space-y-6">
      {/* Maya Welcome Section */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                Maya's Insights
                {isLoadingInsights && <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />}
              </h2>
              <p className="text-muted-foreground mb-4">
                {mayaInsights?.welcomeMessage || "Welcome back! Let's continue building your career path."}
              </p>
              {mayaInsights?.insight && (
                <div className="bg-white/50 rounded-lg p-3 border border-primary/20">
                  <p className="text-sm font-medium text-primary">💡 {mayaInsights.insight}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Journey Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{state.currentPhase} Phase</span>
            <Badge variant="secondary">{Math.round(getPhaseProgress())}% Complete</Badge>
          </div>
          <Progress value={getPhaseProgress()} className="h-2" />
          
          <div className="grid grid-cols-5 gap-2 mt-4">
            {['discovery', 'assessment', 'planning', 'execution', 'optimization'].map((phase, index) => {
              const Icon = getPhaseIcon(phase);
              const isActive = phase === state.currentPhase;
              const isCompleted = ['discovery', 'assessment', 'planning', 'execution', 'optimization'].indexOf(state.currentPhase) > index;
              
              return (
                <div key={phase} className="text-center">
                  <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                    isActive ? 'bg-primary text-white' : 
                    isCompleted ? 'bg-green-100 text-green-600' : 
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs capitalize">{phase}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(mayaInsights?.priorityActions || ['Complete your profile', 'Take assessment', 'Set goals']).map((action: string, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <span className="text-sm">{action}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              This Week's Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                {mayaInsights?.weeklyFocus || 'Skill Development'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Focus on building the skills that matter most for your goals
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recommended for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {state.availableFeatures.slice(0, 6).map((feature) => {
              const featureConfig = getFeatureConfig(feature);
              if (!featureConfig) return null;
              
              return (
                <Card 
                  key={feature} 
                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                  onClick={() => handleFeatureClick(feature)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 ${featureConfig.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <featureConfig.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{featureConfig.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{featureConfig.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {state.featureEngagement[feature] || 0} times used
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{state.completedSteps.length}</div>
            <div className="text-sm text-muted-foreground">Steps Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{state.goals.length}</div>
            <div className="text-sm text-muted-foreground">Active Goals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{state.availableFeatures.length}</div>
            <div className="text-sm text-muted-foreground">Available Features</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {Object.values(state.milestones).filter(Boolean).length}
            </div>
            <div className="text-sm text-muted-foreground">Milestones</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getFeatureConfig(feature: string) {
  const configs: Record<string, any> = {
    'resume-analysis': {
      title: 'Resume Analysis',
      description: 'Get AI feedback on your resume',
      icon: BookOpen,
      color: 'bg-blue-500'
    },
    'skill-assessment': {
      title: 'Skill Assessment',
      description: 'Evaluate your current abilities',
      icon: Target,
      color: 'bg-green-500'
    },
    'maya-chat': {
      title: 'Chat with Maya',
      description: 'Get personalized career advice',
      icon: Sparkles,
      color: 'bg-purple-500'
    },
    'career-planning': {
      title: 'Career Planning',
      description: 'Build your career roadmap',
      icon: Brain,
      color: 'bg-orange-500'
    },
    'skill-tree': {
      title: 'Skill Tree',
      description: 'Visualize your learning path',
      icon: TrendingUp,
      color: 'bg-teal-500'
    },
    'market-intelligence': {
      title: 'Market Intelligence',
      description: 'Explore career opportunities',
      icon: Users,
      color: 'bg-pink-500'
    }
  };
  
  return configs[feature];
}