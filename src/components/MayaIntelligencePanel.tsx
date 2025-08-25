import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Sparkles, Clock, Target } from 'lucide-react';
import { useEnhancedMaya, MayaContext } from '@/hooks/useEnhancedMaya';
import { useMayaProactiveInsights } from '@/hooks/useMayaProactiveInsights';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MayaIntelligencePanelProps {
  currentPath?: string;
  contextData?: any;
  compact?: boolean;
}

export const MayaIntelligencePanel: React.FC<MayaIntelligencePanelProps> = ({
  currentPath = "/plan",
  contextData,
  compact = false
}) => {
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { sendEnhancedRequest, loading, getResponseInsights } = useEnhancedMaya();
  const { insights, fetchInsights, generateInsights, dismissInsight } = useMayaProactiveInsights();

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('maya-manual-insights');
      
      if (error) {
        console.error('Error generating insights:', error);
        toast.error('Failed to generate insights. Please try again.');
        return;
      }

      if (data?.success) {
        setLastGenerated(new Date());
        await fetchInsights(); // Refresh insights
        toast.success(`Generated ${data.generatedCount} new insights!`);
      } else {
        toast.error(data?.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleAskMaya = async (question: string) => {
    const context: MayaContext = {
      careerPath: currentPath,
      location: 'Remote',
      goals: contextData?.goals || [],
      gamificationData: {
        currentStreak: 5,
        longestStreak: 10,
        streakMultiplier: 1.2,
        engagementMetrics: { level: 3, xp: 1200 }
      }
    };

    await sendEnhancedRequest(question, context);
    toast.success('Maya is analyzing your request...');
  };

  const responseInsights = getResponseInsights();
  
  const urgentInsights = insights.filter(i => i.priority === 'urgent').slice(0, 3);
  const mediumInsights = insights.filter(i => i.priority === 'medium').slice(0, compact ? 2 : 4);
  
  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Maya Insights</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {insights.length} active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {urgentInsights.length > 0 && (
            <div className="space-y-1">
              {urgentInsights.map(insight => (
                <div key={insight.id} className="flex items-start gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20">
                  <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">{insight.title}</p>
                </div>
              ))}
            </div>
          )}
          
          {mediumInsights.slice(0, 2).map(insight => (
            <div key={insight.id} className="flex items-start gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/20">
              <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">{insight.title}</p>
            </div>
          ))}
          
          <div className="flex gap-1 pt-1">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 text-xs flex-1"
              onClick={handleGenerateInsights}
              disabled={generating}
            >
              {generating ? <Clock className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 text-xs flex-1"
              onClick={() => handleAskMaya("What should I focus on for my career plan?")}
              disabled={loading}
            >
              <Brain className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Maya Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{insights.length} insights</Badge>
            {lastGenerated && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(lastGenerated).toLocaleTimeString()}
              </div>
            )}
            {responseInsights && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {Math.round(responseInsights.decisionConfidence * 100)}% confidence
              </Badge>
            )}
          </div>
        </div>
        {responseInsights && (
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Market Health</p>
                <Progress value={responseInsights.marketHealthScore} className="h-2" />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Skill Alignment</p>
                <Progress value={responseInsights.skillAlignment} className="h-2" />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Career Readiness</p>
                <Progress value={responseInsights.careerReadiness} className="h-2" />
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Insights */}
        {urgentInsights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="font-medium text-orange-700 dark:text-orange-300">Urgent Actions</h4>
            </div>
            {urgentInsights.map(insight => (
              <div key={insight.id} className="flex items-start justify-between gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">{insight.title}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{insight.content || insight.title}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => dismissInsight(insight.id)}
                  className="text-orange-500 hover:text-orange-700"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Medium Priority Insights */}
        {mediumInsights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <h4 className="font-medium">Recommendations</h4>
            </div>
            {mediumInsights.map(insight => (
              <div key={insight.id} className="flex items-start justify-between gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">{insight.title}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{insight.content || insight.title}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => dismissInsight(insight.id)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleGenerateInsights}
            disabled={generating}
            className="flex-1"
            variant="outline"
          >
            {generating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Insights
              </>
            )}
          </Button>
          <Button 
            onClick={() => handleAskMaya("Based on my current plan, what should I prioritize next?")}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            <Target className="h-4 w-4 mr-2" />
            Ask Maya
          </Button>
        </div>

        {lastGenerated && (
          <p className="text-xs text-muted-foreground">
            Last generated: {lastGenerated.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};