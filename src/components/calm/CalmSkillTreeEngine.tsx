import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { validateCalmModeData } from '@/lib/calmModeValidation';
import { buildCalmSubgraph } from '@/lib/calmSubgraph';
import { CalmErrorBoundary } from './CalmErrorBoundary';

export function CalmSkillTreeEngine() {
  console.log('🌟 CalmSkillTreeEngine: Starting render');

  // Fetch data with comprehensive error handling
  const { data: nodes = [], isLoading: nodesLoading, error: nodesError } = useQuery({
    queryKey: ['career-graph-nodes'],
    queryFn: async () => {
      try {
        console.log('🌟 Calm Mode: Fetching nodes...');
        const { data, error } = await supabase
          .from('career_graph_nodes')
          .select('*')
          .eq('active', true);
        
        if (error) {
          console.error('❌ Calm Mode: Error fetching nodes:', error);
          throw error;
        }
        console.log('✅ Calm Mode: Fetched nodes:', data?.length || 0, 'items');
        return data || [];
      } catch (error) {
        console.error('💥 Calm Mode: Critical error fetching nodes:', error);
        throw error;
      }
    },
  });

  const { data: edges = [], isLoading: edgesLoading, error: edgesError } = useQuery({
    queryKey: ['career-graph-edges'],
    queryFn: async () => {
      try {
        console.log('🌟 Calm Mode: Fetching edges...');
        const { data, error } = await supabase
          .from('career_graph_edges')
          .select('*')
          .eq('active', true);
        
        if (error) {
          console.error('❌ Calm Mode: Error fetching edges:', error);
          throw error;
        }
        console.log('✅ Calm Mode: Fetched edges:', data?.length || 0, 'items');
        return data || [];
      } catch (error) {
        console.error('💥 Calm Mode: Critical error fetching edges:', error);
        throw error;
      }
    },
  });

  // Process data with comprehensive error handling
  const { processedNodes, processedEdges, validationResult, processingError } = useMemo(() => {
    console.log('🧠 Calm Mode: Processing data...');
    
    try {
      // Early return for loading state
      if (!nodes || !edges) {
        console.log('ℹ️ Calm Mode: Data not yet loaded');
        return {
          processedNodes: [],
          processedEdges: [],
          validationResult: { isValid: true, errors: [], warnings: ['Data loading'] },
          processingError: null
        };
      }

      // Validate inputs are arrays
      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        const error = 'Invalid data format: nodes and edges must be arrays';
        console.error('❌ Calm Mode:', error);
        return {
          processedNodes: [],
          processedEdges: [],
          validationResult: { isValid: false, errors: [error], warnings: [] },
          processingError: new Error(error)
        };
      }

      // Early return for empty data - create a placeholder
      if (nodes.length === 0 && edges.length === 0) {
        console.log('ℹ️ Calm Mode: No data available, creating placeholder');
        return {
          processedNodes: [{
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
          processedEdges: [],
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
          processedNodes: [],
          processedEdges: [],
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
          processedNodes: [],
          processedEdges: [],
          validationResult: { isValid: false, errors: [error], warnings: [] },
          processingError: new Error(error)
        };
      }

      console.log('✅ Calm Mode: Subgraph built successfully');
      console.log('📊 Calm Mode: Processed', result.nodes.length, 'nodes and', result.edges.length, 'edges');
      
      return {
        processedNodes: result.nodes,
        processedEdges: result.edges,
        validationResult: validation,
        processingError: null
      };
      
    } catch (error) {
      console.error('💥 Calm Mode: Critical error during data processing:', error);
      return {
        processedNodes: [],
        processedEdges: [],
        validationResult: { 
          isValid: false, 
          errors: [`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`], 
          warnings: [] 
        },
        processingError: error instanceof Error ? error : new Error('Unknown processing error')
      };
    }
  }, [nodes, edges]);

  const isLoading = nodesLoading || edgesLoading;
  const hasError = nodesError || edgesError || processingError;

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
    const errorMessage = nodesError?.message || edgesError?.message || processingError?.message || 'Unknown error occurred';
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
                window.location.reload();
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
  if (!validationResult.isValid) {
    console.error('🚨 Calm Mode: Displaying validation error state');
    
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Data Validation Failed</h3>
          </div>
          <div className="space-y-2 text-sm">
            {validationResult.errors.map((error, i) => (
              <p key={i} className="text-destructive">{error}</p>
            ))}
            {validationResult.warnings.map((warning, i) => (
              <p key={i} className="text-amber-600">{warning}</p>
            ))}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                console.log('🔄 Calm Mode: User clicked retry after validation error');
                window.location.reload();
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
  console.log('🎨 Calm Mode: Rendering main UI with', processedNodes.length, 'nodes and', processedEdges.length, 'edges');
  
  return (
    <CalmErrorBoundary 
      fallbackMode="safe"
      onFallbackToNormal={() => {
        console.log('🔄 Calm Mode: Error boundary triggered fallback to normal');
        const url = new URL(window.location.href);
        url.searchParams.delete('st_calm');
        window.history.replaceState({}, '', url.toString());
        window.location.reload();
      }}
    >
      <div className="space-y-6">
        {/* Main Canvas with comprehensive error isolation */}
        <div className="min-h-[600px] rounded-lg border bg-background">
          <CalmErrorBoundary 
            fallbackMode="safe"
            onFallbackToNormal={() => {
              console.log('🔄 Calm Mode: Canvas error boundary triggered fallback');
              const url = new URL(window.location.href);
              url.searchParams.delete('st_calm');
              window.history.replaceState({}, '', url.toString());
              window.location.reload();
            }}
          >
            <SafeCanvas 
              nodes={processedNodes}
              edges={processedEdges}
            />
          </CalmErrorBoundary>
        </div>
      </div>
    </CalmErrorBoundary>
  );
}

// Safe canvas wrapper with additional error isolation
function SafeCanvas({ nodes, edges }: { nodes: any[], edges: any[] }) {
  try {
    console.log('🎨 SafeCanvas: Rendering with', nodes.length, 'nodes and', edges.length, 'edges');
    
    // Additional safety checks
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      console.error('🚨 SafeCanvas: Invalid data types');
      throw new Error('Invalid node or edge data format');
    }
    
    return (
      <UnifiedCareerCanvas
        nodes={nodes}
        edges={edges}
        className="h-[600px]"
      />
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