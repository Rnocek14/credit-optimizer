import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Bot, 
  User, 
  Target, 
  TrendingUp, 
  Star, 
  BookOpen,
  Award,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface UserContext {
  currentXP: number;
  currentLevel: number;
  nextLevelXP: number;
  suggestedSkill: string;
  skillGaps: string[];
  savedItems: number;
  publishedResume: boolean;
  criScore: number;
  nextGoal: string;
  recentActions: string[];
}

export default function MentorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUserContext();
    loadMockChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mock user context for now - replace with real data
      setUserContext({
        currentXP: 1250,
        currentLevel: 3,
        nextLevelXP: 1500,
        suggestedSkill: 'React Hooks',
        skillGaps: ['Advanced JavaScript', 'Backend APIs', 'Database Design'],
        savedItems: 12,
        publishedResume: true,
        criScore: 78,
        nextGoal: 'Complete Frontend Fundamentals',
        recentActions: [
          'Completed "JavaScript Basics" course',
          'Earned "First Steps" badge',
          'Updated profile information'
        ]
      });
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  };

  const loadMockChatHistory = () => {
    const mockMessages: Message[] = [
      {
        id: '1',
        content: "👋 Hey there! I'm Maya, your AI mentor. I've analyzed your progress and I'm excited to help you reach your goals! You're currently at Level 3 with 1,250 XP - great momentum!",
        role: 'assistant',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: '2',
        content: "Based on your skill tree, I recommend focusing on **React Hooks** next. It'll unlock Layer 4 and boost your frontend expertise. Want me to suggest some courses?",
        role: 'assistant',
        timestamp: new Date(Date.now() - 1000 * 60 * 4)
      },
      {
        id: '3',
        content: "That sounds perfect! What are the best React Hooks courses you'd recommend?",
        role: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 3)
      },
      {
        id: '4',
        content: "Excellent choice! Here are my top 3 picks:\n\n🎯 **React Hooks Masterclass** (Coursera)\n- 40 XP reward\n- CRI boost: +5 points\n- Duration: 3 weeks\n- Perfect for your current level\n\n📚 **Modern React Development** (Udemy)\n- 35 XP reward\n- Hands-on projects\n- Duration: 2 weeks\n\n🚀 **Advanced React Patterns** (FreeCodeCamp)\n- 25 XP reward\n- Free course\n- Duration: 1 week\n\nShall I add any of these to your saved items?",
        role: 'assistant',
        timestamp: new Date(Date.now() - 1000 * 60 * 2)
      }
    ];
    setMessages(mockMessages);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Mock AI response - replace with real GPT-4o call
    setTimeout(() => {
      const responses = [
        "That's a great question! Based on your current progress at Level 3, I'd suggest focusing on practical projects to solidify your React knowledge. Have you considered building a portfolio project?",
        "I see you have 12 saved items! That shows great planning. Which one feels most exciting to start with? I can help you create a learning schedule.",
        "Your CRI score of 78 is impressive! To boost it further, consider adding more verified projects to your resume. What type of project interests you most?",
        "Looking at your skill gaps, I notice Backend APIs is on the list. Once you master React Hooks, that would be a natural next step. Should we plan that pathway?"
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const progressPercentage = userContext ? (userContext.currentXP / userContext.nextLevelXP) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          
          {/* Sidebar Context Panel */}
          <div className="lg:col-span-1 space-y-4">
            {userContext && (
              <>
                {/* XP Progress */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Level {userContext.currentLevel}</span>
                        <span className="text-sm text-muted-foreground">
                          {userContext.currentXP} / {userContext.nextLevelXP} XP
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">{userContext.criScore}</div>
                        <div className="text-muted-foreground">CRI Score</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">{userContext.savedItems}</div>
                        <div className="text-muted-foreground">Saved Items</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Goal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Next Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{userContext.nextGoal}</p>
                    <Badge variant="outline" className="mt-2">
                      <Star className="h-3 w-3 mr-1" />
                      Suggested: {userContext.suggestedSkill}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Recent Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Recent Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userContext.recentActions.map((action, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {action}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Skill Gaps */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Skill Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userContext.skillGaps.map((gap, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
                      Your personalized career guidance assistant
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
                    placeholder="Ask Maya about your career path, skill gaps, or next steps..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    size="icon"
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