import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SimpleDebugPanelProps {
  nodeCount: number;
  edgeCount: number;
  isMultipath: boolean;
}

export function SimpleDebugPanel({ nodeCount, edgeCount, isMultipath }: SimpleDebugPanelProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="p-3 bg-secondary/50 border-dashed">
      <div className="text-xs space-y-2">
        <div className="font-semibold">Simple EduTree Debug</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Badge variant="outline" className="mb-1">Nodes</Badge>
            <div>Count: {nodeCount}</div>
          </div>
          
          <div>
            <Badge variant="outline" className="mb-1">Edges</Badge>
            <div>Count: {edgeCount}</div>
          </div>
        </div>
        
        <div>
          <Badge variant={isMultipath ? "destructive" : "default"}>
            {isMultipath ? 'Multipath Mode' : 'Simple Mode'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}