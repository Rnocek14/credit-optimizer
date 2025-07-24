import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

export interface LayoutDebugData {
  status: 'idle' | 'calculating' | 'complete' | 'error';
  nodeCount: number;
  edgeCount: number;
  simulationProgress: number;
  lastCalculationTime: number;
  errors: string[];
  warnings: string[];
  relationships: {
    strong: number;
    medium: number;
    weak: number;
  };
  forces: {
    charge: number;
    link: number;
    collision: number;
    positioning: number;
    clustering: number;
  };
  layoutMode: string;
}

interface LayoutDebugPanelProps {
  debugData: LayoutDebugData;
  onClearLogs: () => void;
  onRecalculate: () => void;
  onExportDebugData: () => void;
}

export const LayoutDebugPanel: React.FC<LayoutDebugPanelProps> = ({
  debugData,
  onClearLogs,
  onRecalculate,
  onExportDebugData,
}) => {
  const getStatusIcon = () => {
    switch (debugData.status) {
      case 'calculating':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (debugData.status) {
      case 'calculating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'complete': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="w-80 border-l">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {getStatusIcon()}
          Layout Debug Panel
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor()}>
            {debugData.status.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            {debugData.layoutMode}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Simulation Progress */}
        {debugData.status === 'calculating' && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Simulation Progress</span>
              <span>{Math.round(debugData.simulationProgress)}%</span>
            </div>
            <Progress value={debugData.simulationProgress} className="h-2" />
          </div>
        )}

        {/* Graph Statistics */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Graph Statistics</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>Nodes:</span>
              <Badge variant="secondary">{debugData.nodeCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Edges:</span>
              <Badge variant="secondary">{debugData.edgeCount}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Relationship Quality */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Relationship Strength</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Strong:</span>
              <Badge variant="default" className="text-xs px-2 py-0">
                {debugData.relationships.strong}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Medium:</span>
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {debugData.relationships.medium}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Weak:</span>
              <Badge variant="outline" className="text-xs px-2 py-0">
                {debugData.relationships.weak}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Force Configuration */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Force Values</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(debugData.forces).map(([force, value]) => (
              <div key={force} className="flex justify-between">
                <span className="capitalize">{force}:</span>
                <code className="text-xs bg-muted px-1 rounded">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </code>
              </div>
            ))}
          </div>
        </div>

        {debugData.lastCalculationTime > 0 && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Last calculation: {debugData.lastCalculationTime}ms
            </div>
          </>
        )}

        {/* Errors and Warnings */}
        {(debugData.errors.length > 0 || debugData.warnings.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              {debugData.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Errors ({debugData.errors.length})
                  </h4>
                  <div className="space-y-1">
                    {debugData.errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {debugData.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Warnings ({debugData.warnings.length})
                  </h4>
                  <div className="space-y-1">
                    {debugData.warnings.slice(0, 3).map((warning, index) => (
                      <p key={index} className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRecalculate}
            disabled={debugData.status === 'calculating'}
          >
            Recalculate Layout
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearLogs}
              className="flex-1"
            >
              Clear Logs
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onExportDebugData}
              className="flex-1"
            >
              Export Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};