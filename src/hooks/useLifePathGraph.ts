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
  const [activePath, setActivePath] = useState<any>(null);

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

      // Find goal node - ensure we have a valid goal
      let goalNode = graph.nodes.find(n => n.id === targetGoalId);
      if (!goalNode) {
        // Fallback to searching by title
        goalNode = graph.nodes.find(n => n.title.toLowerCase().includes(targetGoalId.toLowerCase()));
      }
      if (!goalNode) {
        // Use a default job node if no specific goal found
        goalNode = graph.nodes.find(n => n.type === 'job') || graph.nodes.find(n => n.type === 'credential');
      }
      if (!goalNode) {
        throw new Error(`No valid goal node found for: ${targetGoalId}`);
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

      // Minimal walkable path guarantee (≥3 nodes)
      type PathResultInternal = { nodeIds: string[]; totalTime: number; totalCost: number; totalCredits: number; creditLoss: number };

      function ensureMinimal(path: PathResultInternal, nodes: Map<string, any>, targetGoalId: string): PathResultInternal {
        if (path?.nodeIds?.length >= 3) return path;

        const ids: string[] = [];
        const skill = Array.from(nodes.values()).find(n => n.type === "skill");
        if (skill) ids.push(skill.id);

        const intro = Array.from(nodes.values()).find(n => n.type === "course" && (n.attributes?.depth === 1 || (n.prerequisiteIds || []).length === 0));
        if (intro) ids.push(intro.id);

        const creditBlock = Array.from(nodes.values()).find(n => n.type === "creditBlock");
        if (creditBlock) ids.push(creditBlock.id);

        const credential = Array.from(nodes.values()).find(n => n.type === "credential");
        if (credential) ids.push(credential.id);

        if (targetGoalId) ids.push(targetGoalId);

        const nodeIds = Array.from(new Set(ids)).slice(0, 5);
        if (nodeIds.length < 3) return path;

        return {
          ...path,
          nodeIds,
          totalTime: path.totalTime || 24,
          totalCost: path.totalCost || 8000,
          totalCredits: path.totalCredits || 60,
          creditLoss: path.creditLoss || 0
        };
      }

      // Ensure minimal paths for all computed results
      const pathNodeMap = new Map(graph.nodes.map(n => [n.id, n]));
      const enhancedBasicPath = ensureMinimal({ nodeIds: basicPath, totalTime: 0, totalCost: 0, totalCredits: 0, creditLoss: 0 }, pathNodeMap, targetGoalId).nodeIds;
      const enhancedCostPath = ensureMinimal({ nodeIds: costOptimizedPath, totalTime: 0, totalCost: 0, totalCredits: 0, creditLoss: 0 }, pathNodeMap, targetGoalId).nodeIds;
      const enhancedCreditPath = ensureMinimal({ nodeIds: creditOptimizedPath, totalTime: 0, totalCost: 0, totalCredits: 0, creditLoss: 0 }, pathNodeMap, targetGoalId).nodeIds;

      // Utility functions
      const norm = (s: any) => String(s ?? '').trim();

  // Helper for consecutive pair detection (using | delimiter consistently)
  const buildConsecutivePairSet = (nodeIds: string[]) => {
    const s = new Set<string>();
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const a = norm(nodeIds[i]);
      const b = norm(nodeIds[i + 1]);
      s.add(`${a}|${b}`);
      s.add(`${b}|${a}`); // allow reversed traversal
    }
    return s;
  };

      // Enhanced edge derivation with stitching for junction nodes
      type GEdge = { id: string; sourceId: string; targetId: string };

      function buildAdj(edges: GEdge[]) {
        const adj = new Map<string, Array<{ to: string; edgeId: string }>>();
        for (const e of edges) {
          const a = norm(e.sourceId), b = norm(e.targetId), id = norm(e.id);
          (adj.get(a) || adj.set(a, []).get(a)!).push({ to: b, edgeId: id });
          (adj.get(b) || adj.set(b, []).get(b)!).push({ to: a, edgeId: id }); // treat as undirected for viz
        }
        return adj;
      }

      function shortestEdgePath(adj: Map<string, Array<{to:string;edgeId:string}>>, src: string, dst: string, maxDepth = 6) {
        src = norm(src); dst = norm(dst);
        if (src === dst) return { nodes: [src], edges: [] as string[] };
        const q: Array<{ node: string; depth: number }> = [{ node: src, depth: 0 }];
        const seen = new Set([src]);
        const parent = new Map<string, { prev: string; viaEdge: string }>();

        let found: string | null = null;
        while (q.length) {
          const cur = q.shift()!;
          if (cur.depth >= maxDepth) continue;
          
          for (const nxt of adj.get(cur.node) || []) {
            if (seen.has(nxt.to)) continue;
            seen.add(nxt.to);
            parent.set(nxt.to, { prev: cur.node, viaEdge: nxt.edgeId });
            if (nxt.to === dst) { found = dst; break; }
            q.push({ node: nxt.to, depth: cur.depth + 1 });
          }
          if (found) break;
        }

        if (!found) return null;

        const edges: string[] = [];
        const nodes: string[] = [dst];
        let cur = dst;
        while (cur !== src) {
          const p = parent.get(cur)!;
          edges.push(p.viaEdge);
          nodes.push(p.prev);
          cur = p.prev;
        }
        edges.reverse();
        nodes.reverse();
        return { nodes, edges };
      }

      const derivePathEdgeIdsStitched = (nodeIds: string[], edges: GEdge[]) => {
        const adj = buildAdj(edges);
        const edgeIds: string[] = [];
        const virtual: Array<{ source: string; target: string }> = [];
        const materializedNodes: string[] = [norm(nodeIds[0])];

        for (let i = 0; i < nodeIds.length - 1; i++) {
          const a = norm(nodeIds[i]), b = norm(nodeIds[i+1]);
          // quick direct try
          const direct = shortestEdgePath(adj, a, b, 1);
          if (direct && direct.edges.length === 1) {
            edgeIds.push(direct.edges[0]);
            if (direct.nodes.length > 1) materializedNodes.push(...direct.nodes.slice(1));
            continue;
          }
          // stitched BFS
          const stitched = shortestEdgePath(adj, a, b, 6);
          if (stitched) {
            edgeIds.push(...stitched.edges);
            // include intermediate nodes so node-tiering is consistent
            materializedNodes.push(...stitched.nodes.slice(1));
          } else {
            virtual.push({ source: a, target: b });
            console.warn('[PF] no path between pair', a, '→', b);
            materializedNodes.push(b); // keep logical progression even if no edge found
          }
        }
        return { edgeIds, virtual, materializedNodes };
      };

      const derivePathEdgeIds = (nodeIds: string[], edges: Array<{id:string; sourceId:string; targetId:string}>) => {
        
        const dir = new Map<string, string[]>();   // "a→b" -> [edgeIds]
        const undir = new Map<string, string[]>(); // "a—b" sorted -> [edgeIds]
        
        for (const e of edges) {
          const a = norm(e.sourceId), b = norm(e.targetId), id = norm(e.id);
          const f = `${a}→${b}`, r = `${b}→${a}`, u = [a,b].sort().join('—');
          (dir.get(f) || dir.set(f, []).get(f)!).push(id);
          (dir.get(r) || dir.set(r, []).get(r)!).push(id);
          (undir.get(u) || undir.set(u, []).get(u)!).push(id);
        }
        
        const idsNorm = (nodeIds || []).map(norm);
        const edgeIds: string[] = [];
        const virtual: Array<{source:string;target:string}> = [];
        
        for (let i = 0; i < idsNorm.length - 1; i++) {
          const a = idsNorm[i], b = idsNorm[i+1];
          const found = dir.get(`${a}→${b}`) || dir.get(`${b}→${a}`) || undir.get([a,b].sort().join('—')) || [];
          if (found.length) edgeIds.push(found[0]); else virtual.push({ source: a, target: b });
        }
        
        return { edgeIds, virtual };
      };

  // Create path results with enhanced metrics and edge ID guards
  const createPathResult = (path: string[], optimizedFor: string): PathResult => {
    const pathNodes = path.map(id => graph.nodes.find(n => n.id === id)).filter(Boolean) as GraphNode[];
    const metrics = calculatePathMetrics(path, nodeMap, edgeMap);

    // Use stitched edge ID derivation to handle junction nodes
    const { edgeIds: pathEdgeIds, virtual, materializedNodes } = derivePathEdgeIdsStitched(path, graph.edges || []);
    
    // Dedup while preserving order
    const uniqueEdgeIds = Array.from(new Set(pathEdgeIds));
    
    // B1: Enhanced edge ID guards
    if (uniqueEdgeIds.length === 0) {
      console.warn('[PF] derived edgeIds is empty. First 5 path nodes:', path.slice(0,5));
      console.warn('[PF] sample graph edges:', (graph.edges || []).slice(0,5));
      console.warn('[PF] graph node IDs sample:', (graph.edges || []).slice(0,3).map(e => `${e.sourceId}→${e.targetId}`));
    }

    // Filter path nodes to only include those that exist in graph
    const nodeIdSet = new Set(graph.nodes.map(n => n.id));
    const cleanedNodeIds = path.filter(id => nodeIdSet.has(id));

    return {
      id: `path-${optimizedFor}-${Date.now()}`,
      name: `${optimizedFor.charAt(0).toUpperCase() + optimizedFor.slice(1)} Optimized Path`,
      description: `Path optimized for ${optimizedFor}`,
      nodeIds: cleanedNodeIds,
      edgeIds: uniqueEdgeIds, // Use deduped edges
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
        prerequisitesSatisfied: metrics.prerequisitesSatisfied,
        virtualHops: virtual, // Store virtual hops for debugging
        materializedNodes // Store stitched path nodes
      }
    };
  };


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
          primary: createPathResult(enhancedBasicPath, 'balanced'),
          alternatives: [],
          reasoning: 'This path offers the best balance of time and cost efficiency for your current skill level.'
        }
      };

      // Add Pareto frontier (simplified for Phase 0) - leave empty, will be populated by enhanceWithParetoFrontier
      result.paretoFrontier = [];

      setPathfindingResult(result);
      
      // B3: Set default activePath with stitched, deduped edges
      const fallback = result.fastest || result.recommendations?.primary || result.cheapest || result.creditMaximized;
      if (fallback) {
        // The createPathResult already applies stitching and deduplication
        setActivePath(fallback);
        
        // Post-stitch assertions
        console.log('[PF ASSERT]', {
          pathNodes: fallback.nodeIds.length,
          stitchedUniqueEdges: fallback.edgeIds.length,
          materializedNodes: fallback.metadata?.materializedNodes?.length ?? 0,
          virtualHops: fallback.metadata?.virtualHops?.length ?? 0
        });
        
        // B4: Edge-ID alignment guardrail
        if (fallback.edgeIds.length) {
          const edgeSet = new Set((graph.edges||[]).map(e => norm(e.id)));
          const missing = fallback.edgeIds.filter(id => !edgeSet.has(norm(id)));
          if (missing.length) {
            console.warn('[PF] missing edgeIds in graph:', missing);
          }
        }
      }
      console.log('✅ Pathfinding complete:', result);
      
      // Enhanced pre-flight logging for debugging tier issues
      console.log('[PF] fastest:', result.fastest?.nodeIds, result.fastest?.edgeIds);
      console.log('[PF] cheapest:', result.cheapest?.nodeIds, result.cheapest?.edgeIds);
      console.log('[PF] creditMaximized:', result.creditMaximized?.nodeIds, result.creditMaximized?.edgeIds);
      console.log('[PF] balanced:', result.recommendations?.primary?.nodeIds, result.recommendations?.primary?.edgeIds);
      
      // Log path info for debugging
      console.log('[V2] activePath fastest', {
        nodes: result.fastest?.nodeIds?.length ?? 0,
        edges: result.fastest?.edgeIds?.length ?? 0,
        sampleEdges: (result.fastest?.edgeIds ?? []).slice(0,5)
      });
      
      // Verify ID consistency with graph
      const sampleGraphEdge = (graph.edges || [])[0];
      if (sampleGraphEdge) {
        console.log('[PF] sample graph edge:', { id: sampleGraphEdge.id, sourceId: sampleGraphEdge.sourceId, targetId: sampleGraphEdge.targetId });
      }

    } catch (err) {
      console.error('❌ Error in pathfinding:', err);
      setError(err instanceof Error ? err.message : 'Pathfinding failed');
    } finally {
      setLoading(false);
    }
  }, [graph]);
  
  // Auto-run pathfinding deterministically
  useEffect(() => {
    if (!findPaths || !goalId || !graph.nodes?.length) return;
    const t = setTimeout(() => findPaths(goalId), 150);
    return () => clearTimeout(t);
  }, [findPaths, goalId, graph.nodes?.length]);

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

  // Helper for consecutive pair detection (exported for use in Canvas)
  const buildConsecutivePairSet = useCallback((nodeIds: string[]) => {
    const norm = (s: any) => String(s ?? '').trim();
    const s = new Set<string>();
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const a = norm(nodeIds[i]);
      const b = norm(nodeIds[i + 1]);
      s.add(`${a}|${b}`);
      s.add(`${b}|${a}`); // allow reversed traversal
    }
    return s;
  }, []);


  // Enhanced tier classification with consecutive-pair fallback (exported for use in Canvas)
  const tierOfEdge = useCallback((
    e: { id: string; source: string; target: string },
    activePath?: { edgeIds?: string[]; nodeIds?: string[]; metadata?: { materializedNodes?: string[] } }
  ) => {
    if (!activePath) return undefined;
    const norm = (s: any) => String(s ?? '').trim();
    const edgeIds = new Set((activePath.edgeIds || []).map(x => norm(x)));
    // Use materialized nodes (post-stitch) for more accurate pairing
    const pathNodeIds = ((activePath.metadata?.materializedNodes || activePath.nodeIds) || []).map(x => norm(x));
    const pairSet = buildConsecutivePairSet(pathNodeIds);

    const src = norm(e.source);
    const tgt = norm(e.target);

    // 1) Preferred: edgeIds match
    if (edgeIds.size && edgeIds.has(norm(e.id))) return 'on-path';

    // 2) Fallback: consecutive-pair match
    if (pairSet.has(`${src}|${tgt}`) || pairSet.has(`${tgt}|${src}`)) return 'on-path';

    // 3) Related: touches any path node
    if (pathNodeIds.includes(src) || pathNodeIds.includes(tgt)) return 'related';

    return 'off-path';
  }, [buildConsecutivePairSet]);

  return {
    graph,
    pathfindingResult,
    loading,
    error,
    findPaths,
    calculateCreditTransfer,
    assignDepthToMainPath,
    calculatePathMetrics,
    tierOfEdge, // Export for use in Canvas
    activePath  // Export activePath
  };
}