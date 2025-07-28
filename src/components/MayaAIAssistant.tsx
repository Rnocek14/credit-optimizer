import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, X, Send, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  context?: {
    careerPath?: string;
    location?: string;
    activeTab?: string;
    marketData?: any;
    analysisData?: any;
  };
}

interface MayaAIAssistantProps {
  selectedCareerPath?: string;
  selectedLocation?: string;
  activeTab?: string;
  marketData?: any;
  analysisData?: any;
}

export function MayaAIAssistant({
  selectedCareerPath,
  selectedLocation,
  activeTab,
  marketData,
  analysisData
}: MayaAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Maya with context-aware greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getContextualGreeting();
      setMessages([{
        id: Date.now().toString(),
        content: greeting,
        role: 'assistant',
        timestamp: new Date(),
        context: {
          careerPath: selectedCareerPath,
          location: selectedLocation,
          activeTab,
          marketData
        }
      }]);
    }
  }, [isOpen, selectedCareerPath, selectedLocation, activeTab, marketData]);

  const getContextualGreeting = () => {
    const careerContext = selectedCareerPath ? ` for ${selectedCareerPath}` : '';
    const locationContext = selectedLocation ? ` in ${selectedLocation}` : '';
    
    switch (activeTab) {
      case 'overview':
        return `Hi! I'm Maya, your AI career intelligence assistant. I can see you're exploring the market overview${careerContext}${locationContext}. How can I help you understand these market insights better?`;
      case 'analysis':
        return `Hello! I'm Maya. I notice you're looking at detailed market analysis${careerContext}${locationContext}. I can help explain trends, suggest career moves, or dive deeper into any patterns you're seeing.`;
      case 'research':
        return `Hi there! I'm Maya, your market research companion. I can help you understand the research data${careerContext}${locationContext} and guide you to actionable insights.`;
      case 'alerts':
        return `Hello! I'm Maya. I can help you set up intelligent market alerts${careerContext}${locationContext} and explain any alert patterns you're seeing.`;
      default:
        return `Hi! I'm Maya, your AI career intelligence assistant. I'm here to help you navigate market trends, understand opportunities${careerContext}${locationContext}, and make smart career decisions. What would you like to explore?`;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
      context: {
        careerPath: selectedCareerPath,
        location: selectedLocation,
        activeTab,
        marketData,
        analysisData
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-mentor-chat', {
        body: {
          message: input.trim(),
          action: 'MARKET_INTELLIGENCE_CHAT',
          context: {
            careerPath: selectedCareerPath,
            location: selectedLocation,
            activeTab,
            marketData,
            analysisData,
            chatHistory: messages.slice(-10) // Send last 10 messages for context
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'I apologize, but I encountered an issue. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        context: {
          careerPath: selectedCareerPath,
          location: selectedLocation,
          activeTab,
          marketData
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message to Maya:', error);
      toast({
        title: 'Communication Error',
        description: 'Unable to reach Maya. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (selectedCareerPath) {
      actions.push(`Analyze ${selectedCareerPath} market trends`);
      actions.push(`What are the growth prospects for ${selectedCareerPath}?`);
    }
    
    if (marketData) {
      actions.push('Explain current market conditions');
      actions.push('Suggest optimal career moves');
    }
    
    actions.push('Help me understand this dashboard');
    actions.push('Set up market alerts');
    
    return actions;
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        size="icon"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
        </div>
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-[600px]'
    }`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Maya AI</CardTitle>
              <p className="text-xs text-muted-foreground">Market Intelligence Assistant</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!isMinimized && (
          <div className="flex gap-1 mt-2">
            {selectedCareerPath && (
              <Badge variant="secondary" className="text-xs">
                {selectedCareerPath}
              </Badge>
            )}
            {selectedLocation && (
              <Badge variant="outline" className="text-xs">
                {selectedLocation}
              </Badge>
            )}
            {activeTab && (
              <Badge variant="outline" className="text-xs capitalize">
                {activeTab}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-4 pt-0 flex flex-col h-[calc(100%-120px)]">
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {messages.length <= 1 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
              <div className="space-y-1">
                {getQuickActions().slice(0, 3).map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => setInput(action)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
              <Separator className="my-3" />
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Maya about market trends..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}