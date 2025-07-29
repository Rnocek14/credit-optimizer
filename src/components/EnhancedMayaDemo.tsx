import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { Brain, TrendingUp, Target, AlertCircle } from 'lucide-react';

export function EnhancedMayaDemo() {
  const [request, setRequest] = useState('');
  const { 
    sendEnhancedRequest, 
    askAboutCareerTransition,
    loading, 
    lastResponse, 
    getResponseInsights 
  } = useEnhancedMaya();

  const insights = getResponseInsights();

  const handleQuickRequest = (type: string) => {
    switch (type) {
      case 'transition':
        askAboutCareerTransition('Senior Product Manager', 'United States', '3 months');
        break;
      case 'analysis':
        sendEnhancedRequest('Analyze current market trends for software engineers and provide salary insights');
        break;
      case 'skills':
        sendEnhancedRequest('What skills do I need to become a data scientist? Create a learning plan.');
        break;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Enhanced Maya AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Ask Maya anything about your career..."
              className="flex-1"
            />
            <Button 
              onClick={() => sendEnhancedRequest(request)}
              disabled={loading || !request.trim()}
            >
              Ask Maya
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickRequest('transition')}
              disabled={loading}
            >
              Career Transition Demo
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickRequest('analysis')}
              disabled={loading}
            >
              Market Analysis
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleQuickRequest('skills')}
              disabled={loading}
            >
              Skill Planning
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{lastResponse.response}</p>
            </div>

            {insights && (
              <div className="flex gap-2 flex-wrap">
                {insights.hasMarketData && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Market Data
                  </Badge>
                )}
                {insights.hasSkillAnalysis && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Skill Analysis
                  </Badge>
                )}
                {insights.workflowCreated && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Workflow Created
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}