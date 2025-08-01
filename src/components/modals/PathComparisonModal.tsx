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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpandableText, ExpandableList } from '@/components/ui/ExpandableText';
import { useAINarrativeEngine } from '@/hooks/useAINarrativeEngine';
import type { SemanticPath } from '@/types/semantic';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Star,
  Zap,
  Target,
  Lightbulb,
  CheckCircle
} from 'lucide-react';

interface PathComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryPath: SemanticPath | null;
  alternatives: SemanticPath[];
  onSelectPath: (path: SemanticPath) => void;
}

export const PathComparisonModal: React.FC<PathComparisonModalProps> = ({
  isOpen,
  onClose,
  primaryPath,
  alternatives,
  onSelectPath
}) => {
  const [selectedPaths, setSelectedPaths] = useState<SemanticPath[]>([]);
  const { 
    loading, 
    generateDecisionGuidance, 
    lastResponse 
  } = useAINarrativeEngine();

  useEffect(() => {
    if (primaryPath && isOpen) {
      setSelectedPaths([primaryPath, ...alternatives.slice(0, 2)]);
      generateDecisionGuidance({ 
        path: primaryPath, 
        alternatives: alternatives.slice(0, 2) 
      });
    }
  }, [primaryPath, alternatives, isOpen, generateDecisionGuidance]);

  if (!primaryPath) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const PathCard: React.FC<{ path: SemanticPath; isPrimary?: boolean }> = ({ 
    path, 
    isPrimary = false 
  }) => (
    <Card className={`relative ${isPrimary ? 'ring-2 ring-primary' : ''}`}>
      {isPrimary && (
        <div className="absolute -top-2 left-4">
          <Badge className="bg-primary text-primary-foreground">
            Recommended
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {path.title}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className={`text-sm ${getScoreColor(path.metadata.confidence_score)}`}>
              {Math.round(path.metadata.confidence_score * 100)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">Duration</span>
            </div>
            <div className="text-sm font-medium">
              {path.metadata.total_duration || 0} weeks
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span className="text-xs">Cost</span>
            </div>
            <div className="text-sm font-medium">
              ${path.metadata.total_cost || 0}
            </div>
          </div>
        </div>

        {/* Feasibility Scores */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Time Feasibility</span>
              <span>{Math.round(path.metadata.time_feasibility * 100)}%</span>
            </div>
            <Progress 
              value={path.metadata.time_feasibility * 100} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Budget Feasibility</span>
              <span>{Math.round(path.metadata.budget_feasibility * 100)}%</span>
            </div>
            <Progress 
              value={path.metadata.budget_feasibility * 100} 
              className="h-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Personalization</span>
              <span>{Math.round(path.metadata.personalization_score * 100)}%</span>
            </div>
            <Progress 
              value={path.metadata.personalization_score * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* Learning Steps Preview */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Learning Steps ({path.nodes.length})
          </h4>
          <div className="space-y-1">
            {path.nodes.slice(0, 3).map((node, index) => (
              <div key={node.id} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">
                  {index + 1}
                </div>
                <span className="truncate">{node.title}</span>
              </div>
            ))}
            {path.nodes.length > 3 && (
              <div className="text-xs text-muted-foreground ml-6">
                +{path.nodes.length - 3} more steps
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full" 
          variant={isPrimary ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectPath(path)}
        >
          {isPrimary ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1" />
              Select This Path
            </>
          ) : (
            'Choose Alternative'
          )}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Compare Learning Paths
          </DialogTitle>
          <DialogDescription>
            Compare different approaches to reach your career goals and make an informed decision.
          </DialogDescription>
        </DialogHeader>

        {/* AI Guidance Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              AI Decision Guidance
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
                  text={lastResponse?.explanation || 'Analyzing your learning path options...'}
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
                          <Zap className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
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

        {/* Path Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {selectedPaths.map((path, index) => (
            <PathCard 
              key={path.id} 
              path={path} 
              isPrimary={index === 0}
            />
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Detailed Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Criteria</th>
                    {selectedPaths.map((path, index) => (
                      <th key={path.id} className="text-center py-2">
                        Path {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b">
                    <td className="py-2 text-muted-foreground">Duration</td>
                    {selectedPaths.map(path => (
                      <td key={path.id} className="text-center py-2">
                        {path.metadata.total_duration || 0}w
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-muted-foreground">Cost</td>
                    {selectedPaths.map(path => (
                      <td key={path.id} className="text-center py-2">
                        ${path.metadata.total_cost || 0}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-muted-foreground">Steps</td>
                    {selectedPaths.map(path => (
                      <td key={path.id} className="text-center py-2">
                        {path.nodes.length}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-muted-foreground">Confidence</td>
                    {selectedPaths.map(path => (
                      <td key={path.id} className="text-center py-2">
                        <span className={getScoreColor(path.metadata.confidence_score)}>
                          {Math.round(path.metadata.confidence_score * 100)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSelectPath(primaryPath)}>
            Continue with Recommended
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};