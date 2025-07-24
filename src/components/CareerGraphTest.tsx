import React, { useState } from 'react';
import { createCareerGraphFromDatabase, type GraphNode } from '@/lib/careerGraph';
import { calculateGraphLayout } from '@/lib/graphLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResults {
  statistics?: any;
  validation?: any;
  pathfinding?: any;
  cri?: any;
  layout?: any;
  error?: string;
}

export const CareerGraphTest: React.FC = () => {
  const [results, setResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const runFullTest = async () => {
    setLoading(true);
    setResults({});
    
    try {
      console.log('🏗️ Loading unified career graph from database...');
      const graph = await createCareerGraphFromDatabase();
      
      // 1. 🔁 Graph Statistics
      console.log('\n🔁 GRAPH STATISTICS');
      const statistics = graph.getStatistics();
      console.log('Total nodes:', statistics.totalNodes);
      console.log('Total edges:', statistics.totalEdges);
      console.log('Nodes by type:', statistics.nodesByType);
      console.log('Edges by type:', statistics.edgesByType);
      console.log('Average connections:', statistics.averageConnections);
      
      // 2. 🧪 Graph Validation
      console.log('\n🧪 GRAPH VALIDATION');
      const validation = graph.validateGraph();
      console.log('Graph is valid:', validation.isValid);
      if (!validation.isValid) {
        console.log('Validation errors:', validation.errors);
      }
      
      // 3. 🚦 Pathfinding QA
      console.log('\n🚦 PATHFINDING QA');
      let pathfindingResult = null;
      try {
        const paths = graph.findOptimalPaths('job', 'junior_data_analyst', 'job', 'senior_data_scientist', 'time');
        console.log('Found paths:', paths.length);
        if (paths.length > 0) {
          const topPath = paths[0];
          console.log('Top path nodes:', topPath.nodes.map(n => `${n.type}:${n.title}`));
          console.log('Top path edges:', topPath.edges.map(e => `${e.from_type}:${e.from_id} -> ${e.to_type}:${e.to_id} (${e.edge_type})`));
          console.log('Total time:', topPath.total_time_hours, 'hours');
          console.log('Total cost:', topPath.total_cost);
          console.log('Average difficulty:', topPath.average_difficulty);
          console.log('ROI score:', topPath.roi_score);
          pathfindingResult = topPath;
        }
      } catch (pathError) {
        console.log('Pathfinding error:', pathError);
      }
      
      // 4. 🧠 CRI Calculation
      console.log('\n🧠 CRI CALCULATION');
      try {
        const criScore = await graph.calculateCRI('user_demo_01', 'senior_data_scientist');
        console.log('CRI Score:', criScore);
      } catch (criError) {
        console.log('CRI calculation error:', criError);
      }
      
      // 5. 🧭 Layout Test
      console.log('\n🧭 LAYOUT TEST');
      const nodes = Array.from((graph as any).nodes.values()) as GraphNode[];
      const edges = (graph as any).edges;
      const layout = calculateGraphLayout(nodes, edges, { algorithm: 'hierarchical' });
      console.log('Layout nodes count:', layout.nodes.length);
      console.log('Layout bounds:', layout.bounds);
      
      // 6. 📈 Graph Summary
      console.log('\n📈 GRAPH SUMMARY');
      console.log('Final statistics:', statistics);
      
      setResults({
        statistics,
        validation,
        pathfinding: pathfindingResult,
        layout: { nodesCount: layout.nodes.length, bounds: layout.bounds }
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Career Graph Validation & QA Suite</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runFullTest} disabled={loading} className="mb-4">
            {loading ? 'Running Tests...' : 'Run Full Graph Test'}
          </Button>
          
          {results.error && (
            <div className="text-red-500 bg-red-50 p-4 rounded">
              <strong>Error:</strong> {results.error}
            </div>
          )}
          
          {results.statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>🔁 Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Total Nodes: <strong>{results.statistics.totalNodes}</strong></div>
                    <div>Total Edges: <strong>{results.statistics.totalEdges}</strong></div>
                    <div>Avg Connections: <strong>{results.statistics.averageConnections?.toFixed(2)}</strong></div>
                    <div className="mt-2">
                      <strong>Nodes by Type:</strong>
                      {Object.entries(results.statistics.nodesByType).map(([type, count]) => (
                        <div key={type} className="ml-2">{type}: {count as number}</div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>🧪 Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Status: <strong className={results.validation?.isValid ? 'text-green-600' : 'text-red-600'}>
                      {results.validation?.isValid ? 'Valid' : 'Invalid'}
                    </strong></div>
                    {results.validation?.errors?.length > 0 && (
                      <div>
                        <strong>Errors:</strong>
                        {results.validation.errors.map((error: string, i: number) => (
                          <div key={i} className="ml-2 text-red-600">{error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {results.pathfinding && (
                <Card>
                  <CardHeader>
                    <CardTitle>🚦 Pathfinding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>Nodes: <strong>{results.pathfinding.nodes?.length}</strong></div>
                      <div>Time: <strong>{results.pathfinding.total_time_hours}h</strong></div>
                      <div>Cost: <strong>${results.pathfinding.total_cost}</strong></div>
                      <div>Difficulty: <strong>{results.pathfinding.average_difficulty?.toFixed(2)}</strong></div>
                      <div>ROI: <strong>{results.pathfinding.roi_score?.toFixed(2)}</strong></div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {results.layout && (
                <Card>
                  <CardHeader>
                    <CardTitle>🧭 Layout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>Layout Nodes: <strong>{results.layout.nodesCount}</strong></div>
                      <div>Width: <strong>{results.layout.bounds?.width?.toFixed(0)}px</strong></div>
                      <div>Height: <strong>{results.layout.bounds?.height?.toFixed(0)}px</strong></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};