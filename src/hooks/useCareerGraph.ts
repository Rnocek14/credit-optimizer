// NEW GRAPH HOOK: Unified Career Graph Data Management
// Replaces the old fragmented data fetching approach

import { useState, useEffect, useCallback } from 'react';
import { CareerGraph, createCareerGraphFromDatabase, type GraphNode, type GraphEdge } from '@/lib/careerGraph';

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

  // Load graph data
  const loadGraph = useCallback(async (pathId?: string) => {
    console.log('🔄 Loading career graph...', { pathId });
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const graph = await createCareerGraphFromDatabase(pathId);
      
      // Validate graph if requested
      if (autoValidate) {
        const validation = graph.validateGraph();
        if (!validation.isValid) {
          console.warn('⚠️ Graph validation issues:', validation.errors);
          // Continue anyway but log warnings
        }
      }
      
      const statistics = graph.getStatistics();
      const nodes = Array.from((graph as any).nodes.values()) as GraphNode[];
      const edges = (graph as any).edges as GraphEdge[];
      
      // PR-2: Calculate stable graph hash for layout cache invalidation
      const newGraphHash = calculateGraphHash(nodes, edges);
      setGraphHash(newGraphHash);
      
      setState({
        graph,
        nodes,
        edges,
        loading: false,
        error: null,
        statistics
      });
      
      console.log('✅ Career graph loaded successfully:', statistics, `Hash: ${newGraphHash}`);
      
    } catch (error) {
      console.error('❌ Error loading career graph:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [autoValidate, calculateGraphHash]);

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