import React from 'react';
import { Card } from '@/components/ui/card';
import { useEduTreeData } from '../hooks/useEduTreeData';
import { TRACK_DEFINITIONS } from '../data/trackDefinitions';

export function DiagnosticPanel() {
  const { data, loading, hasData } = useEduTreeData();

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed bottom-4 left-4 z-50 p-3 max-w-xs bg-background/90 backdrop-blur-sm">
      <div className="space-y-1 text-xs">
        <h4 className="font-semibold text-primary text-sm">Data Status</h4>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <span className="text-muted-foreground">Loading:</span>
          <span className={loading ? 'text-orange-600' : 'text-green-600'}>
            {loading ? 'YES' : 'NO'}
          </span>
          
          <span className="text-muted-foreground">Has Data:</span>
          <span className={hasData ? 'text-green-600' : 'text-red-600'}>
            {hasData ? 'YES' : 'NO'}
          </span>
          
          <span className="text-muted-foreground">Blocks:</span>
          <span className="font-mono">{data.blocks?.length || 0}</span>
          
          <span className="text-muted-foreground">Courses:</span>
          <span className="font-mono">{data.courses?.length || 0}</span>
        </div>
      </div>
    </Card>
  );
}