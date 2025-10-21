import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Controls, Background, MiniMap, ReactFlowProvider, Node, Edge, MarkerType } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Network, Clock, DollarSign, BookOpen, Award } from 'lucide-react';
import { usePlanBasket } from '../state/usePlanBasket';
import { useV5DatabaseData } from '../hooks/useV5DatabaseData';
import { useGraphLayout, applyELKLayout } from '../hooks/useGraphLayout';
import { V5GraphNode } from './V5GraphNode';
import { V5GraphEdge } from './V5GraphEdge';
import type { V5GraphNodeData } from './V5GraphNode';
import type { V5GraphEdgeData } from './V5GraphEdge';
import { trackTelemetryEvent } from '@/utils/telemetry';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  v5GraphNode: V5GraphNode,
};

const edgeTypes = {
  v5GraphEdge: V5GraphEdge,
};

interface GraphViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GraphViewInner({ open, onOpenChange }: GraphViewProps) {
  const [mode, setMode] = useState<'prereq' | 'timeline'>('prereq');
  const [openTime] = useState(Date.now());
  const [rfNodes, setRfNodes] = useState<Node<V5GraphNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge<V5GraphEdgeData>[]>([]);
  
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const totals = usePlanBasket(s => s.getTotals());
  
  // Load marketplace options from all modules
  const { data: dbData } = useV5DatabaseData({
    programId: 'bs_cs',
    enabled: true,
  });
  
  const allOptions = React.useMemo(() => {
    if (!dbData?.modulesByYear) return [];
    
    // Flatten all marketplace options from all modules across all years
    const options: any[] = [];
    Object.values(dbData.modulesByYear).forEach(modules => {
      modules.forEach(module => {
        if (module.marketplaceOptions) {
          options.push(...module.marketplaceOptions);
        }
      });
    });
    
    return options;
  }, [dbData]);
  
  const maxConcurrent = constraints.max_concurrent_courses ?? 2;
  
  // Generate raw graph layout (nodes/edges without positioning)
  const { nodes, edges, timelinePack } = useGraphLayout(basket, allOptions, mode, maxConcurrent);
  
  // Apply layout based on mode
  useEffect(() => {
    let cancelled = false;
    
    if (mode === 'timeline') {
      // Timeline mode: use custom packing
      const positionedNodes = nodes.map(node => {
        const pos = timelinePack.layout.get(node.id);
        if (pos) {
          return {
            ...node,
            position: { x: pos.x, y: pos.y },
          };
        } else {
          // Prereq nodes: position to the left
          return {
            ...node,
            position: { x: -300, y: nodes.indexOf(node) * 120 },
          };
        }
      });
      
      if (!cancelled) {
        setRfNodes(positionedNodes);
        setRfEdges(edges.slice());
      }
    } else {
      // Prereq mode: use ELK layout (async)
      applyELKLayout(nodes, edges)
        .then(({ nodes: layoutedNodes }) => {
          if (!cancelled) {
            setRfNodes(layoutedNodes);
            setRfEdges(edges.slice());
          }
        })
        .catch(err => {
          console.error('[GraphView] Layout failed:', err);
          if (!cancelled) {
            // Fallback to raw nodes
            setRfNodes(nodes.slice());
            setRfEdges(edges.slice());
          }
        });
    }
    
    return () => {
      cancelled = true;
    };
  }, [nodes, edges, mode, timelinePack]);
  
  // Telemetry: track view opened
  useEffect(() => {
    if (open) {
      void trackTelemetryEvent({
        task: 'graph_view_opened',
        scope: 'plan',
        complexity: {
          mode,
          itemCount: basket.length,
        },
      });
    } else {
      // Track view closed with duration
      const duration = Math.round((Date.now() - openTime) / 1000);
      void trackTelemetryEvent({
        task: 'graph_view_closed',
        scope: 'plan',
        complexity: {
          mode,
          duration_seconds: duration,
        },
      });
    }
  }, [open]);
  
  // Handle mode toggle
  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'prereq' ? 'timeline' : 'prereq';
    setMode(newMode);
    
    void trackTelemetryEvent({
      task: 'graph_mode_switched',
      scope: 'plan',
      complexity: {
        from: mode,
        to: newMode,
        itemCount: basket.length,
      },
    });
  }, [mode, basket.length]);
  
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-xl h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-primary" />
              <DialogTitle>Plan Visualization</DialogTitle>
              
              {/* Mode Toggle */}
              <div className="flex gap-1 ml-4">
                <Button
                  variant={mode === 'prereq' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleModeToggle}
                  className="text-xs"
                >
                  Prerequisites
                </Button>
                <Button
                  variant={mode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleModeToggle}
                  className="text-xs"
                >
                  Timeline
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {basket.length} courses
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                ${totals.totalCost.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {totals.totalWeeks} weeks
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                CRI {Math.round(totals.avgCRI)}
              </span>
            </div>
            
            {mode === 'timeline' && (
              <Badge variant="secondary" className="ml-auto">
                Max {maxConcurrent} concurrent
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        {/* Graph Canvas */}
        <div className="flex-1 bg-background">
          {basket.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  No courses in basket
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add courses from the marketplace to visualize your plan
                </p>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes as any}
              edges={rfEdges as any}
              nodeTypes={nodeTypes as any}
              edgeTypes={edgeTypes as any}
              defaultEdgeOptions={{
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                },
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
              maxZoom={2}
              className="bg-background"
            >
              <Controls />
              <Background />
              <MiniMap 
                nodeColor={(node) => {
                  const data = node.data as any;
                  if (!data.isInBasket) return 'hsl(var(--muted))';
                  if (data.status === 'pinned') return 'hsl(var(--primary))';
                  return 'hsl(var(--secondary))';
                }}
                className="bg-background border border-border"
              />
            </ReactFlow>
          )}
        </div>
        
        {/* Footer Info */}
        {basket.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {mode === 'prereq' ? (
                <>
                  <span className="font-medium">Prerequisites View:</span> Shows course dependencies and unmet requirements
                </>
              ) : (
                <>
                  <span className="font-medium">Timeline View:</span> Visualizes course duration and concurrency ({maxConcurrent} max)
                </>
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
