import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Clock, DollarSign, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { useAIPlanningEngine, type LearningPath } from '@/hooks/useAIPlanningEngine';

export function AIBackwardPlanningPanel() {
  const [targetJob, setTargetJob] = useState('');
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const { loading, error, generateBackwardPlan } = useAIPlanningEngine();

  const handleGeneratePlan = async () => {
    if (!targetJob.trim()) return;
    
    const paths = await generateBackwardPlan(targetJob.trim());
    setLearningPaths(paths);
  };

  const getPathTypeColor = (type: string) => {
    switch (type) {
      case 'fastest': return 'bg-primary/10 text-primary border-primary/20';
      case 'cheapest': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'highest_roi': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default: return 'bg-secondary/10 text-secondary border-secondary/20';
    }
  };

  const getPathTypeIcon = (type: string) => {
    switch (type) {
      case 'fastest': return <Clock className="w-3 h-3" />;
      case 'cheapest': return <DollarSign className="w-3 h-3" />;
      case 'highest_roi': return <TrendingUp className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Backward Planning Engine
        </CardTitle>
        <CardDescription>
          Generate personalized learning roadmaps from your target job goal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter target job (e.g. UX Designer, Frontend Engineer)"
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGeneratePlan()}
            disabled={loading}
          />
          <Button 
            onClick={handleGeneratePlan} 
            disabled={loading || !targetJob.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Plan
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {learningPaths.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Learning Paths</h3>
              <Badge variant="outline">{learningPaths.length} paths found</Badge>
            </div>

            <div className="grid gap-4">
              {learningPaths.map((path) => (
                <Card key={path.id} className="border border-border/40">
                  <CardContent className="p-4">
                    {/* Path Header */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge className={getPathTypeColor(path.path_type)}>
                        {getPathTypeIcon(path.path_type)}
                        <span className="ml-1 capitalize">{path.path_type.replace('_', ' ')}</span>
                      </Badge>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {path.total_time}h
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${path.total_cost}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {(path.average_roi * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Path Nodes */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {path.nodes.map((node, index) => (
                        <React.Fragment key={node.id}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
                            <div className="text-sm">
                              <div className="font-medium">{node.title}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {node.type}
                              </div>
                            </div>
                          </div>
                          {index < path.nodes.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && learningPaths.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Enter a target job to generate your personalized learning roadmap</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}