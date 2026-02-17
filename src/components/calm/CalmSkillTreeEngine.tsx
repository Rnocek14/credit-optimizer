import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { validateCalmModeData } from '@/lib/calmModeValidation';
import { buildCalmSubgraph } from '@/lib/calmSubgraph';
import { EnhancedErrorBoundary } from '@/components/enhanced/EnhancedErrorBoundary';

export interface CalmSkillTreeEngineProps {
  nodes: any[];
  edges: any[];
  loading: boolean;
  error: string | null;
  onNodeClick?: (node: any) => void;
  onReload?: () => void;
  criScore?: any;
  userProgress?: any[];
  getReadinessLevel?: (score: number) => { level: string; color: string };
}

export function CalmSkillTreeEngine({
  nodes: rawNodes = [],
  edges: rawEdges = [],
  loading: externalLoading = false,
  error: externalError = null,
  onNodeClick,
  onReload
}: CalmSkillTreeEngineProps) {
  console.log('🌟 CalmSkillTreeEngine: Starting render with external data', {
    rawNodesCount: rawNodes?.length,
    rawEdgesCount: rawEdges?.length,
    externalLoading,
    externalError: !!externalError
  });

  // If external data is provided, use it directly; otherwise fetch
  const shouldFetch = !rawNodes.length && !rawEdges.length && !externalLoading && !externalError;

  // Simple data fetching without complex generics - bypass supabase typing issues
  const fetchNodes = async (): Promise<any[]> => {
    console.log('🌟 Calm Mode: Fetching nodes...');
    try {
      // Use any to bypass complex supabase typing
      const supabaseClient: any = supabase;
      const result = await supabaseClient
        .from('career_graph_nodes')
        .select('*')
        .eq('active', true);
      
      if (result.error) throw result.error;
      return result.data || [];
    } catch (error) {
      console.error('Error fetching nodes:', error);
      throw error;
    }
  };

  const fetchEdges = async (): Promise<any[]> => {
    console.log('🌟 Calm Mode: Fetching edges...');
    try {
      // Use any to bypass complex supabase typing
      const supabaseClient: any = supabase;
      const result = await supabaseClient
        .from('career_graph_edges')
        .select('*');
      
      if (result.error) throw result.error;
      return result.data || [];
    } catch (error) {
      console.error('Error fetching edges:', error);
      throw error;
    }
  };

  const nodesQuery = useQuery({
    queryKey: ['career-graph-nodes'],
    queryFn: fetchNodes,
    enabled: shouldFetch,
  });

  const edgesQuery = useQuery({
    queryKey: ['career-graph-edges'], 
    queryFn: fetchEdges,
    enabled: shouldFetch,
  });

  // Use external data if provided, otherwise use fetched data
  const nodes = rawNodes.length > 0 ? rawNodes : (nodesQuery.data || []);
  const edges = rawEdges.length > 0 ? rawEdges : (edgesQuery.data || []);

  // Process data with simplified typing to avoid infinite recursion
  const processedData = useMemo(() => {
    console.log('🧠 Calm Mode: Processing data...');
    
    try {
      // Early return for loading state
      if (!nodes || !edges) {
        console.log('ℹ️ Calm Mode: Data not yet loaded');
        return {
          nodes: [],
          edges: [],
          validationResult: { isValid: true, errors: [], warnings: ['Data loading'] },
          processingError: null
        };
      }

      // Validate inputs are arrays
      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        const error = 'Invalid data format: nodes and edges must be arrays';
        console.error('❌ Calm Mode:', error);
        return {
          nodes: [],
          edges: [],
          validationResult: { isValid: false, errors: [error], warnings: [] },
          processingError: new Error(error)
        };
      }

      // Early return for empty data - create a placeholder
      if (nodes.length === 0 && edges.length === 0) {
        console.log('ℹ️ Calm Mode: No data available, creating placeholder');
        return {
          nodes: [{
            id: 'placeholder-node',
            type: 'skill',
            position: { x: 300, y: 200 },
            data: {
              title: 'No Skills Available',
              description: 'No skill data found in the database',
              category: 'placeholder',
              level: 1,
              isCompleted: false,
              requiredXP: 0,
              unlockedAt: null,
              completedAt: null,
              tags: ['placeholder'],
              metadata: { placeholder: true }
            },
            style: { width: 200, height: 120 }
          }],
          edges: [],
          validationResult: { isValid: true, errors: [], warnings: ['No data available - showing placeholder'] },
          processingError: null
        };
      }

      // Validate data format
      const validation = validateCalmModeData(nodes, edges);
      console.log('🔍 Calm Mode: Validation result:', validation);

      if (!validation.isValid) {
        console.error('❌ Calm Mode: Data validation failed:', validation.errors);
        return {
          nodes: [],
          edges: [],
          validationResult: validation,
          processingError: new Error(`Validation failed: ${validation.errors.join(', ')}`)
        };
      }

      // Build the subgraph with error handling
      console.log('🔄 Calm Mode: Building subgraph...');
      const result = buildCalmSubgraph(nodes, edges);
      
      // Validate the result
      if (!result || !Array.isArray(result.nodes) || !Array.isArray(result.edges)) {
        const error = 'Invalid subgraph result';
        console.error('❌ Calm Mode:', error);
        return {
          nodes: [],
          edges: [],
          validationResult: { isValid: false, errors: [error], warnings: [] },
          processingError: new Error(error)
        };
      }

      console.log('✅ Calm Mode: Subgraph built successfully');
      console.log('📊 Calm Mode: Processed', result.nodes.length, 'nodes and', result.edges.length, 'edges');
      
      return {
        nodes: result.nodes,
        edges: result.edges,
        validationResult: validation,
        processingError: null
      };
      
    } catch (error) {
      console.error('💥 Calm Mode: Critical error during data processing:', error);
      return {
        nodes: [],
        edges: [],
        validationResult: { 
          isValid: false, 
          errors: [`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`], 
          warnings: [] 
        },
        processingError: error instanceof Error ? error : new Error('Unknown processing error')
      };
    }
  }, [nodes, edges]);

  const isLoading = externalLoading || nodesQuery.isLoading || edgesQuery.isLoading;
  const hasError = externalError || nodesQuery.error || edgesQuery.error || processedData.processingError;

  // Loading state
  if (isLoading) {
    console.log('⏳ Calm Mode: Showing loading state');
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading calm skill tree...</p>
        </div>
      </Card>
    );
  }

  // Error state with recovery options
  if (hasError) {
    const errorMessage = externalError || nodesQuery.error?.message || edgesQuery.error?.message || processedData.processingError?.message || 'Unknown error occurred';
    console.error('🚨 Calm Mode: Displaying error state:', errorMessage);
    
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Failed to Load Calm Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {errorMessage}
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                console.log('🔄 Calm Mode: User clicked retry');
                if (onReload) {
                  onReload();
                } else {
                  window.location.reload();
                }
              }} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={() => {
                console.log('🔄 Calm Mode: User switching to normal view');
                const url = new URL(window.location.href);
                url.searchParams.delete('st_calm');
                window.history.replaceState({}, '', url.toString());
                window.location.reload();
              }}
              variant="secondary"
              size="sm"
            >
              Switch to Normal View
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Validation error state
  if (!processedData.validationResult.isValid) {
    console.error('🚨 Calm Mode: Displaying validation error state');
    
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Data Validation Failed</h3>
          </div>
          <div className="space-y-2 text-sm">
            {processedData.validationResult.errors.map((error, i) => (
              <p key={i} className="text-destructive">{error}</p>
            ))}
            {processedData.validationResult.warnings.map((warning, i) => (
              <p key={i} className="text-amber-600">{warning}</p>
            ))}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                console.log('🔄 Calm Mode: User clicked retry after validation error');
                if (onReload) {
                  onReload();
                } else {
                  window.location.reload();
                }
              }} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={() => {
                console.log('🔄 Calm Mode: User switching to normal view after validation error');
                const url = new URL(window.location.href);
                url.searchParams.delete('st_calm');
                window.history.replaceState({}, '', url.toString());
                window.location.reload();
              }}
              variant="secondary"
              size="sm"
            >
              Switch to Normal View
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Main render with comprehensive error boundaries
  console.log('🎨 Calm Mode: Rendering main UI with', processedData.nodes.length, 'nodes and', processedData.edges.length, 'edges');
  console.log('🔍 Sample processed node:', processedData.nodes[0]);
  console.log('🔍 Sample processed edge:', processedData.edges[0]);
  
  // Add localStorage debug flags
  if (typeof window !== 'undefined' && localStorage.getItem('ST_DEBUG_DATA') === '1') {
    console.log('🐛 Debug mode - Full processed data:', { 
      nodes: processedData.nodes, 
      edges: processedData.edges 
    });
  }
  
  return (
    <EnhancedErrorBoundary 
      name="calm-mode"
      onError={() => {
        console.error('🔄 Calm Mode: Error boundary triggered fallback to normal');
      }}
      fallback={({ retry }) => (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Calm mode encountered an error.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={retry} className="bg-primary text-primary-foreground px-4 py-2 rounded">Try Again</button>
            <button onClick={() => { const url = new URL(window.location.href); url.searchParams.delete('st_calm'); window.history.replaceState({}, '', url.toString()); window.location.reload(); }} className="bg-secondary text-secondary-foreground px-4 py-2 rounded">Normal View</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Main Canvas with comprehensive error isolation - Fixed explicit dimensions */}
        <div className="w-full h-[600px] rounded-lg border bg-background">
          <EnhancedErrorBoundary 
            name="calm-canvas"
            onError={() => {
              console.error('🔄 Calm Mode: Canvas error');
            }}
          >
            <SafeCanvas 
              nodes={processedData.nodes}
              edges={processedData.edges}
              onNodeClick={onNodeClick}
            />
          </EnhancedErrorBoundary>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
}

// Safe canvas wrapper with additional error isolation
function SafeCanvas({ nodes, edges, onNodeClick }: { nodes: any[], edges: any[], onNodeClick?: (node: any) => void }) {
  try {
    console.log('🎨 SafeCanvas: Rendering with', nodes.length, 'nodes and', edges.length, 'edges');
    
    // Additional safety checks
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.error('🚨 SafeCanvas: Invalid data types');
      throw new Error('Invalid node or edge data format');
    }
    
    return (
      <ReactFlowProvider>
        <UnifiedCareerCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
        />
      </ReactFlowProvider>
    );
  } catch (error) {
    console.error('💥 SafeCanvas: Rendering error:', error);
    
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <div>
            <h3 className="font-semibold mb-2">Canvas Rendering Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The skill tree canvas could not be rendered properly.
            </p>
            <Button
              onClick={() => {
                console.log('🔄 SafeCanvas: User switching to normal view');
                const url = new URL(window.location.href);
                url.searchParams.delete('st_calm');
                window.history.replaceState({}, '', url.toString());
                window.location.reload();
              }}
              variant="outline"
              size="sm"
            >
              Switch to Normal View
            </Button>
          </div>
        </div>
      </div>
    );
  }
}