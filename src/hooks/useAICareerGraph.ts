import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIGraphNode {
  id: string;
  node_type: 'skill' | 'job' | 'course' | 'project' | 'certification' | 'step';
  title: string;
  description?: string;
  semantic_tags?: string[];
  ai_generated_description?: string;
  ai_confidence_score?: number;
  original_table?: string;
  original_id?: string;
  category?: string;
  difficulty_level?: number;
  estimated_time_hours?: number;
  cost_estimate?: number;
  active?: boolean;
  last_analyzed?: string;
}

export interface SemanticMatch {
  targetId: string;
  similarityScore: number;
  relationshipType: string;
  confidence: number;
  reasoning: string;
}

export interface PathValidation {
  isValid: boolean;
  overallScore: number;
  validationResults: {
    logicalProgression: { score: number; issues: string[] };
    skillDependencies: { score: number; issues: string[] };
    difficultyScaling: { score: number; issues: string[] };
    relevance: { score: number; issues: string[] };
    efficiency: { score: number; issues: string[] };
    feasibility: { score: number; issues: string[] };
  };
  recommendations: Array<{
    type: 'reorder' | 'add' | 'remove' | 'replace';
    description: string;
    priority: 'high' | 'medium' | 'low';
    nodeIndex?: number;
  }>;
  estimatedTimeToCompletion: string;
  confidenceLevel: number;
  reasoning: string;
}

export const useAICareerGraph = () => {
  const [nodes, setNodes] = useState<AIGraphNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    totalNodes: 0,
    nodesByType: {} as Record<string, number>,
    semanticallyEnhanced: 0,
    lastAnalyzed: null as string | null
  });

  // Load all nodes from the unified table
  const loadNodes = useCallback(async (filters?: { 
    nodeTypes?: string[];
    category?: string;
    semanticallyEnhanced?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('career_graph_nodes')
        .select('*')
        .eq('active', true)
        .order('title');

      if (filters?.nodeTypes?.length) {
        query = query.in('node_type', filters.nodeTypes);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.semanticallyEnhanced) {
        query = query.not('semantic_tags', 'is', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(`Failed to load nodes: ${fetchError.message}`);
      }

      setNodes((data || []) as AIGraphNode[]);
      
      // Calculate statistics
      const stats = {
        totalNodes: data?.length || 0,
        nodesByType: data?.reduce((acc, node) => {
          acc[node.node_type] = (acc[node.node_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
        semanticallyEnhanced: data?.filter(n => n.semantic_tags?.length).length || 0,
        lastAnalyzed: data?.reduce((latest, node) => {
          if (!latest || (node.last_analyzed && node.last_analyzed > latest)) {
            return node.last_analyzed;
          }
          return latest;
        }, null as string | null)
      };
      
      setStatistics(stats);
      console.log('🧠 AI Career Graph loaded:', stats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Failed to load AI career graph:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Find semantic matches for a node
  const findSemanticMatches = useCallback(async (
    nodeId: string, 
    targetType: string, 
    limit: number = 5
  ): Promise<SemanticMatch[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('semantic-node-matcher', {
        body: { nodeId, targetType, limit }
      });

      if (error) {
        throw new Error(`Semantic matching failed: ${error.message}`);
      }

      return data?.matches || [];
    } catch (err) {
      console.error('❌ Semantic matching error:', err);
      return [];
    }
  }, []);

  // Validate a career path using AI
  const validatePath = useCallback(async (
    pathNodes: string[],
    userContext?: {
      experienceLevel?: string;
      currentSkills?: string[];
      careerGoal?: string;
      timeConstraint?: string;
    }
  ): Promise<PathValidation | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-path-validator', {
        body: { pathNodes, userContext, validationType: 'logical' }
      });

      if (error) {
        throw new Error(`Path validation failed: ${error.message}`);
      }

      return data?.validation || null;
    } catch (err) {
      console.error('❌ Path validation error:', err);
      return null;
    }
  }, []);

  // Get nodes by type with optional AI enhancement
  const getNodesByType = useCallback((
    nodeType: string, 
    enhancedOnly: boolean = false
  ): AIGraphNode[] => {
    return nodes.filter(node => 
      node.node_type === nodeType && 
      (!enhancedOnly || node.semantic_tags?.length)
    );
  }, [nodes]);

  // Search nodes with semantic understanding
  const searchNodes = useCallback((
    query: string,
    nodeTypes?: string[]
  ): AIGraphNode[] => {
    const searchTerm = query.toLowerCase();
    
    return nodes.filter(node => {
      if (nodeTypes && !nodeTypes.includes(node.node_type)) {
        return false;
      }

      const titleMatch = node.title.toLowerCase().includes(searchTerm);
      const descriptionMatch = node.description?.toLowerCase().includes(searchTerm);
      const tagMatch = node.semantic_tags?.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      const categoryMatch = node.category?.toLowerCase().includes(searchTerm);

      return titleMatch || descriptionMatch || tagMatch || categoryMatch;
    });
  }, [nodes]);

  // Get orphaned nodes (for reconnection)
  const getOrphanedNodes = useCallback(async (): Promise<AIGraphNode[]> => {
    try {
      // Get nodes that have no incoming or outgoing edges
      const { data: edgeNodes, error: edgeError } = await supabase
        .from('career_graph_edges')
        .select('from_id, to_id');

      if (edgeError) {
        throw new Error(`Failed to fetch edges: ${edgeError.message}`);
      }

      const connectedNodeIds = new Set();
      edgeNodes?.forEach(edge => {
        connectedNodeIds.add(edge.from_id);
        connectedNodeIds.add(edge.to_id);
      });

      return nodes.filter(node => !connectedNodeIds.has(node.id));
    } catch (err) {
      console.error('❌ Failed to find orphaned nodes:', err);
      return [];
    }
  }, [nodes]);

  // Initialize on mount
  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  return {
    // State
    nodes,
    loading,
    error,
    statistics,

    // Actions
    loadNodes,
    findSemanticMatches,
    validatePath,
    getNodesByType,
    searchNodes,
    getOrphanedNodes,

    // Utilities
    refreshNodes: () => loadNodes(),
    clearError: () => setError(null)
  };
};