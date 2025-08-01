import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAINarrativeEngine } from '@/hooks/useAINarrativeEngine';
import type { SemanticPath, SemanticNode } from '@/types/semantic';
import { 
  Bot, 
  Lightbulb, 
  TrendingUp, 
  MessageCircle, 
  X,
  Minimize2,
  Maximize2,
  HelpCircle
} from 'lucide-react';

interface ContextualAIAssistantProps {
  currentPath?: SemanticPath | null;
  selectedNode?: SemanticNode | null;
  onNodeAction?: (nodeId: string, action: string) => void;
}

export const ContextualAIAssistant: React.FC<ContextualAIAssistantProps> = ({
  currentPath,
  selectedNode,
  onNodeAction
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentInsight, setCurrentInsight] = useState(0);
  
  const { 
    loading, 
    generatePathNarrative, 
    generateNodeExplanation,
    lastResponse 
  } = useAINarrativeEngine();

  useEffect(() => {
    if (currentPath && isExpanded) {
      generatePathNarrative(currentPath);
    }
  }, [currentPath, isExpanded, generatePathNarrative]);

  useEffect(() => {
    if (selectedNode && isExpanded) {
      generateNodeExplanation(selectedNode, currentPath || undefined);
    }
  }, [selectedNode, isExpanded, generateNodeExplanation, currentPath]);

  // Auto-cycle through insights
  useEffect(() => {
    if (lastResponse?.insights && lastResponse.insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsight(prev => 
          prev >= lastResponse.insights.length - 1 ? 0 : prev + 1
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [lastResponse?.insights]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90 text-white shadow-lg"
        >
          <Bot className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              AI Assistant
              <Badge variant="secondary" className="text-xs">
                {selectedNode ? 'Node Focus' : currentPath ? 'Path Analysis' : 'Ready'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsMinimized(true)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Main Insight Section */}
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Primary explanation */}
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {selectedNode ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-3 h-3 text-primary" />
                          <span className="font-medium">About {selectedNode.title}</span>
                        </div>
                        {lastResponse?.explanation || 'Analyzing this learning step...'}
                      </>
                    ) : currentPath ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-3 h-3 text-primary" />
                          <span className="font-medium">Path Insights</span>
                        </div>
                        {lastResponse?.explanation || 'Analyzing your learning path...'}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p>Select a path or node to get AI insights</p>
                      </div>
                    )}
                  </div>

                  {/* Rotating insights */}
                  {lastResponse?.insights && lastResponse.insights.length > 0 && (
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 text-primary mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="text-xs font-medium text-primary">
                            Key Insight {currentInsight + 1}/{lastResponse.insights.length}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lastResponse.insights[currentInsight]}
                          </div>
                        </div>
                      </div>
                      
                      {lastResponse.insights.length > 1 && (
                        <div className="flex justify-center mt-2 gap-1">
                          {lastResponse.insights.map((_, index) => (
                            <div
                              key={index}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                index === currentInsight ? 'bg-primary' : 'bg-primary/20'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick recommendations */}
                  {lastResponse?.recommendations && lastResponse.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Quick Actions
                      </div>
                      <div className="space-y-1">
                        {lastResponse.recommendations.slice(0, 2).map((rec, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs justify-start w-full"
                            onClick={() => {
                              if (selectedNode) {
                                onNodeAction?.(selectedNode.id, rec);
                              }
                            }}
                          >
                            {rec}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Context indicators */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                {lastResponse?.confidence_score && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(lastResponse.confidence_score * 100)}% confident
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <HelpCircle className="w-3 h-3" />
              </Button>
            </div>

            {/* Help tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-popover border rounded-lg shadow-lg text-xs w-64">
                <p className="text-muted-foreground">
                  This AI assistant analyzes your learning paths and provides contextual insights based on your goals, preferences, and current progress.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};