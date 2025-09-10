import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlanningLens } from '@/lib/types/eduTree';

interface MultipathDebugPanelProps {
  primaryLens: PlanningLens;
  comparisonLens: PlanningLens | null;
  primaryPath: { nodes: string[]; edges: string[] } | null;
  comparisonPath: { nodes: string[]; edges: string[] } | null;
  isMultipathActive: boolean;
}

export function MultipathDebugPanel({
  primaryLens,
  comparisonLens,
  primaryPath,
  comparisonPath,
  isMultipathActive
}: MultipathDebugPanelProps) {
  if (!isMultipathActive || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const sharedNodes = primaryPath && comparisonPath ? 
    primaryPath.nodes.filter(nodeId => comparisonPath.nodes.includes(nodeId)) : [];

  return (
    <Card className="p-3 bg-secondary/50 border-dashed">
      <div className="text-xs space-y-2">
        <div className="font-semibold">Multipath Debug</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Badge variant="outline" className="mb-1">{primaryLens} (Primary)</Badge>
            <div>Nodes: {primaryPath?.nodes.length || 0}</div>
            <div>Edges: {primaryPath?.edges.length || 0}</div>
          </div>
          
          {comparisonLens && (
            <div>
              <Badge variant="secondary" className="mb-1">{comparisonLens} (Compare)</Badge>
              <div>Nodes: {comparisonPath?.nodes.length || 0}</div>
              <div>Edges: {comparisonPath?.edges.length || 0}</div>
            </div>
          )}
        </div>
        
        {sharedNodes.length > 0 && (
          <div>
            <Badge variant="outline" className="mr-1">Shared:</Badge>
            <span>{sharedNodes.length} nodes</span>
          </div>
        )}
      </div>
    </Card>
  );
}