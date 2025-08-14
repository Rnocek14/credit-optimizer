import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Bot, 
  User, 
  Target, 
  TrendingUp, 
  Star, 
  BookOpen,
  Award,
  MessageSquare,
  Sparkles,
  Trophy,
  CheckCircle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { HubNavigation } from '@/components/HubNavigation';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface UserContext {
  profile: any;
  level: any;
  goals: any[];
  savedCount: number;
  hasPublishedResume: boolean;
  criScore: number;
  readinessScore: number;
  recentActions: any[];
  recentBadges: any[];
  milestonePlans: any[];
}

interface LevelMilestone {
  level: number;
  title: string;
  description: string;
}

interface MilestonePlan {
  id: string;
  title: string;
  description: string;
  steps: any[];
  status: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export default function MentorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState(false);
  const [showPlanCelebration, setShowPlanCelebration] = useState(false);
  const [milestonePlans, setMilestonePlans] = useState<MilestonePlan[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const levelMilestones: LevelMilestone[] = [
    { level: 5, title: "Rising Star", description: "You're gaining momentum!" },
    { level: 10, title: "Dedicated Learner", description: "Consistency is your superpower!" },
    { level: 20, title: "Skill Master", description: "You're becoming an expert!" },
    { level: 30, title: "Mentor Material", description: "Others look up to your expertise!" },
  ];

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      setCurrentUser(user);
      await loadUserContext(user.id);
      await loadMilestonePlans(user.id);
      await loadWelcomeMessage(user.id);
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserContext = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: { 
          message: 'FETCH_CONTEXT_ONLY', 
          userId: userId 
        }
      });

      if (error) {
        console.error('Error loading user context:', error);
        throw error;
      }
      
      if (data?.userContext) {
        setUserContext(data.userContext);
        
        // Check for level-up celebration
        const currentLevel = data.userContext.level?.current_level || 1;
        const milestone = levelMilestones.find(m => m.level === currentLevel);
        if (milestone && currentLevel > 1) {
          setShowLevelUpCelebration(true);
          setTimeout(() => setShowLevelUpCelebration(false), 5000);
        }
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  };

  const loadMilestonePlans = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: { 
          action: 'GET_MILESTONE_PLANS',
          userId: userId 
        }
      });

      if (error) {
        console.error('Error loading milestone plans:', error);
        throw error;
      }
      
      if (data?.plans) {
        setMilestonePlans(data.plans);
      }
    } catch (error) {
      console.error('Error loading milestone plans:', error);
    }
  };

  const loadWelcomeMessage = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: { 
          message: "Hi Maya! I just opened the chat. Can you give me a personalized welcome based on my current progress and suggest what I should focus on next?", 
          userId: userId 
        }
      });

      if (error) {
        console.error('Error loading welcome message:', error);
        throw error;
      }

      const welcomeMessage: Message = {
        id: '1',
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error loading welcome message:', error);
      // Fallback welcome message
      const fallbackMessage: Message = {
        id: '1',
        content: "👋 Hey there! I'm Maya, your AI mentor. I'm here to help you navigate your learning journey and reach your career goals. What would you like to work on today?",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([fallbackMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to chat with Maya.",
        variant: "destructive"
      });
      return;
    }

    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    const messageToSend = input;
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: { 
          message: messageToSend, 
          userId: currentUser.id 
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update user context if provided
      if (data.userContext) {
        setUserContext(data.userContext);
      }

      // Handle new milestone plan creation
      if (data.milestonePlan) {
        await loadMilestonePlans(currentUser.id);
        toast({
          title: "🎯 New Milestone Plan Created!",
          description: `"${data.milestonePlan.title}" has been added to your plans.`,
        });
      }

      // Check for celebration triggers
      if (data.shouldTriggerCelebration) {
        setShowPlanCelebration(true);
        setTimeout(() => setShowPlanCelebration(false), 4000);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      
      // Add fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting right now. Please try your question again in a moment!",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const updateMilestoneStep = async (planId: string, stepIndex: number, completed: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: { 
          action: 'UPDATE_MILESTONE_STEP',
          planId: planId,
          stepIndex: stepIndex,
          completed: completed,
          userId: currentUser?.id 
        }
      });

      if (error) throw error;

      // Refresh milestone plans
      await loadMilestonePlans(currentUser.id);

      if (data.celebrated) {
        setShowPlanCelebration(true);
        setTimeout(() => setShowPlanCelebration(false), 4000);
        toast({
          title: "🎉 Plan Completed!",
          description: "Congratulations on finishing your milestone plan!",
        });
      } else {
        toast({
          title: completed ? "✅ Step Completed!" : "⏳ Step Reopened",
          description: completed ? "Great progress on your milestone!" : "Step marked as incomplete.",
        });
      }
    } catch (error) {
      console.error('Error updating milestone step:', error);
      toast({
        title: "Error",
        description: "Failed to update step. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const formatRecentAction = (action: any) => {
    return action.reason || 'Recent activity';
  };

  const progressPercentage = userContext?.level ? 
    ((userContext.level.total_xp - (userContext.level.xp_for_current_level || 0)) / 
     ((userContext.level.xp_for_next_level || 100) - (userContext.level.xp_for_current_level || 0))) * 100 : 0;

  const currentMilestone = userContext?.level ? 
    levelMilestones.find(m => m.level === userContext.level.current_level) : null;

  const renderMilestonePlan = (plan: MilestonePlan) => {
    const isExpanded = expandedPlans.has(plan.id);
    const completedSteps = plan.steps.filter(step => step.completed).length;
    
    return (
      <Card key={plan.id} className={`mb-4 ${plan.status === 'completed' ? 'bg-green-50 border-green-200' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${plan.status === 'completed' ? 'bg-green-500' : plan.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'}`} />
              <CardTitle className="text-base">{plan.title}</CardTitle>
              {plan.status === 'completed' && <Trophy className="h-4 w-4 text-yellow-500" />}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePlanExpansion(plan.id)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(plan.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {completedSteps}/{plan.steps.length} steps
            </div>
          </div>
          <Progress value={plan.completion_percentage} className="h-2" />
        </CardHeader>
        
        {isExpanded && (
          <CardContent>
            <div className="space-y-3">
              {plan.steps.map((step: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                  <Checkbox
                    checked={step.completed}
                    onCheckedChange={(checked) => updateMilestoneStep(plan.id, index, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                        {step.description}
                      </div>
                    )}
                    {step.completed && step.completedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        ✅ Completed {new Date(step.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <HubNavigation />
      
      {/* Plan Completion Celebration */}
      {showPlanCelebration && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-96 mx-4 bg-gradient-to-br from-green-100 to-emerald-50 border-green-200">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <div className="flex justify-center space-x-2">
                  <Sparkles className="h-8 w-8 text-green-500 animate-pulse" />
                  <Trophy className="h-12 w-12 text-yellow-500 animate-bounce" />
                  <Sparkles className="h-8 w-8 text-green-500 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-green-800">Amazing Progress!</h2>
              <p className="text-green-700 mb-4">You're making incredible strides in your learning journey!</p>
              <Button 
                onClick={() => setShowPlanCelebration(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Keep Going!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          
          {/* Sidebar Context Panel with Tabs */}
          <div className="lg:col-span-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat" className="text-xs">💬 Context</TabsTrigger>
                <TabsTrigger value="plans" className="text-xs">📘 My Plans</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="space-y-4 mt-4">
            {userContext && (
              <>
                {/* XP Progress */}
                <Card className={currentMilestone ? 'ring-2 ring-primary ring-opacity-50' : ''}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Your Progress
                      {currentMilestone && (
                        <Badge variant="default" className="ml-auto">
                          <Trophy className="h-3 w-3 mr-1" />
                          {currentMilestone.title}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Level {userContext.level?.current_level || 1}</span>
                        <span className="text-sm text-muted-foreground">
                          {userContext.level?.total_xp || 0} / {userContext.level?.xp_for_next_level || 100} XP
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(((userContext.level?.xp_for_next_level || 100) - (userContext.level?.total_xp || 0)))} XP to next level
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">
                          {userContext.criScore > 0 ? Math.round(userContext.criScore) : 'N/A'}
                        </div>
                        <div className="text-muted-foreground">CRI Score</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">{userContext.savedCount}</div>
                        <div className="text-muted-foreground">Saved Items</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Goal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Current Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {userContext.goals?.[0]?.title || 'Set your first goal to get started!'}
                    </p>
                    {userContext.goals?.[0]?.target_role && (
                      <Badge variant="outline" className="mt-2">
                        <Star className="h-3 w-3 mr-1" />
                        Target: {userContext.goals[0].target_role}
                      </Badge>
                    )}
                    {!userContext.hasPublishedResume && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        💡 Consider publishing your resume to boost visibility
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userContext.recentActions?.length > 0 ? (
                        userContext.recentActions.slice(0, 3).map((action, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            • {formatRecentAction(action)}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Start learning to see your activity here!
                        </div>
                      )}
                    </div>
                    
                    {/* Recent Badges */}
                    {userContext.recentBadges?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs font-medium mb-2">Recent Badges:</div>
                        <div className="flex gap-1 flex-wrap">
                          {userContext.recentBadges.slice(0, 3).map((badge, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {badge.badges?.emoji} {badge.badges?.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Skills & Gaps */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Skills Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Current Skills */}
                    {userContext.profile?.skills && userContext.profile.skills.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium mb-2">Current Skills:</div>
                        <div className="space-y-1">
                          {userContext.profile.skills.slice(0, 4).map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs mr-1">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Readiness Score */}
                    {userContext.readinessScore > 0 && (
                      <div className="mt-3 p-2 bg-muted rounded">
                        <div className="text-xs font-medium">Career Readiness</div>
                        <div className="text-lg font-bold text-primary">
                          {Math.round(userContext.readinessScore)}%
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </>
              )}
              </TabsContent>
              
              <TabsContent value="plans" className="mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Milestone Plans
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        {milestonePlans.length > 0 ? (
                          milestonePlans.map(renderMilestonePlan)
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No milestone plans yet.</p>
                            <p className="text-sm mt-2">Ask Maya to "Plan my next steps" to get started!</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/mentor-avatar.png" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      <Bot className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">Maya AI Mentor</h2>
                    <p className="text-sm text-muted-foreground">
                      Your personalized career guidance assistant with long-term memory
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full px-6 py-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                              <Bot className="h-4 w-4 text-white" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground ml-12'
                              : 'bg-muted mr-12'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              message.role === 'user'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {message.role === 'user' && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                            <Bot className="h-4 w-4 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>

              {/* Input Area */}
              <Separator />
              <div className="p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Maya about your progress, plans, or say 'Plan my next steps'..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleButtonClick}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    type="submit"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
