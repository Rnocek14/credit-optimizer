import React from 'react';
import { useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ReactFlowDebugger() {
  const reactFlow = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  
  const debugInfo = {
    reactFlowInstance: !!reactFlow,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodeIds: nodes.map(n => n.id),
    nodeTypes: [...new Set(nodes.map(n => n.type))],
    edgeTypes: [...new Set(edges.map(e => e.type))],
    reactFlowState: reactFlow ? 'initialized' : 'not initialized'
  };
  
  // Log debug info to console
  console.log('🔧 [ReactFlow] Debug Info:', debugInfo);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Card className="absolute top-4 right-4 z-50 w-80 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ReactFlow Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={reactFlow ? 'default' : 'destructive'}>
            {debugInfo.reactFlowState}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Nodes:</span> {debugInfo.nodesCount}
          </div>
          <div>
            <span className="font-medium">Edges:</span> {debugInfo.edgesCount}
          </div>
        </div>
        
        {debugInfo.nodeIds.length > 0 && (
          <div>
            <div className="font-medium mb-1">Node IDs:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {debugInfo.nodeIds.map(id => (
                <Badge key={id} variant="outline" className="text-xs mr-1">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <div className="font-medium mb-1">Node Types:</div>
          <div className="flex flex-wrap gap-1">
            {debugInfo.nodeTypes.map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}