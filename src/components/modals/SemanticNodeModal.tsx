import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpandableText, ExpandableList } from '@/components/ui/ExpandableText';
import { useAINarrativeEngine } from '@/hooks/useAINarrativeEngine';
import type { SemanticNode, SemanticPath } from '@/types/semantic';
import { 
  BookOpen, 
  Target, 
  Briefcase, 
  Zap, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Lightbulb,
  Star
} from 'lucide-react';

interface SemanticNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: SemanticNode | null;
  pathContext?: SemanticPath;
}

export const SemanticNodeModal: React.FC<SemanticNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  pathContext
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    loading, 
    generateNodeExplanation, 
    lastResponse 
  } = useAINarrativeEngine();

  useEffect(() => {
    if (node && isOpen) {
      generateNodeExplanation(node, pathContext);
    }
  }, [node, isOpen, generateNodeExplanation, pathContext]);

  if (!node) return null;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'skill': return <Zap className="w-5 h-5" />;
      case 'course': return <BookOpen className="w-5 h-5" />;
      case 'job': return <Briefcase className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500';
    if (difficulty <= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getNodeIcon(node.type)}
            <div>
              <DialogTitle className="text-xl">{node.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">
                  {node.type}
                </Badge>
                {node.metadata.confidence_score && (
                  <span className={`text-sm ${getConfidenceColor(node.metadata.confidence_score)}`}>
                    {Math.round(node.metadata.confidence_score * 100)}% Match
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="alternatives">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {node.metadata.difficulty && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Difficulty</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getDifficultyColor(node.metadata.difficulty)}`} />
                        <span className="text-sm">{node.metadata.difficulty}/5</span>
                      </div>
                    </div>
                  )}
                  
                  {node.metadata.duration_weeks && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Duration
                      </span>
                      <span className="text-sm">{node.metadata.duration_weeks} weeks</span>
                    </div>
                  )}

                  {node.metadata.cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Cost
                      </span>
                      <span className="text-sm">${node.metadata.cost}</span>
                    </div>
                  )}

                  {node.metadata.personalization_score && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Personalization
                      </span>
                      <span className="text-sm">{Math.round(node.metadata.personalization_score * 100)}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Learning Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Skill Development</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Career Relevance</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Market Demand</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prerequisites & Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Prerequisites</h4>
                    <div className="space-y-2">
                      <Badge variant="secondary" className="mr-2">Basic Design Principles</Badge>
                      <Badge variant="secondary" className="mr-2">Color Theory</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Learning Outcomes</h4>
                    <div className="space-y-2">
                      <Badge variant="outline" className="mr-2">Advanced Prototyping</Badge>
                      <Badge variant="outline" className="mr-2">User Research Skills</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ExpandableText 
                      text={lastResponse?.explanation || 'Generating AI insights...'}
                      maxLength={300}
                    />
                    
                    {lastResponse?.insights && lastResponse.insights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                        <ExpandableList
                          items={lastResponse.insights}
                          maxItems={2}
                          renderItem={(insight, index) => (
                            <div className="text-sm text-muted-foreground flex items-start gap-2">
                              <TrendingUp className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                              <span className="break-words">{insight}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}

                    {lastResponse?.recommendations && lastResponse.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                        <ExpandableList
                          items={lastResponse.recommendations}
                          maxItems={2}
                          renderItem={(rec, index) => (
                            <div className="text-sm text-muted-foreground flex items-start gap-2">
                              <Star className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                              <span className="break-words">{rec}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Learning Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">0%</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  
                  <Progress value={0} className="h-3" />
                  
                  <div className="text-center">
                    <Button variant="outline" size="sm">
                      Start Learning
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alternatives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alternative Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {node.substitutions && node.substitutions.length > 0 ? (
                    node.substitutions.map((sub, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">{sub.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {sub.confidence_score && `${Math.round(sub.confidence_score * 100)}% match`}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Consider
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No alternative options available for this step.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Add to Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};