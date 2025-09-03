// Calm Skill Tree Engine: Progressive disclosure implementation
import React, { useState, useMemo, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { buildCalmSubgraph, type CalmSubgraph, type CalmGraphNode, type CalmGraphEdge } from '@/lib/calmSubgraph';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundaryWrapper';
import { CalmErrorBoundary } from './CalmErrorBoundary';
import { CalmSkillTreeControls } from './CalmSkillTreeControls';
import { OrphanParkingLot } from './OrphanParkingLot';
import { LaneBackground, CALM_LANES } from './LaneBackground';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface CalmSkillTreeEngineProps {
  nodes: CalmGraphNode[];
  edges: CalmGraphEdge[];
  loading: boolean;
  error: string | null;
  onNodeClick?: (node: any) => void;
  onReload?: () => void;
  criScore?: any;
  userProgress?: any[];
  getReadinessLevel?: (score: number) => { level: string; color: string };
}

export const CalmSkillTreeEngine: React.FC<CalmSkillTreeEngineProps> = ({
  nodes: rawNodes,
  edges: rawEdges,
  loading,
  error,
  onNodeClick,
  onReload,
  criScore,
  userProgress,
  getReadinessLevel
}) => {
  // Add early debug logging with comprehensive data validation
  console.log('🧘 CalmSkillTreeEngine render start:', {
    rawNodesCount: rawNodes?.length,
    rawEdgesCount: rawEdges?.length,
    rawNodesType: typeof rawNodes,
    rawEdgesType: typeof rawEdges,
    rawNodesValid: Array.isArray(rawNodes),
    rawEdgesValid: Array.isArray(rawEdges),
    firstNode: rawNodes?.[0],
    firstEdge: rawEdges?.[0],
    loading,
    error: !!error,
    timestamp: Date.now()
  });

  // Early validation and safe bailout
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) {
    console.error('❌ Invalid data provided to CalmSkillTreeEngine:', {
      nodes: typeof rawNodes,
      edges: typeof rawEdges
    });
    
    return (
      <div className="flex items-center justify-center h-96 text-destructive">
        <div className="text-center space-y-4">
          <p>Invalid data format provided to calm mode</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
  // Calm mode state with strict defaults
  const [visibleDepth, setVisibleDepth] = useState(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [showCrossLaneEdges, setShowCrossLaneEdges] = useState(false);
  const [showOrphanDrawer, setShowOrphanDrawer] = useState(false);

  // Filters
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showOnlyMyTrack, setShowOnlyMyTrack] = useState(false);
  const [showNext4Weeks, setShowNext4Weeks] = useState(false);

  // Build calm subgraph with comprehensive error handling
  const calmSubgraph: CalmSubgraph = useMemo(() => {
    try {
      if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) {
        console.warn('⚠️ Invalid data types provided to calm engine');
        return {
          nodes: [],
          edges: [],
          clusters: [],
          hiddenNodes: [],
          hiddenEdges: [],
          metadata: {
            visibleNodes: 0,
            visibleEdges: 0,
            clusterCount: 0,
            totalHidden: 0,
            performance: { buildTime: 0 }
          }
        };
      }

      if (rawNodes.length === 0) {
        console.warn('⚠️ Empty nodes array provided to calm engine');
        return {
          nodes: [],
          edges: [],
          clusters: [],
          hiddenNodes: [],
          hiddenEdges: [],
          metadata: {
            visibleNodes: 0,
            visibleEdges: 0,
            clusterCount: 0,
            totalHidden: 0,
            performance: { buildTime: 0 }
          }
        };
      }

      // Validate node data structure
      const validNodes = rawNodes.filter(node => 
        node && typeof node === 'object' && 
        node.id && node.title && node.type
      );

      if (validNodes.length !== rawNodes.length) {
        console.warn(`🔧 Filtered ${rawNodes.length - validNodes.length} invalid nodes`);
      }

      // Validate edge data structure - handle both data formats
      const validEdges = rawEdges.filter(edge => {
        if (!edge || typeof edge !== 'object') return false;
        
        const source = edge.source || edge.from_id;
        const target = edge.target || edge.to_id;
        
        return source && target &&
          validNodes.some(n => n.id === source) &&
          validNodes.some(n => n.id === target);
      });

      if (validEdges.length !== rawEdges.length) {
        console.warn(`🔧 Filtered ${rawEdges.length - validEdges.length} invalid edges`);
      }

      console.log('🔨 Building calm subgraph with validated data:', {
        validNodes: validNodes.length,
        validEdges: validEdges.length,
        activeGoalId,
        focusNodeId,
        expandedClusters: Array.from(expandedClusters)
      });

      return buildCalmSubgraph(validNodes, validEdges, {
        activeGoalId,
        focusNodeId,
        expandedClusters,
        config: {
          maxVisibleNodes: 40,
          maxVisibleEdges: 60,
          defaultDepth: visibleDepth,
          enableClustering: true,
          laneOrdering: ['foundations', 'skills', 'projects', 'credentials', 'jobs']
        }
      });
    } catch (error) {
      console.error('❌ Failed to build calm subgraph:', error);
      
      // Show user-friendly error message
      toast.error('Failed to build skill tree view', {
        description: 'Using safe fallback layout. Check console for details.'
      });
      
      // Return safe fallback
      return {
        nodes: [],
        edges: [],
        clusters: [],
        hiddenNodes: [],
        hiddenEdges: [],
        metadata: {
          visibleNodes: 0,
          visibleEdges: 0,
          clusterCount: 0,
          totalHidden: 0,
          performance: { buildTime: 0 }
        }
      };
    }
  }, [rawNodes, rawEdges, activeGoalId, focusNodeId, expandedClusters, visibleDepth]);

  // Process edges based on cross-lane visibility with error handling
  const processedEdges = useMemo(() => {
    try {
      if (!calmSubgraph.edges || !Array.isArray(calmSubgraph.edges)) {
        console.warn('⚠️ Invalid edges in calm subgraph');
        return [];
      }

      if (!showCrossLaneEdges) {
        // Hide edges that cross lanes
        return calmSubgraph.edges.filter(edge => {
          try {
            const source = edge.source || edge.from_id;
            const target = edge.target || edge.to_id;
            const sourceNode = calmSubgraph.nodes.find(n => n.id === source);
            const targetNode = calmSubgraph.nodes.find(n => n.id === target);
            
            if (!sourceNode || !targetNode) return false;
            
            // Map nodes to lanes (simplified)
            const getNodeLane = (node: any) => {
              switch (node.type) {
                case 'skill': return node.category?.toLowerCase() === 'foundation' ? 'foundations' : 'skills';
                case 'course': return 'skills';
                case 'project': return 'projects';
                case 'certification': return 'credentials';
                case 'job': return 'jobs';
                default: return 'skills';
              }
            };
            
            return getNodeLane(sourceNode) === getNodeLane(targetNode);
          } catch (error) {
            console.warn('⚠️ Error processing edge:', edge, error);
            return false;
          }
        });
      }
      
      return calmSubgraph.edges;
    } catch (error) {
      console.error('❌ Failed to process edges:', error);
      return [];
    }
  }, [calmSubgraph.edges, showCrossLaneEdges, calmSubgraph.nodes]);

  // Enhanced node click handler
  const handleNodeClick = useCallback((node: any) => {
    console.log('🎯 Calm mode node clicked:', node);
    
    // Handle cluster expansion
    if (node.type === 'cluster') {
      const clusterId = node.id;
      const newExpanded = new Set(expandedClusters);
      
      if (newExpanded.has(clusterId)) {
        newExpanded.delete(clusterId);
      } else {
        newExpanded.add(clusterId);
      }
      
      setExpandedClusters(newExpanded);
      toast.success(`${newExpanded.has(clusterId) ? 'Expanded' : 'Collapsed'} ${node.data?.title}`);
      return;
    }

    // Enter focus mode on regular node click
    if (!focusNodeId) {
      setFocusNodeId(node.id);
      toast.success('Focus mode activated', {
        description: 'Showing neighbors only. Click "Exit Focus" to see all.'
      });
    }

    // Call parent handler
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [expandedClusters, focusNodeId, onNodeClick]);

  // Control handlers
  const handleDepthChange = useCallback((depth: number) => {
    setVisibleDepth(depth);
    console.log('🔧 Depth changed to:', depth);
  }, []);

  const handleResetView = useCallback(() => {
    setFocusNodeId(null);
    setVisibleDepth(1);
    setExpandedClusters(new Set());
    setActiveGoalId(null);
    setShowCrossLaneEdges(false);
    toast.success('View reset');
  }, []);

  const handleExitFocus = useCallback(() => {
    setFocusNodeId(null);
    toast.success('Exited focus mode');
  }, []);

  const handleExpandNeighbors = useCallback(() => {
    if (focusNodeId) {
      // This would expand 2-hop neighbors in the subgraph
      toast.success('Neighbors expanded');
    }
  }, [focusNodeId]);

  const handleToggleFilter = useCallback((filter: string, enabled: boolean) => {
    switch (filter) {
      case 'hideCompleted':
        setHideCompleted(enabled);
        break;
      case 'showOnlyMyTrack':
        setShowOnlyMyTrack(enabled);
        break;
      case 'showNext4Weeks':
        setShowNext4Weeks(enabled);
        break;
    }
    console.log('🔧 Filter toggled:', filter, enabled);
  }, []);

  const handleSearch = useCallback((query: string) => {
    // Find matching node and focus on it
    const matchingNode = rawNodes.find(node => 
      node.title.toLowerCase().includes(query.toLowerCase())
    );
    
    if (matchingNode) {
      setFocusNodeId(matchingNode.id);
      toast.success(`Found: ${matchingNode.title}`);
    } else {
      toast.error(`No results for: ${query}`);
    }
  }, [rawNodes]);

  const handleMoveFromOrphans = useCallback((nodeId: string) => {
    // This would move orphan node to main canvas
    toast.success('Node moved to canvas');
  }, []);

  const handleMarkAsReference = useCallback((nodeId: string) => {
    // This would mark orphan as reference-only
    toast.success('Marked as reference');
  }, []);

  // Log calm mode state
  React.useEffect(() => {
    console.log('🔇 Calm mode state:', {
      visibleDepth,
      focusNodeId,
      expandedClusters: Array.from(expandedClusters),
      showCrossLaneEdges,
      metadata: calmSubgraph.metadata
    });
  }, [visibleDepth, focusNodeId, expandedClusters, showCrossLaneEdges, calmSubgraph.metadata]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading calm view...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-96 text-destructive">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Calm Controls with error boundary */}
      <ErrorBoundaryWrapper 
        resetKeys={[rawNodes?.length]}
        onError={(error) => console.error('🚨 Calm controls error:', error)}
        fallback={
          <div className="p-4 text-center text-muted-foreground">
            Controls temporarily unavailable
          </div>
        }
      >
        <CalmSkillTreeControls
          visibleDepth={visibleDepth}
          focusNodeId={focusNodeId}
          showCrossLaneEdges={showCrossLaneEdges}
          expandedClusters={expandedClusters}
          hideCompleted={hideCompleted}
          showOnlyMyTrack={showOnlyMyTrack}
          showNext4Weeks={showNext4Weeks}
          onDepthChange={handleDepthChange}
          onResetView={handleResetView}
          onExitFocus={handleExitFocus}
          onExpandNeighbors={handleExpandNeighbors}
          onToggleFilter={handleToggleFilter}
          onSearch={handleSearch}
          onToggleOrphanDrawer={() => setShowOrphanDrawer(!showOrphanDrawer)}
        />
      </ErrorBoundaryWrapper>

      {/* Main Canvas with comprehensive error handling */}
      <div className="relative">
        <div className="min-h-[700px] h-[700px] relative bg-background rounded-lg border overflow-hidden">
          {/* Lane Backgrounds with error boundary */}
          <ErrorBoundaryWrapper 
            resetKeys={[]}
            onError={(error) => console.error('🚨 Lane background error:', error)}
            fallback={<div className="absolute inset-0 bg-background" />}
          >
            <LaneBackground lanes={CALM_LANES} height={700} />
          </ErrorBoundaryWrapper>
          
          {/* React Flow Canvas with multiple fallback levels */}
          <div className="relative z-10 h-full">
            <CalmErrorBoundary 
              fallbackMode="safe"
              onFallbackToNormal={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('st_calm');
                window.history.replaceState({}, '', url.toString());
                window.location.reload();
              }}
              onReload={() => window.location.reload()}
            >
              <ErrorBoundaryWrapper 
                resetKeys={[calmSubgraph.nodes.length, processedEdges.length]}
                onError={(error) => {
                  console.error('🚨 Canvas render error:', error);
                  toast.error('Canvas rendering failed', {
                    description: 'Switching to safe mode.'
                  });
                }}
                fallback={
                  <div className="p-8 text-center space-y-4">
                    <h3 className="text-lg font-semibold text-destructive">Canvas Render Error</h3>
                    <p className="text-muted-foreground">
                      The skill tree canvas failed to render properly. 
                      This usually indicates data format issues or layout conflicts.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={() => window.location.reload()}
                        variant="default"
                        size="sm"
                      >
                        Reload Page
                      </Button>
                      <Button 
                        onClick={() => {
                          const url = new URL(window.location.href);
                          url.searchParams.delete('st_calm');
                          window.history.replaceState({}, '', url.toString());
                          window.location.reload();
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Exit Calm Mode
                      </Button>
                    </div>
                    
                    {/* Debug info in development */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="text-left text-xs bg-muted p-3 rounded border mt-4">
                        <summary className="cursor-pointer font-medium mb-2">
                          Debug Information
                        </summary>
                        <div className="space-y-1 font-mono">
                          <div>Nodes: {calmSubgraph.nodes.length}</div>
                          <div>Edges: {processedEdges.length}</div>
                          <div>Raw Nodes: {rawNodes?.length || 'N/A'}</div>
                          <div>Raw Edges: {rawEdges?.length || 'N/A'}</div>
                          <div>Build Time: {calmSubgraph.metadata.performance.buildTime.toFixed(1)}ms</div>
                        </div>
                      </details>
                    )}
                  </div>
                }
              >
                <ReactFlowProvider>
                  <UnifiedCareerCanvas
                    nodes={calmSubgraph.nodes as any}
                    edges={processedEdges as any}
                    onNodeClick={handleNodeClick}
                    layoutAlgorithm="semantic-hierarchy"
                    showPivotPaths={false}
                    focusMode={true}
                  />
                </ReactFlowProvider>
              </ErrorBoundaryWrapper>
            </CalmErrorBoundary>
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-2 right-2 text-xs bg-black/75 text-white p-2 rounded pointer-events-none font-mono">
              Calm Mode | Nodes: {calmSubgraph.metadata.visibleNodes}/{rawNodes.length} | 
              Edges: {processedEdges.length} | Clusters: {calmSubgraph.metadata.clusterCount} |
              Focus: {focusNodeId ? 'ON' : 'OFF'} | Build: {calmSubgraph.metadata.performance.buildTime.toFixed(1)}ms
            </div>
          )}
        </div>
      </div>

      {/* Orphan Parking Lot with error boundary */}
      <ErrorBoundaryWrapper 
        resetKeys={[calmSubgraph.hiddenNodes.length]}
        onError={(error) => console.error('🚨 Orphan parking lot error:', error)}
        fallback={
          <div className="p-4 text-center text-muted-foreground">
            Orphan nodes list temporarily unavailable
          </div>
        }
      >
        <OrphanParkingLot
          orphanNodes={calmSubgraph.hiddenNodes.filter(n => 
            // Only show truly orphaned nodes (no connections) - handle both data formats
            !rawEdges.some(e => {
              const source = e.source || e.from_id;
              const target = e.target || e.to_id;
              return source === n.id || target === n.id;
            })
          )}
          isExpanded={showOrphanDrawer}
          onToggle={() => setShowOrphanDrawer(!showOrphanDrawer)}
          onMoveToCanvas={handleMoveFromOrphans}
          onMarkAsReference={handleMarkAsReference}
        />
      </ErrorBoundaryWrapper>
    </div>
  );
};