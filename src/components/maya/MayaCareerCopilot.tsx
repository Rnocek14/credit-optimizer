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
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Maya Career Co-Pilot</h3>
              <p className="text-sm text-muted-foreground">Your AI-powered career guidance assistant</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Online
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isLoading = quickActionLoading === action.id;
              
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center gap-2 text-center"
                  onClick={() => handleQuickAction(action.id, action.prompt)}
                  disabled={loading || isLoading}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{action.label}</span>
                  {isLoading && <div className="text-xs text-muted-foreground">Processing...</div>}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'maya' && (
                      <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span className="text-xs opacity-60">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Display insights if available */}
                      {message.insights && message.insights.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.insights.slice(0, 2).map((insight, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {insight.title || insight.type}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Maya anything about your career..."
                className="flex-1 min-h-[40px] max-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || loading}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}