import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrackId, TRACKS } from '../tracks';
import { getSharedFoundationNodes, getUniqueSpecializationNodes } from '../utils/trackHighlighting';

interface MultipathDebugPanelProps {
  primaryTrack: TrackId | null;
  comparisonTrack: TrackId | null;
  primaryPath: { nodes: string[]; edges: string[] } | null;
  comparisonPath: { nodes: string[]; edges: string[] } | null;
  isMultipathActive: boolean;
}

export function MultipathDebugPanel({
  primaryTrack,
  comparisonTrack,
  primaryPath,
  comparisonPath,
  isMultipathActive
}: MultipathDebugPanelProps) {
  if (!isMultipathActive || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const sharedNodes = primaryTrack && comparisonTrack ? 
    getSharedFoundationNodes(primaryTrack, comparisonTrack) : new Set();
  
  const primaryUnique = primaryTrack ? getUniqueSpecializationNodes(primaryTrack) : new Set();
  const comparisonUnique = comparisonTrack ? getUniqueSpecializationNodes(comparisonTrack) : new Set();

  return (
    <Card className="p-4 bg-secondary/50 border-dashed shadow-sm">
      <div className="text-xs space-y-3">
        <div className="font-semibold text-foreground flex items-center gap-2">
          🔍 Multipath Debug Panel
          <Badge variant="outline" className="text-xs">
            {isMultipathActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Track */}
          <div className="space-y-2">
            <Badge variant="outline" className="mb-1 text-primary border-primary">
              {primaryTrack ? TRACKS[primaryTrack].name : 'None'} (Primary)
            </Badge>
            {primaryPath && (
              <div className="space-y-1">
                <div>📊 Nodes: {primaryPath.nodes.length}</div>
                <div>🔗 Edges: {primaryPath.edges.length}</div>
                <div>🎯 Specialization: {primaryUnique.size} unique</div>
                {primaryTrack && (
                  <div className="text-muted-foreground">
                    Focus: {TRACKS[primaryTrack].specialization}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Comparison Track */}
          <div className="space-y-2">
            {comparisonTrack ? (
              <>
                <Badge variant="secondary" className="mb-1">
                  {TRACKS[comparisonTrack].name} (Compare)
                </Badge>
                {comparisonPath && (
                  <div className="space-y-1">
                    <div>📊 Nodes: {comparisonPath.nodes.length}</div>
                    <div>🔗 Edges: {comparisonPath.edges.length}</div>
                    <div>🎯 Specialization: {comparisonUnique.size} unique</div>
                    <div className="text-muted-foreground">
                      Focus: {TRACKS[comparisonTrack].specialization}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">No comparison track selected</div>
            )}
          </div>
        </div>
        
        {/* Shared Analysis */}
        {primaryTrack && comparisonTrack && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Badge variant="outline" className="text-accent border-accent">
              🌳 Branching Analysis
            </Badge>
            <div className="grid grid-cols-2 gap-4 text-muted-foreground">
              <div>Shared foundation: {sharedNodes.size} nodes</div>
              <div>Convergence: {TRACKS[primaryTrack].convergencePoint}</div>
            </div>
            <div className="bg-accent/10 rounded p-2">
              <div className="font-medium">Path Structure:</div>
              <div>Foundation → {TRACKS[primaryTrack].branchingPoint} → Specialization → {TRACKS[primaryTrack].convergencePoint}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}