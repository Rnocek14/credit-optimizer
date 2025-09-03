import React, { useCallback, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';

export interface SkillTreeEngineProps {
  // Data
  nodes: any[];
  edges: any[];
  loading: boolean;
  error: string | null;
  
  // Callbacks
  onNodeClick?: (node: any) => void;
  onReload?: () => void;
  
  // Configuration
  mode: 'progress' | 'builder';
  showStats?: boolean;
  showControls?: boolean;
  showRightRail?: boolean;
  layoutAlgorithm?: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure';
  layoutConfig?: any;
  
  // Optional components
  statsComponent?: React.ReactNode;
  controlsComponent?: React.ReactNode;
  rightRailComponent?: React.ReactNode;
}

export const SkillTreeEngine: React.FC<SkillTreeEngineProps> = ({
  nodes: rawNodes,
  edges: rawEdges,
  loading,
  error,
  onNodeClick,
  onReload,
  mode,
  showStats = true,
  showControls = false,
  showRightRail = false,
  layoutAlgorithm = 'semantic-hierarchy',
  layoutConfig,
  statsComponent,
  controlsComponent,
  rightRailComponent
}) => {
  const { activeTrackId } = useActiveTrackStore();

  // ✅ UNIFIED NODE PROCESSING: Ensure all nodes have React Flow requirements
  const processedNodes = useMemo(() => {
    if (!Array.isArray(rawNodes)) return [];
    
    return rawNodes.map((node, index) => ({
      ...node,
      // Ensure position exists (React Flow requirement)
      position: node.position || { 
        x: 100 + (index % 6) * 220, 
        y: 100 + Math.floor(index / 6) * 160 
      },
      // Ensure data wrapper exists
      data: {
        title: node.title,
        description: node.description || '',
        type: node.type,
        category: node.category || 'General',
        'data-testid': 'skill-node',
        'data-node-type': node.type,
        'data-node-id': node.id,
        // Preserve existing data
        ...node.data
      },
      // Apply mode-specific styling
      style: {
        ...getNodeModeStyle(mode),
        ...node.style
      }
    }));
  }, [rawNodes, mode]);

  // ✅ UNIFIED EDGE PROCESSING
  const processedEdges = useMemo(() => {
    if (!Array.isArray(rawEdges)) return [];
    
    return rawEdges.map(edge => ({
      ...edge,
      // Ensure source/target from from_id/to_id if needed
      source: edge.source || edge.from_id,
      target: edge.target || edge.to_id,
      // Apply mode-specific styling
      style: {
        ...getEdgeModeStyle(mode),
        ...edge.style
      }
    }));
  }, [rawEdges, mode]);

  // ✅ CANARY NODE FALLBACK (unified across modes)
  const showCanary = processedNodes.length === 0 && !loading;
  const canaryNodes = showCanary ? [{
    id: 'canary-node',
    type: 'skill',
    position: { x: 300, y: 200 },
    title: `🧪 ${mode === 'progress' ? 'Progress' : 'Builder'} Test Node`,
    description: 'This node proves the canvas is working',
    data: {
      title: `🧪 ${mode === 'progress' ? 'Progress' : 'Builder'} Test Node`,
      category: 'debug',
      'data-testid': 'skill-node',
      'data-node-type': 'skill',
      'data-node-id': 'canary-node',
    },
    style: getNodeModeStyle(mode)
  }] : [];

  const finalNodes = showCanary ? canaryNodes : processedNodes;
  const finalEdges = showCanary ? [] : processedEdges;

  // ✅ UNIFIED ERROR HANDLING
  const handleCanvasError = useCallback((error: Error) => {
    console.error(`🚨 ${mode} skill tree error:`, error);
    toast.error(`${mode} skill tree rendering failed. Try refreshing.`);
  }, [mode]);

  // ✅ DEFAULT NODE CLICK HANDLER
  const handleNodeClick = useCallback((node: any) => {
    console.log(`🎯 ${mode} node clicked:`, node);
    
    if (onNodeClick) {
      onNodeClick(node);
    } else {
      // Default behavior
      toast.success(`${node.data?.title || node.title} selected`, {
        description: 'Node clicked in ' + mode + ' mode'
      });
    }
  }, [mode, onNodeClick]);

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-medium">Loading {mode === 'progress' ? 'Progress' : 'Career'} Data</p>
              <p className="text-sm text-muted-foreground">
                Fetching skills, courses, and progress...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">Error loading {mode} data</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {onReload && (
              <Button onClick={onReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (finalNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center max-w-md">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No {mode === 'progress' ? 'progress' : 'skills'} to display</h3>
              <p className="text-sm text-muted-foreground">
                {mode === 'progress' 
                  ? 'Start learning to see your progress here.'
                  : 'No career graph data available.'}
              </p>
            </div>
            <div className="flex gap-2">
              {onReload && (
                <Button onClick={onReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reload
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section (conditional) */}
      {showStats && statsComponent && (
        <div>{statsComponent}</div>
      )}

      {/* Main Canvas Layout */}
      <div className={`grid gap-6 ${showRightRail ? 'lg:grid-cols-4' : 'grid-cols-1'}`}>
        {/* Canvas */}
        <div className={showRightRail ? 'lg:col-span-3' : 'col-span-1'}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {mode === 'progress' ? 'Your Skill Journey' : 'Unified Career Tree'}
                  </CardTitle>
                  <CardDescription>
                    {mode === 'progress' 
                      ? 'Track progress and discover learning paths'
                      : 'Explore the complete learning journey'}
                  </CardDescription>
                </div>
                {activeTrackId && (
                  <Badge variant="outline">
                    Track Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="min-h-[700px] h-[700px] relative bg-background rounded-lg"
                data-testid="skill-tree-canvas"
              >
                <ErrorBoundaryWrapper 
                  resetKeys={[finalNodes.length, finalEdges.length, mode]}
                  onError={handleCanvasError}
                >
                  <ReactFlowProvider>
                    <UnifiedCareerCanvas
                      nodes={finalNodes}
                      edges={finalEdges}
                      onNodeClick={handleNodeClick}
                      layoutAlgorithm={layoutAlgorithm}
                      layoutConfig={layoutConfig}
                      showPivotPaths={mode === 'builder'}
                      focusMode={mode === 'progress'}
                    />
                  </ReactFlowProvider>
                </ErrorBoundaryWrapper>
                
                {/* Debug Info (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-2 left-2 text-xs bg-black/75 text-white p-2 rounded pointer-events-none font-mono">
                    Mode: {mode} | Nodes: {finalNodes.length} | Edges: {finalEdges.length} | Track: {activeTrackId ? 'Active' : 'None'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail (conditional) */}
        {showRightRail && rightRailComponent && (
          <div className="lg:col-span-1">
            {rightRailComponent}
          </div>
        )}
      </div>

      {/* Controls Section (conditional) */}
      {showControls && controlsComponent && (
        <div>{controlsComponent}</div>
      )}
    </div>
  );
};

// ✅ MODE-SPECIFIC STYLING HELPERS
function getNodeModeStyle(mode: 'progress' | 'builder') {
  const baseStyle = {
    padding: '8px',
    borderRadius: '8px',
    fontSize: '11px',
    width: 180,
    height: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
  };

  if (mode === 'progress') {
    return {
      ...baseStyle,
      border: '2px solid hsl(var(--border))',
      background: 'hsl(var(--card))',
      boxShadow: '0 2px 8px hsl(var(--foreground) / 0.1)',
    };
  } else {
    return {
      ...baseStyle,
      border: '2px solid hsl(var(--primary) / 0.3)',
      background: 'hsl(var(--primary) / 0.05)',
      boxShadow: '0 3px 12px hsl(var(--primary) / 0.15)',
    };
  }
}

function getEdgeModeStyle(mode: 'progress' | 'builder') {
  if (mode === 'progress') {
    return {
      stroke: 'hsl(var(--muted-foreground))',
      strokeWidth: 2,
      opacity: 0.7,
    };
  } else {
    return {
      stroke: 'hsl(var(--primary))',
      strokeWidth: 2,
      opacity: 0.8,
    };
  }
}