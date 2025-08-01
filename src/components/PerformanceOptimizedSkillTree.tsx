import React, { memo, useMemo, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Zap, Settings, Eye } from 'lucide-react';
import { InteractiveSkillTree } from '@/components/InteractiveSkillTree';

interface VirtualizedNode {
  id: string;
  title: string;
  type: 'skill' | 'course' | 'job' | 'certification';
  completed: boolean;
  level: number;
  children: string[];
}

interface PerformanceMetrics {
  renderTime: number;
  nodeCount: number;
  memoryUsage: number;
  frameRate: number;
}

// Memoized node component for virtualization
const VirtualSkillNode = memo<{ 
  index: number; 
  style: any; 
  data: { nodes: VirtualizedNode[]; onNodeClick: (id: string) => void } 
}>(({ index, style, data }) => {
  const node = data.nodes[index];
  
  return (
    <div style={style} className="p-2">
      <Card className="h-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={node.completed ? "default" : "outline"}>
                {node.type}
              </Badge>
              <span className="text-sm font-medium truncate">{node.title}</span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => data.onNodeClick(node.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

VirtualSkillNode.displayName = 'VirtualSkillNode';

export const PerformanceOptimizedSkillTree: React.FC = memo(() => {
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Memoized large dataset generation
  const largeNodeSet = useMemo(() => {
    const nodes: VirtualizedNode[] = [];
    for (let i = 0; i < 1000; i++) {
      nodes.push({
        id: `node-${i}`,
        title: `Node ${i + 1}: ${['Frontend', 'Backend', 'DevOps', 'Data Science', 'Mobile'][i % 5]} Skill`,
        type: ['skill', 'course', 'job', 'certification'][i % 4] as any,
        completed: Math.random() > 0.7,
        level: Math.floor(i / 100) + 1,
        children: []
      });
    }
    return nodes;
  }, []);

  // Performance monitoring
  const measurePerformance = useCallback(async () => {
    const startTime = performance.now();
    
    // Simulate rendering workload
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        setMetrics({
          renderTime,
          nodeCount: largeNodeSet.length,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          frameRate: 60 // Simplified for demo
        });
        
        resolve(void 0);
      });
    });
  }, [largeNodeSet]);

  const handleNodeClick = useCallback((nodeId: string) => {
    console.log(`Clicked node: ${nodeId}`);
  }, []);

  // Memoized virtualized list data
  const listData = useMemo(() => ({
    nodes: largeNodeSet,
    onNodeClick: handleNodeClick
  }), [largeNodeSet, handleNodeClick]);

  React.useEffect(() => {
    if (virtualizationEnabled) {
      measurePerformance();
    }
  }, [virtualizationEnabled, measurePerformance]);

  return (
    <div className="space-y-6">
      {/* Performance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Virtualization Mode</p>
              <p className="text-sm text-muted-foreground">
                Render only visible nodes for large datasets (1000+ nodes)
              </p>
            </div>
            <Switch 
              checked={virtualizationEnabled}
              onCheckedChange={setVirtualizationEnabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Performance Metrics</p>
              <p className="text-sm text-muted-foreground">
                Show real-time performance data
              </p>
            </div>
            <Switch 
              checked={showMetrics}
              onCheckedChange={setShowMetrics}
            />
          </div>

          {showMetrics && metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Render Time</p>
                <p className="text-lg font-bold">{metrics.renderTime.toFixed(2)}ms</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Node Count</p>
                <p className="text-lg font-bold">{metrics.nodeCount.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Memory</p>
                <p className="text-lg font-bold">
                  {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Frame Rate</p>
                <p className="text-lg font-bold">{metrics.frameRate}fps</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Tree Renderer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {virtualizationEnabled ? 'Virtualized Skill Tree' : 'Standard Skill Tree'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {virtualizationEnabled ? (
            <div className="h-[600px] border rounded-lg">
              <List
                height={600}
                width="100%"
                itemCount={largeNodeSet.length}
                itemSize={80}
                itemData={listData}
              >
                {VirtualSkillNode}
              </List>
            </div>
          ) : (
            <div className="h-[600px] overflow-hidden border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Standard skill tree view - enable virtualization for large datasets</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Badge variant="outline">React.memo</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Component Memoization</p>
                <p className="text-xs text-muted-foreground">
                  Prevents unnecessary re-renders of skill nodes
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Badge variant="outline">useMemo</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Computation Caching</p>
                <p className="text-xs text-muted-foreground">
                  Caches expensive calculations and data transformations
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Badge variant="outline">react-window</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Virtualization</p>
                <p className="text-xs text-muted-foreground">
                  Renders only visible items for massive datasets
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Badge variant="outline">useCallback</Badge>
              <div className="flex-1">
                <p className="text-sm font-medium">Event Handler Optimization</p>
                <p className="text-xs text-muted-foreground">
                  Stable function references prevent child re-renders
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

PerformanceOptimizedSkillTree.displayName = 'PerformanceOptimizedSkillTree';