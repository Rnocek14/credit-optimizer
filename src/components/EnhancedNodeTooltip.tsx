import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, TrendingUp, Award } from 'lucide-react';
import type { GraphNode } from '@/lib/careerGraph';

interface EnhancedNodeTooltipProps {
  node: GraphNode;
  x: number;
  y: number;
  visible: boolean;
}

export function EnhancedNodeTooltip({ node, x, y, visible }: EnhancedNodeTooltipProps) {
  if (!visible) return null;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'job': return '💼';
      case 'skill': return '🎯';
      case 'course': return '📚';
      case 'project': return '🛠️';
      case 'certification': return '🏆';
      case 'step': return '📋';
      default: return '📌';
    }
  };

  const formatTime = (hours?: number) => {
    if (!hours) return null;
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 8);
    return `${days} days`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return 'Free';
    if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}K`;
    return `$${cost}`;
  };

  return (
    <div 
      className="absolute z-50 pointer-events-none"
      style={{ 
        left: x + 10, 
        top: y - 10,
        transform: 'translate(0, -100%)'
      }}
    >
      <Card className="w-64 shadow-lg border-2 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-3 space-y-2">
          {/* Header */}
          <div className="flex items-start gap-2">
            <span className="text-lg">{getNodeIcon(node.type)}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm leading-tight">{node.title}</h4>
              <Badge variant="outline" className="text-xs mt-1 capitalize">
                {node.type}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {node.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {node.description}
            </p>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {node.estimated_time_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{formatTime(node.estimated_time_hours)}</span>
              </div>
            )}
            
            {node.data && 'cost' in node.data && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span>{formatCost((node.data as any).cost)}</span>
              </div>
            )}
            
            {node.data && 'average_salary' in node.data && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <span>{formatCost((node.data as any).average_salary)}</span>
              </div>
            )}
            
            {node.data && 'xp_value' in node.data && (
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3 text-muted-foreground" />
                <span>{(node.data as any).xp_value} XP</span>
              </div>
            )}
          </div>

          {/* Special indicators */}
          <div className="flex gap-1 flex-wrap">
            {node.data && (node.data as any).isCheckpoint && (
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                ✓ Checkpoint
              </Badge>
            )}
            {node.data && (node.data as any).isBranchPoint && (
              <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                🔀 Branch Point
              </Badge>
            )}
            {node.data && (node.data as any).pathType && (
              <Badge variant="outline" className="text-xs capitalize">
                {(node.data as any).pathType.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}