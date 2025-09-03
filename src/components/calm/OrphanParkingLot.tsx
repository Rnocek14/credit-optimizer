// Orphan Parking Lot: Container for disconnected nodes
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, Link } from 'lucide-react';
import type { CalmGraphNode } from '@/lib/calmSubgraph';

export interface OrphanParkingLotProps {
  orphanNodes: CalmGraphNode[];
  isExpanded: boolean;
  onToggle: () => void;
  onMoveToCanvas: (nodeId: string) => void;
  onMarkAsReference: (nodeId: string) => void;
}

export const OrphanParkingLot: React.FC<OrphanParkingLotProps> = ({
  orphanNodes,
  isExpanded,
  onToggle,
  onMoveToCanvas,
  onMarkAsReference
}) => {
  if (orphanNodes.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Orphan Nodes ({orphanNodes.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {orphanNodes.slice(0, 10).map((node) => (
              <div key={node.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{node.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {node.type} • {node.category || 'No category'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onMoveToCanvas(node.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onMarkAsReference(node.id)}
                    className="h-6 px-2 text-xs"
                  >
                    <Link className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            
            {orphanNodes.length > 10 && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                ... and {orphanNodes.length - 10} more
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};