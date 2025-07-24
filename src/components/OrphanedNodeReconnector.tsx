import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { useAICareerGraph } from '@/hooks/useAICareerGraph';

interface ReconnectionSummary {
  skillsReconnected: number;
  coursesReconnected: number;
  stepsReconnected: number;
  totalNewEdges: number;
  processedNodes: number;
}

export const OrphanedNodeReconnector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ReconnectionSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { nodes, loading: graphLoading, getOrphanedNodes, findSemanticMatches } = useAICareerGraph();

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  const reconnectOrphanedNodes = async () => {
    setLoading(true);
    setLogs([]);
    setSummary(null);

    const summary: ReconnectionSummary = {
      skillsReconnected: 0,
      coursesReconnected: 0,
      stepsReconnected: 0,
      totalNewEdges: 0,
      processedNodes: 0
    };

    try {
      addLog('🔗 Starting orphaned node reconnection process...');

      if (nodes.length === 0) {
        addLog('❌ No nodes loaded. Please wait for graph to load.');
        return;
      }

      // Step 1: Find orphaned nodes using AI Career Graph
      const orphanedNodes = (await getOrphanedNodes()).slice(0, 50);

      if (orphanedNodes.length === 0) {
        addLog('✅ No orphaned nodes found!');
        setSummary(summary);
        return;
      }

      addLog(`🔍 Found ${orphanedNodes.length} orphaned nodes to process`);

      // Step 2: Process each orphaned node using semantic GPT matching
      for (const orphan of orphanedNodes) {
        addLog(`\n🧠 Processing ${orphan.node_type}:${orphan.id}`);
        
        const edgesCreated = await reconnectNodeWithSemanticMatching(orphan, findSemanticMatches, addLog);
        
        // Update summary
        switch (orphan.node_type) {
          case 'skill':
            summary.skillsReconnected++;
            break;
          case 'course':
            summary.coursesReconnected++;
            break;
          case 'step':
            summary.stepsReconnected++;
            break;
        }
        
        summary.totalNewEdges += edgesCreated;
        summary.processedNodes++;
      }

      addLog('\n✅ Reconnection process completed!');
      setSummary(summary);

    } catch (error) {
      addLog(`❌ Error in reconnection process: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🧠 Phase 2: Semantic Node Reconnector</CardTitle>
        <CardDescription>
          Reconnect the next 50 orphaned nodes using GPT-4 semantic matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={reconnectOrphanedNodes} 
          disabled={loading || graphLoading}
          className="w-full"
        >
          {loading ? '🧠 Running Phase 2...' : graphLoading ? 'Loading Graph...' : '🧠 Run Phase 2 Semantic Reconnection'}
        </Button>

        {summary && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">📊 Phase 2 Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Processed Nodes: {summary.processedNodes}</div>
              <div>Total New Edges: {summary.totalNewEdges}</div>
              <div>Skills Reconnected: {summary.skillsReconnected}</div>
              <div>Courses Reconnected: {summary.coursesReconnected}</div>
              <div>Steps Reconnected: {summary.stepsReconnected}</div>
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="space-y-1 max-h-96 overflow-y-auto p-4 bg-muted rounded-lg">
            <h3 className="font-semibold sticky top-0 bg-muted">🔍 Process Log</h3>
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Phase 2: Semantic GPT matching for reconnection
async function reconnectNodeWithSemanticMatching(
  orphan: any, 
  findSemanticMatches: (nodeId: string, targetType: string, limit: number) => Promise<any[]>,
  addLog: (msg: string) => void
): Promise<number> {
  let edgesCreated = 0;

  try {
    switch (orphan.node_type) {
      case 'skill':
        edgesCreated = await reconnectSkillNodeSemantic(orphan, findSemanticMatches, addLog);
        break;
      case 'course':
        edgesCreated = await reconnectCourseNodeSemantic(orphan, findSemanticMatches, addLog);
        break;
      case 'step':
        edgesCreated = await reconnectStepNodeSemantic(orphan, findSemanticMatches, addLog);
        break;
      default:
        addLog(`   ⚠️  Skipping ${orphan.node_type} - not supported in Phase 2`);
    }
  } catch (error) {
    addLog(`   ❌ Error processing ${orphan.node_type}:${orphan.id}: ${error}`);
  }

  return edgesCreated;
}

async function reconnectSkillNodeSemantic(
  skillNode: any, 
  findSemanticMatches: (nodeId: string, targetType: string, limit: number) => Promise<any[]>,
  addLog: (msg: string) => void
): Promise<number> {
  let edgesCreated = 0;

  // Find related courses (teaches relationship)
  const courseMatches = await findSemanticMatches(skillNode.id, 'course', 3);
  for (const match of courseMatches) {
    if (match.relationshipType === 'teaches' || match.similarityScore > 70) {
      await createSemanticEdge(match.targetId, 'course', skillNode.id, 'skill', 'teaches', addLog);
      edgesCreated++;
    }
  }

  // Find related skills (requires relationship)
  const skillMatches = await findSemanticMatches(skillNode.id, 'skill', 3);
  for (const match of skillMatches) {
    if (match.relationshipType === 'requires' || match.similarityScore > 80) {
      await createSemanticEdge(match.targetId, 'skill', skillNode.id, 'skill', 'requires', addLog);
      edgesCreated++;
    }
  }

  return edgesCreated;
}

async function reconnectCourseNodeSemantic(
  courseNode: any, 
  findSemanticMatches: (nodeId: string, targetType: string, limit: number) => Promise<any[]>,
  addLog: (msg: string) => void
): Promise<number> {
  let edgesCreated = 0;

  // Find related skills (teaches relationship)
  const skillMatches = await findSemanticMatches(courseNode.id, 'skill', 5);
  for (const match of skillMatches) {
    if (match.relationshipType === 'teaches' || match.similarityScore > 70) {
      await createSemanticEdge(courseNode.id, 'course', match.targetId, 'skill', 'teaches', addLog);
      edgesCreated++;
    }
  }

  // Find related steps (supports relationship)
  const stepMatches = await findSemanticMatches(courseNode.id, 'step', 3);
  for (const match of stepMatches) {
    if (match.relationshipType === 'supports' || match.similarityScore > 75) {
      await createSemanticEdge(courseNode.id, 'course', match.targetId, 'step', 'supports', addLog);
      edgesCreated++;
    }
  }

  return edgesCreated;
}

async function reconnectStepNodeSemantic(
  stepNode: any, 
  findSemanticMatches: (nodeId: string, targetType: string, limit: number) => Promise<any[]>,
  addLog: (msg: string) => void
): Promise<number> {
  let edgesCreated = 0;

  // Find related skills (teaches relationship)
  const skillMatches = await findSemanticMatches(stepNode.id, 'skill', 3);
  for (const match of skillMatches) {
    if (match.relationshipType === 'teaches' || match.similarityScore > 70) {
      await createSemanticEdge(stepNode.id, 'step', match.targetId, 'skill', 'teaches', addLog);
      edgesCreated++;
    }
  }

  return edgesCreated;
}

async function createSemanticEdge(
  fromId: string, 
  fromType: string, 
  toId: string, 
  toType: string, 
  edgeType: string,
  addLog: (msg: string) => void
): Promise<void> {
  // Check for existing edge to avoid duplicates
  const { data: existingEdge } = await supabase
    .from('career_graph_edges')
    .select('id')
    .eq('from_id', fromId)
    .eq('to_id', toId)
    .eq('edge_type', edgeType)
    .single();

  if (existingEdge) {
    addLog(`   ⚠️  Skipping duplicate: ${fromType}:${fromId} → ${toType}:${toId} (${edgeType})`);
    return;
  }

  const { error } = await supabase
    .from('career_graph_edges')
    .insert({
      from_id: fromId,
      from_type: fromType,
      to_id: toId,
      to_type: toType,
      edge_type: edgeType,
      importance_weight: 1.0,
      time_cost_hours: 0,
      monetary_cost: 0,
      difficulty_multiplier: 1.0,
      data_source: 'semantic_ai'
    });

  if (error) {
    addLog(`   ❌ Error: ${fromType}:${fromId} → ${toType}:${toId}: ${error.message}`);
  } else {
    addLog(`   ✅ ${fromType}:${fromId} → ${toType}:${toId} (${edgeType})`);
  }
}