import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, Sparkles, User } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { getCurrentUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'maya';
  content: string;
  timestamp: string;
  confidence?: number;
  primaryFactors?: string[];
}

interface MayaChatInterfaceProps {
  className?: string;
  onInsightGenerated?: (insight: any) => void;
}

export function MayaChatInterface({ className, onInsightGenerated }: MayaChatInterfaceProps) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });

  const {
    sendEnhancedRequest,
    getPersonalizedRecommendations,
    loading,
    error,
    getResponseInsights
  } = useEnhancedMaya();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'maya',
      content: `Hello${user?.name ? ` ${user.name}` : ''}! I'm Maya, your AI career intelligence assistant. I'm here to help you navigate your career path with personalized insights and real-time market intelligence. What would you like to explore today?`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const response = await sendEnhancedRequest(inputValue.trim());
      
      if (response) {
        const insights = getResponseInsights();
        
        const mayaMessage: Message = {
          id: crypto.randomUUID(),
          type: 'maya',
          content: response.response,
          timestamp: response.timestamp,
          confidence: insights?.decisionConfidence,
          primaryFactors: insights?.primaryFactors
        };

        setMessages(prev => [...prev, mayaMessage]);

        // Notify parent if insight was generated
        if (onInsightGenerated && insights) {
          onInsightGenerated(insights);
        }
      }
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'maya',
        content: "I'm experiencing some technical difficulties. Let me try a different approach - could you rephrase your question?",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleQuickAction = async (action: string) => {
    setInputValue(action);
    
    // Auto-send quick actions
    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: action,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      let response;
      if (action.includes('personalized recommendations')) {
        response = await getPersonalizedRecommendations();
      } else {
        response = await sendEnhancedRequest(action);
      }
      
      if (response) {
        const insights = getResponseInsights();
        
        const mayaMessage: Message = {
          id: crypto.randomUUID(),
          type: 'maya',
          content: response.response,
          timestamp: response.timestamp,
          confidence: insights?.decisionConfidence,
          primaryFactors: insights?.primaryFactors
        };

        setMessages(prev => [...prev, mayaMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'maya',
        content: "I'm having trouble processing that request right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const quickActions = [
    "What are my top 3 personalized recommendations for the next 6 months?",
    "Analyze my skill gaps and create a learning plan",
    "Show me current market trends for my career path",
    "Help me plan a career transition"
  ];

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          Chat with Maya
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Live AI
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 gap-4 min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'maya' && (
                <div className="flex-shrink-0 p-1.5 rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="space-y-2">
                  <p className="leading-relaxed">{message.content}</p>
                  
                  {message.type === 'maya' && message.confidence && (
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span>Confidence: {Math.round(message.confidence)}%</span>
                      {message.primaryFactors && message.primaryFactors.length > 0 && (
                        <span>• Key factors: {message.primaryFactors.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="flex-shrink-0 p-1.5 rounded-full bg-primary/10">
                  <User className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 p-1.5 rounded-full bg-primary/10">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick Actions:</p>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 text-left justify-start"
                  onClick={() => handleQuickAction(action)}
                  disabled={loading}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Maya about your career..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
            className="text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || loading}
            size="sm"
            className="px-3 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}