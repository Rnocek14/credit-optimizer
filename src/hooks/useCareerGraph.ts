// NEW GRAPH HOOK: Unified Career Graph Data Management
// Replaces the old fragmented data fetching approach

import { useState, useEffect, useCallback } from 'react';
import { CareerGraph, createCareerGraphFromDatabase, type GraphNode, type GraphEdge } from '@/lib/careerGraph';

// Export types for use in other components
export type { GraphNode, GraphEdge } from '@/lib/careerGraph';

export interface CareerGraphState {
  graph: CareerGraph | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  error: string | null;
  statistics: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
    averageConnections: number;
  } | null;
}

export interface UseCareerGraphOptions {
  careerPathId?: string;
  autoValidate?: boolean;
}

export const useCareerGraph = (options: UseCareerGraphOptions = {}) => {
  const { careerPathId, autoValidate = true } = options;
  
  const [state, setState] = useState<CareerGraphState>({
    graph: null,
    nodes: [],
    edges: [],
    loading: false,
    error: null,
    statistics: null
  });

  // PR-2: GraphHash for stable layout triggering
  const [graphHash, setGraphHash] = useState<string>('');

  // PR-2: Graph hash calculation for layout cache
  const calculateGraphHash = useCallback((nodes: any[], edges: any[]): string => {
    const nodeHashes = nodes.map(n => `${n.id}:${n.type}:${n.title}`).sort();
    const edgeHashes = edges.map(e => `${e.from_id}->${e.to_id}:${e.edge_type}`).sort();
    const combined = [...nodeHashes, ...edgeHashes].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Load graph data - UNIFIED SOURCE ONLY
  const loadGraph = useCallback(async (pathId?: string) => {
    console.log('🚀 Loading unified career graph...', { pathId });
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Import here to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Load nodes from unified table only
      console.log('📦 Fetching career_graph_nodes...');
      const { data: nodes, error: nodesErr } = await supabase
        .from('career_graph_nodes')
        .select('*')
        .eq('active', true);

      // Load edges from unified table only  
      console.log('🔗 Fetching career_graph_edges...');
      const { data: edges, error: edgesErr } = await supabase
        .from('career_graph_edges')
        .select('*')
        .limit(5000);

      // Hard validation and logging (no silent fallbacks)
      if (nodesErr || edgesErr) {
        console.error('❌ SkillGraph load failed', { nodesErr, edgesErr });
        throw nodesErr ?? edgesErr;
      }
      if (!Array.isArray(nodes) || nodes.length === 0) {
        console.warn('⚠️ No career_graph_nodes found (active=true). Found:', nodes?.length || 0);
      }
      if (!Array.isArray(edges)) {
        console.warn('⚠️ career_graph_edges returned non-array.');
      }

      // 🔧 STEP 3: Normalize titles at source - guarantee title at top level
      const graphNodes = nodes.map(node => {
        // Extract title from root properties (nodes table doesn't have data column)
        const normalizedTitle = node.title || 'Untitled';
        
        return {
          id: String(node.id), // ensure string ID
          type: (node.node_type ?? 'skill') as any,
          title: normalizedTitle, // always present at top level
          description: node.description ?? '',
          category: node.category ?? null,
          data: { 
            title: normalizedTitle, // ensure in data for compatibility
            ...node // include all original properties
          },
          estimated_time_hours: node.estimated_time_hours,
          difficulty_level: node.difficulty_level,
          market_demand_score: node.market_demand_score
        };
      }) as any;

      const graphEdges = edges.map(e => ({
        id: e.id ?? `${e.from_id}->${e.to_id}:${e.edge_type}`,
        from_id: e.from_id,
        to_id: e.to_id,
        from_type: 'skill' as any,
        to_type: 'skill' as any,
        source: e.from_id,
        target: e.to_id,
        edge_type: (e.edge_type ?? 'supports').toLowerCase(),
        type: e.edge_type,
        importance_weight: e.importance_weight ?? 1,
        confidence_score: e.confidence_score ?? 0.8,
        reasoning: e.reasoning,
        time_cost_hours: 0,
        monetary_cost: 0,
        difficulty_multiplier: 1.0
      })) as any;

      console.log('🧩 Unified data loaded', {
        nodes: graphNodes?.length, 
        edges: graphEdges?.length,
        nodeTypes: [...new Set(graphNodes.map(n => n.type))],
        edgeTypes: [...new Set(graphEdges.map(e => e.edge_type))]
      });

      // Calculate hash for layout stability
      const newGraphHash = calculateGraphHash(graphNodes, graphEdges);
      setGraphHash(newGraphHash);
      
      const statistics = {
        totalNodes: graphNodes.length,
        totalEdges: graphEdges.length,
        nodesByType: graphNodes.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        edgesByType: graphEdges.reduce((acc, e) => {
          acc[e.edge_type] = (acc[e.edge_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageConnections: graphNodes.length > 0 ? graphEdges.length / graphNodes.length : 0
      };

      setState({
        graph: null, // We don't need the old graph object
        nodes: graphNodes,
        edges: graphEdges,
        loading: false,
        error: null,
        statistics
      });
      
      console.log('✅ Unified career graph loaded successfully:', statistics, `Hash: ${newGraphHash}`);
      
    } catch (error) {
      console.error('❌ Error loading unified career graph:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [calculateGraphHash]);

  // Reload graph data
  const reload = useCallback(() => {
    return loadGraph(careerPathId);
  }, [loadGraph, careerPathId]);

  // Find optimal paths
  const findOptimalPaths = useCallback((
    startType: 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification',
    startId: string,
    goalType: 'job' | 'skill' | 'step' | 'course' | 'project' | 'certification',
    goalId: string,
    criteria: 'time' | 'cost' | 'difficulty' | 'roi' = 'time'
  ) => {
    if (!state.graph) {
      console.warn('⚠️ No graph loaded for pathfinding');
      return [];
    }
    
    return state.graph.findOptimalPaths(startType, startId, goalType, goalId, criteria);
  }, [state.graph]);

  // Find pivot opportunities
  const findPivotOpportunities = useCallback(async (fromJobId: string, toJobId: string) => {
    if (!state.graph) {
      console.warn('⚠️ No graph loaded for pivot analysis');
      return [];
    }
    
    return state.graph.findPivotOpportunities(fromJobId, toJobId);
  }, [state.graph]);

  // Calculate Career Readiness Index
  const calculateCRI = useCallback(async (userId: string, targetJobId: string) => {
    if (!state.graph) {
      console.warn('⚠️ No graph loaded for CRI calculation');
      return null;
    }
    
    return state.graph.calculateCRI(userId, targetJobId);
  }, [state.graph]);

  // Get node by type and ID
  const getNode = useCallback((type: string, id: string) => {
    if (!state.graph) return null;
    return state.graph.getNode(type as any, id);
  }, [state.graph]);

  // Get edges for a node
  const getNodeEdges = useCallback((type: string, id: string, direction: 'incoming' | 'outgoing' = 'outgoing') => {
    if (!state.graph) return [];
    
    return direction === 'outgoing' 
      ? state.graph.getOutgoingEdges(type as any, id)
      : state.graph.getIncomingEdges(type as any, id);
  }, [state.graph]);

  // Filter nodes by type
  const getNodesByType = useCallback((type: string) => {
    return state.nodes.filter(node => node.type === type);
  }, [state.nodes]);

  // Filter edges by type
  const getEdgesByType = useCallback((edgeType: string) => {
    return state.edges.filter(edge => edge.edge_type === edgeType);
  }, [state.edges]);

  // Search nodes by title
  const searchNodes = useCallback((query: string, types?: string[]) => {
    const normalizedQuery = query.toLowerCase();
    return state.nodes.filter(node => {
      const matchesQuery = node.title.toLowerCase().includes(normalizedQuery) ||
                          node.description?.toLowerCase().includes(normalizedQuery);
      const matchesType = !types || types.includes(node.type);
      return matchesQuery && matchesType;
    });
  }, [state.nodes]);

  // Load initial data
  useEffect(() => {
    loadGraph(careerPathId);
  }, [loadGraph, careerPathId]);

  return {
    // State
    ...state,
    graphHash,
    
    // Actions
    reload,
    loadGraph,
    
    // Graph operations
    findOptimalPaths,
    findPivotOpportunities,
    calculateCRI,
    
    // Data access
    getNode,
    getNodeEdges,
    getNodesByType,
    getEdgesByType,
    searchNodes,
    
    // Computed properties
    isEmpty: state.nodes.length === 0,
    hasJobs: state.nodes.some(node => node.type === 'job'),
    hasSkills: state.nodes.some(node => node.type === 'skill'),
    hasCourses: state.nodes.some(node => node.type === 'course'),
    hasProjects: state.nodes.some(node => node.type === 'project'),
    hasCertifications: state.nodes.some(node => node.type === 'certification'),
    hasSteps: state.nodes.some(node => node.type === 'step'),
  };
};