import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Target, 
  TrendingUp,
  Clock,
  Brain,
  Sparkles
} from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';

interface MayaGoalAssistantProps {
  goalId: string;
  userId: string;
  goal: any;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export function MayaGoalAssistant({ goalId, userId, goal }: MayaGoalAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Maya, your AI career assistant. I'm here to help you achieve your goal: "${goal.title}". How can I assist you today?`,
      timestamp: new Date(),
      metadata: { type: 'greeting' }
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const { 
    sendEnhancedRequest, 
    loading, 
    error, 
    lastResponse,
    getResponseInsights
  } = useEnhancedMaya();

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await sendEnhancedRequest(
        `Context: I'm working on my career goal "${goal.title}" (target role: ${goal.target_role}). 
        
        User question: ${inputMessage}
        
        Please provide personalized advice and actionable recommendations for this specific goal.`,
        {
          careerPath: goal.target_role,
          goals: [{ target_role: goal.target_role }],
          skillLevel: 2
        }
      );

      if (response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          metadata: {
            hasMarketData: response.realTimeData?.marketData,
            autonomousActions: response.autonomousActions?.length || 0,
            insights: getResponseInsights()
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
        metadata: { type: 'error' }
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    {
      icon: <Target className="w-4 h-4" />,
      label: "Optimize my goal",
      message: "How can I optimize my current goal strategy for better results?"
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Market insights",
      message: "What are the current market trends for my target role?"
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: "Timeline advice",
      message: "Is my current timeline realistic? How can I improve it?"
    },
    {
      icon: <Lightbulb className="w-4 h-4" />,
      label: "Skill recommendations",
      message: "What skills should I focus on learning first?"
    }
  ];

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50">
        <CardHeader 
          className="cursor-pointer p-4" 
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Maya Goal Assistant</span>
            </div>
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  const insights = getResponseInsights();

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] z-50 flex flex-col">
      <CardHeader 
        className="cursor-pointer border-b" 
        onClick={() => setIsMinimized(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Maya Goal Assistant</CardTitle>
              <CardDescription className="text-xs">
                AI-powered career guidance
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {insights?.hasMarketData && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            )}
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                <div className={`p-3 rounded-lg text-sm ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  {message.content}
                </div>
                
                {message.metadata && message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.metadata.autonomousActions > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {message.metadata.autonomousActions} actions
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Maya is thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {error && (
        <Alert className="m-4 mb-2">
          <AlertDescription className="text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="border-t p-4 space-y-3">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setInputMessage(action.message)}
            >
              {action.icon}
              <span className="ml-1 truncate">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Maya about your goal..."
            className="text-sm"
            disabled={loading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputMessage.trim() || loading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}