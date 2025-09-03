// Orphan Parking Lot: Collapsible drawer for unlinked nodes
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
  if (orphanNodes.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Unlinked Items</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {orphanNodes.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Drag to connect or mark as reference
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
              {orphanNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3 border rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs px-1 py-0"
                        >
                          {node.type}
                        </Badge>
                        {node.category && (
                          <span className="text-xs text-muted-foreground">
                            {node.category}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2">
                        {node.title}
                      </h4>
                      {node.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {node.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMoveToCanvas(node.id)}
                      className="text-xs h-6 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMarkAsReference(node.id)}
                      className="text-xs h-6 px-2"
                    >
                      <Link className="h-3 w-3 mr-1" />
                      Ref
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};