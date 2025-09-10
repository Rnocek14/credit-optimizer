import React from 'react';
import { useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEduTreeQueries } from '../hooks/useEduTreeQueries';

export function EduTreeDebugPanel() {
  const reactFlow = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const { isCriticalDataReady, courses, blocks } = useEduTreeQueries();
  
  const debugInfo = {
    reactFlowInstance: !!reactFlow,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    isCriticalDataReady,
    coursesCount: courses.length,
    blocksCount: blocks.length,
    nodeIds: nodes.slice(0, 5).map(n => n.id), // Show first 5 only
    timestamp: new Date().toLocaleTimeString()
  };
  
  // Continuous logging
  console.log('🔧 [Debug Panel] Current state:', debugInfo);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Card className="absolute top-4 left-4 z-50 w-72 bg-background/95 backdrop-blur border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          EduTree Debug Panel
          <Badge variant={nodes.length > 0 ? 'default' : 'destructive'}>
            {nodes.length > 0 ? 'Nodes Visible' : 'No Nodes'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Data Ready:</span>
            <Badge variant={isCriticalDataReady ? 'default' : 'secondary'} className="ml-1 text-xs">
              {isCriticalDataReady ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <span className="font-medium">ReactFlow:</span>
            <Badge variant={reactFlow ? 'default' : 'destructive'} className="ml-1 text-xs">
              {reactFlow ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>Courses: <span className="font-mono">{debugInfo.coursesCount}</span></div>
          <div>Blocks: <span className="font-mono">{debugInfo.blocksCount}</span></div>
          <div>Nodes: <span className="font-mono">{debugInfo.nodesCount}</span></div>
          <div>Edges: <span className="font-mono">{debugInfo.edgesCount}</span></div>
        </div>
        
        {debugInfo.nodeIds.length > 0 && (
          <div>
            <div className="font-medium mb-1">Sample Nodes:</div>
            <div className="space-y-1">
              {debugInfo.nodeIds.map(id => (
                <Badge key={id} variant="outline" className="text-xs mr-1">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-muted-foreground">
          Last update: {debugInfo.timestamp}
        </div>
      </CardContent>
    </Card>
  );
}