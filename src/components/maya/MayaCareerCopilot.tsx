import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, MessageCircle, Lightbulb, TrendingUp, Target, Clock } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

interface Message {
  id: string;
  type: 'user' | 'maya';
  content: string;
  timestamp: Date;
  insights?: any[];
  suggestions?: any[];
}

interface MayaCareerCopilotProps {
  userId: string;
}

export function MayaCareerCopilot({ userId }: MayaCareerCopilotProps) {
  const { profile: userProfile } = useUserProfile(userId);
  const { 
    sendEnhancedRequest, 
    getPersonalizedRecommendations,
    analyzeSkillGaps,
    askAboutCareerTransition,
    loading, 
    lastResponse 
  } = useEnhancedMaya();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    if (messages.length === 0 && userProfile) {
      setMessages([{
        id: '1',
        type: 'maya',
        content: `Hi ${userProfile.name || 'there'}! I'm Maya, your AI Career Co-Pilot. I'm here to help you navigate your career journey. How can I assist you today?`,
        timestamp: new Date()
      }]);
    }
  }, [userProfile, messages.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const context = {
        careerPath: userProfile?.current_role,
        location: userProfile?.location,
        goals: userProfile?.career_goals,
        skillLevel: userProfile?.experience_level === 'entry' ? 1 : userProfile?.experience_level === 'mid' ? 2 : 3
      };

      const response = await sendEnhancedRequest(inputText, context);
      
      if (response) {
        const mayaMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'maya',
          content: response.response,
          timestamp: new Date(),
          insights: response.requestAnalysis?.insights,
          suggestions: response.autonomousActions
        };

        setMessages(prev => [...prev, mayaMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'maya',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleQuickAction = async (action: string, prompt: string) => {
    setQuickActionLoading(action);
    
    try {
      let response;
      const context = {
        careerPath: userProfile?.current_role,
        location: userProfile?.location,
        goals: userProfile?.career_goals,
        skillLevel: userProfile?.experience_level === 'entry' ? 1 : userProfile?.experience_level === 'mid' ? 2 : 3
      };

      switch (action) {
        case 'recommendations':
          response = await getPersonalizedRecommendations();
          break;
        case 'skillgaps':
          response = await analyzeSkillGaps(userProfile?.current_role || 'Senior Role', userProfile?.skills || []);
          break;
        case 'transition':
          response = await askAboutCareerTransition(
            userProfile?.current_role || 'Product Manager', 
            userProfile?.location || 'United States',
            '6 months'
          );
          break;
        default:
          response = await sendEnhancedRequest(prompt, context);
      }

      if (response) {
        const actionMessage: Message = {
          id: Date.now().toString(),
          type: 'maya',
          content: response.response || response,
          timestamp: new Date(),
          insights: response.requestAnalysis?.insights,
          suggestions: response.autonomousActions
        };

        setMessages(prev => [...prev, actionMessage]);
      }
    } catch (error) {
      console.error('Quick action error:', error);
    } finally {
      setQuickActionLoading(null);
    }
  };

  const quickActions = [
    {
      id: 'recommendations',
      label: 'Get Recommendations',
      icon: Lightbulb,
      prompt: 'Give me personalized career recommendations based on my current profile and goals.'
    },
    {
      id: 'skillgaps',
      label: 'Analyze Skill Gaps',
      icon: Target,
      prompt: 'Analyze my skill gaps for my target role and suggest a learning path.'
    },
    {
      id: 'transition',
      label: 'Plan Transition',
      icon: TrendingUp,
      prompt: 'Help me plan my career transition with a detailed roadmap and timeline.'
    }
  ];

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
      {/* Modern Header */}
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Maya AI Co-Pilot
              </h3>
              <p className="text-sm text-muted-foreground">Intelligent career guidance at your fingertips</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
            <MessageCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Quick Actions Bar */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex gap-2 overflow-x-auto">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isLoading = quickActionLoading === action.id;
            
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                onClick={() => handleQuickAction(action.id, action.prompt)}
                disabled={loading || isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className={`relative max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg'
                    : 'bg-card border shadow-sm'
                } rounded-2xl p-4 transition-all duration-200 group-hover:shadow-md`}
              >
                {/* Maya Avatar for AI messages */}
                {message.type === 'maya' && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-primary mb-1">Maya</div>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* Enhanced Insights Display */}
                      {message.insights && message.insights.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.insights.slice(0, 3).map((insight, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-xs bg-primary/10 text-primary border-primary/20"
                            >
                              <Lightbulb className="w-3 h-3 mr-1" />
                              {insight.title || insight.type}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-1 mt-2 opacity-60">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* User message styling */}
                {message.type === 'user' && (
                  <div>
                    <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                    <div className="flex items-center gap-1 mt-2 opacity-70">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Enhanced Loading Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Modern Input Area */}
        <div className="border-t bg-gradient-to-r from-background to-muted/30 p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Maya anything about your career journey..."
                className="min-h-[44px] max-h-[120px] resize-none pr-12 border-2 border-muted focus:border-primary/50 rounded-xl bg-background/50 backdrop-blur-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {inputText.length > 0 && `${inputText.length} chars`}
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || loading}
              size="lg"
              className="h-[44px] w-[44px] rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}