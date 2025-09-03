import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { PathfindingResult } from '@/types/lifePathGraph';
import { Clock, DollarSign, BookOpen, TrendingUp, ArrowRight } from 'lucide-react';

interface PathComparisonProps {
  result: PathfindingResult;
  graph: LifePathGraph;
}

export default function PathComparison({ result, graph }: PathComparisonProps) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>(['fastest', 'cheapest']);

  const paths = {
    fastest: result.fastest,
    cheapest: result.cheapest,
    creditMaximized: result.creditMaximized,
  };

  const getPathNodes = (pathType: string) => {
    const path = paths[pathType as keyof typeof paths];
    return path.nodeIds.map(id => graph.nodes.find(n => n.id === id)).filter(Boolean);
  };

  const getPathColor = (pathType: string) => {
    switch (pathType) {
      case 'fastest': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
      case 'cheapest': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'creditMaximized': return 'border-purple-500 bg-purple-50 dark:bg-purple-950/20';
      default: return 'border-gray-300';
    }
  };

  const togglePathSelection = (pathType: string) => {
    setSelectedPaths(prev => 
      prev.includes(pathType) 
        ? prev.filter(p => p !== pathType)
        : [...prev, pathType]
    );
  };

  return (
    <div className="space-y-6">
      {/* Path Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Paths</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(paths).map(([key, path]) => (
              <Button
                key={key}
                variant={selectedPaths.includes(key) ? "default" : "outline"}
                size="sm"
                onClick={() => togglePathSelection(key)}
              >
                {path.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Path Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Metric</th>
                  {selectedPaths.map(pathType => (
                    <th key={pathType} className="text-center py-2 capitalize">
                      {pathType.replace('MaximVized', ' Max')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time (months)
                  </td>
                  {selectedPaths.map(pathType => (
                    <td key={pathType} className="text-center py-2">
                      {paths[pathType as keyof typeof paths].totalTime}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cost
                  </td>
                  {selectedPaths.map(pathType => (
                    <td key={pathType} className="text-center py-2">
                      ${paths[pathType as keyof typeof paths].totalCost.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Credits
                  </td>
                  {selectedPaths.map(pathType => (
                    <td key={pathType} className="text-center py-2">
                      {paths[pathType as keyof typeof paths].totalCredits}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    ROI Score
                  </td>
                  {selectedPaths.map(pathType => (
                    <td key={pathType} className="text-center py-2">
                      {paths[pathType as keyof typeof paths].roiScore}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Path Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedPaths.map(pathType => {
          const path = paths[pathType as keyof typeof paths];
          const nodes = getPathNodes(pathType);
          
          return (
            <Card key={pathType} className={getPathColor(pathType)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {path.name}
                  <Badge variant="secondary">
                    {nodes.length} steps
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nodes.map((node, index) => (
                    <div key={node?.id} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {node?.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {node?.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{node?.estimatedHours}h</span>
                          {node?.cost > 0 && <span>${node.cost.toLocaleString()}</span>}
                          {node?.credits && <span>{node.credits} credits</span>}
                        </div>
                      </div>
                      
                      {index < nodes.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {path.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trade-offs Analysis */}
      {result.tradeoffs && (
        <Card>
          <CardHeader>
            <CardTitle>Trade-off Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Time vs Cost</h4>
                <p className="text-sm text-muted-foreground">
                  Correlation: {(result.tradeoffs.timeVsCost.correlation * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.tradeoffs.timeVsCost.correlation < 0 
                    ? "Faster paths tend to be more expensive"
                    : "Faster paths tend to be cheaper"
                  }
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Cost vs Credits</h4>
                <p className="text-sm text-muted-foreground">
                  Correlation: {(result.tradeoffs.costVsCredits.correlation * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.tradeoffs.costVsCredits.correlation > 0
                    ? "Higher cost paths tend to provide more credits"
                    : "Higher cost doesn't always mean more credits"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}