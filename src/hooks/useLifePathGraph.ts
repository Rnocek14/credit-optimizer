import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  GraphNode, 
  GraphEdge, 
  PathResult, 
  PathfindingResult, 
  ScoringConfig,
  CreditCalculation
} from '@/types/lifePathGraph';
import { dijkstraPathfinding } from '@/lib/pathfinding/dijkstra';
import { generateEnhancedMockGraph } from '@/lib/pathfinding/mockDataEnhanced';
import { validateGraphIntegrity } from '@/lib/pathfinding/validators';
import { assignDepthToMainPath, calculatePathMetrics } from '@/lib/pathfinding/algorithms';

export interface LifePathGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useLifePathGraph(goalId?: string, scoringConfig?: ScoringConfig) {
  const [graph, setGraph] = useState<LifePathGraph>({ nodes: [], edges: [] });
  const [pathfindingResult, setPathfindingResult] = useState<PathfindingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load graph data
  useEffect(() => {
    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        // For Phase 1, use enhanced mock data
        const mockGraph = generateEnhancedMockGraph();
        
        // Validate graph integrity
        validateGraphIntegrity(mockGraph.nodes, mockGraph.edges);
        
        setGraph(mockGraph);

        console.log('📊 Life Path Graph loaded:', {
          nodes: mockGraph.nodes.length,
          edges: mockGraph.edges.length,
          goalId
        });

      } catch (err) {
        console.error('❌ Error loading life path graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [goalId]);

  // Find optimal paths using various algorithms
  const findPaths = useCallback(async (targetGoalId: string) => {
    if (!graph.nodes.length || !targetGoalId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Finding paths to goal:', targetGoalId);

      // Find goal node
      const goalNode = graph.nodes.find(n => n.id === targetGoalId || n.title.toLowerCase().includes(targetGoalId.toLowerCase()));
      if (!goalNode) {
        throw new Error(`Goal node not found: ${targetGoalId}`);
      }

      // Enhanced pathfinding - Phase 1 implementation with mock completed nodes
      const mockUserState: any = { 
        completedNodeIds: ['skill-math-fundamentals', 'skill-programming-basics'], 
        existingCredits: [] 
      };
      
      const basicPath = dijkstraPathfinding(graph, goalNode.id, 'time', {
        allowGhost: false,
        userState: mockUserState,
        scoringConfig
      });
      
      const costOptimizedPath = dijkstraPathfinding(graph, goalNode.id, 'cost', {
        allowGhost: false,
        userState: mockUserState,
        scoringConfig
      });
      
      const creditOptimizedPath = dijkstraPathfinding(graph, goalNode.id, 'creditLoss', {
        allowGhost: false,
        userState: mockUserState,
        scoringConfig
      });
      
      // Assign depths to main path nodes
      const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
      const edgeMap = new Map(graph.edges.map(e => [e.id, e]));
      assignDepthToMainPath(basicPath, nodeMap);

      // Create path results with enhanced metrics
      const createPathResult = (path: string[], optimizedFor: string): PathResult => {
        const pathNodes = path.map(id => graph.nodes.find(n => n.id === id)).filter(Boolean) as GraphNode[];
        const metrics = calculatePathMetrics(path, nodeMap, edgeMap);

        return {
          id: `path-${optimizedFor}-${Date.now()}`,
          name: `${optimizedFor.charAt(0).toUpperCase() + optimizedFor.slice(1)} Optimized Path`,
          description: `Path optimized for ${optimizedFor}`,
          nodeIds: path,
          edgeIds: [], // TODO: Calculate actual edge IDs
          totalTime: metrics.totalTime,
          totalCost: metrics.totalCost,
          totalCredits: metrics.totalCredits,
          creditLoss: metrics.creditLoss,
          difficultyScore: pathNodes.reduce((sum, node) => sum + node.difficulty, 0) / pathNodes.length,
          roiScore: 75, // Mock ROI score
          optimizedFor: [optimizedFor as any],
          hasGhostNodes: false,
          missingPrerequisites: [],
          suggestedAlternatives: [],
          feasible: true,
          warnings: [],
          metadata: {
            institutionsCount: metrics.institutionsCount,
            prerequisitesSatisfied: metrics.prerequisitesSatisfied
          }
        };
      };

      // Ensure minimally walkable paths (fallback if < 3 nodes)
      const ensureMinimalPath = (path: string[], pathType: string): string[] => {
        if (path.length >= 3) return path;
        
        console.warn(`[pathfinding] Path too short (${path.length}), creating fallback for ${pathType}`);
        
        // Build fallback: skill → intro course → creditBlock → credential → job
        const skill = graph.nodes.find(n => n.type === 'skill');
        const introCourse = graph.nodes.find(n => 
          n.type === 'course' && 
          (n.prerequisiteIds.length <= 1 || n.tags?.includes('intro'))
        );
        const creditBlock = graph.nodes.find(n => n.type === 'creditBlock');
        const credential = graph.nodes.find(n => n.type === 'credential');
        const job = graph.nodes.find(n => n.type === 'job' && n.id === targetGoalId);
        
        const fallbackPath = [skill?.id, introCourse?.id, creditBlock?.id, credential?.id, job?.id]
          .filter(Boolean) as string[];
        
        console.log(`[pathfinding] Generated fallback path: ${fallbackPath.join(' → ')}`);
        return fallbackPath.length >= 3 ? fallbackPath : path;
      };

      const enhancedBasicPath = ensureMinimalPath(basicPath, 'time');
      const enhancedCostPath = ensureMinimalPath(costOptimizedPath, 'cost');
      const enhancedCreditPath = ensureMinimalPath(creditOptimizedPath, 'credits');

      const result: PathfindingResult = {
        fastest: createPathResult(enhancedBasicPath, 'time'),
        cheapest: createPathResult(enhancedCostPath, 'cost'),
        creditMaximized: createPathResult(enhancedCreditPath, 'credits'),
        paretoFrontier: [],
        ghostPaths: [],
        tradeoffs: {
          timeVsCost: { correlation: -0.6, alternatives: [] },
          costVsCredits: { correlation: 0.3, alternatives: [] }
        },
        recommendations: {
          primary: createPathResult(basicPath, 'balanced'),
          alternatives: [],
          reasoning: 'This path offers the best balance of time and cost efficiency for your current skill level.'
        }
      };

      // Add Pareto frontier (simplified for Phase 0)
      result.paretoFrontier = [result.fastest, result.cheapest, result.creditMaximized];

      setPathfindingResult(result);
      console.log('✅ Pathfinding complete:', result);

    } catch (err) {
      console.error('❌ Error in pathfinding:', err);
      setError(err instanceof Error ? err.message : 'Pathfinding failed');
    } finally {
      setLoading(false);
    }
  }, [graph]);

  // Calculate credit transfers
  const calculateCreditTransfer = useCallback(async (
    sourceCredits: { nodeId: string; credits: number }[],
    targetInstitution: string
  ): Promise<CreditCalculation> => {
    // Mock implementation for Phase 0
    const totalEarned = sourceCredits.reduce((sum, c) => sum + c.credits, 0);
    const maxTransfer = Math.min(totalEarned, 60); // Mock 60 credit cap
    const creditsLost = totalEarned - maxTransfer;

    return {
      totalEarnedCredits: totalEarned,
      transferableCredits: maxTransfer,
      creditsLost,
      residencyRequirement: 60, // Mock residency requirement
      additionalCreditsNeeded: Math.max(0, 120 - maxTransfer), // Mock bachelor's degree requirement
      breakdown: sourceCredits.map(sc => ({
        nodeId: sc.nodeId,
        earnedCredits: sc.credits,
        transferredCredits: Math.min(sc.credits, maxTransfer),
        lostCredits: Math.max(0, sc.credits - maxTransfer),
        reason: maxTransfer < sc.credits ? 'transfer cap exceeded' : undefined
      }))
    };
  }, []);

  return {
    graph,
    pathfindingResult,
    loading,
    error,
    findPaths,
    calculateCreditTransfer
  };
}