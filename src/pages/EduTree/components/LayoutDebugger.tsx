import React, { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Layout, Eye } from 'lucide-react';

interface LayoutDebuggerProps {
  nodes: Node[];
  edges: Edge[];
  enabled?: boolean;
}

export function LayoutDebugger({ nodes, edges, enabled = false }: LayoutDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!enabled) return null;

  const coreNodes = nodes.filter(n => n.type === 'blockGroup');
  const transitionNodes = nodes.filter(n => n.type === 'transitionBlock');
  const trackNodes = nodes.filter(n => n.type === 'specializationTrack');

  const yearGroups = coreNodes.reduce((acc, node) => {
    const year = (node.data?.level_year as number) || 0;
    const yearKey = year.toString();
    if (!acc[yearKey]) acc[yearKey] = [];
    acc[yearKey].push(node);
    return acc;
  }, {} as Record<string, Node[]>);

  const validateLayout = () => {
    const issues: string[] = [];
    
    // Check for overlaps
    nodes.forEach((nodeA, i) => {
      nodes.slice(i + 1).forEach((nodeB) => {
        const dx = nodeA.position.x - nodeB.position.x;
        const dy = nodeA.position.y - nodeB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 200) {
          issues.push(`Potential overlap: ${nodeA.id} and ${nodeB.id}`);
        }
      });
    });

    // Check year progression
    Object.entries(yearGroups).forEach(([year, yearNodes]) => {
      const expectedX = parseInt(year) * 450;
      yearNodes.forEach(node => {
        if (Math.abs(node.position.x - expectedX) > 50) {
          issues.push(`Year ${year} block ${node.id} not aligned (expected ~${expectedX}, got ${node.position.x})`);
        }
      });
    });

    return issues;
  };

  const issues = validateLayout();

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Layout className="w-4 h-4 mr-2" />
            Layout Debug ({issues.length} issues)
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card className="p-4 mt-2 space-y-4 max-h-96 overflow-y-auto">
            {/* Layout Stats */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Layout Statistics</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Core: {coreNodes.length}</Badge>
                <Badge variant="secondary">Transition: {transitionNodes.length}</Badge>
                <Badge variant="secondary">Tracks: {trackNodes.length}</Badge>
                <Badge variant="secondary">Edges: {edges.length}</Badge>
              </div>
            </div>

            {/* Year Distribution */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Year Distribution</h4>
              <div className="space-y-1">
                {Object.entries(yearGroups).map(([year, yearNodes]) => (
                  <div key={year} className="flex justify-between text-xs">
                    <span>Year {year}</span>
                    <Badge variant="outline" className="text-xs">
                      {yearNodes.length} blocks
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Issues */}
            {issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-destructive">Layout Issues</h4>
                <div className="space-y-1">
                  {issues.slice(0, 5).map((issue, index) => (
                    <div key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {issue}
                    </div>
                  ))}
                  {issues.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{issues.length - 5} more issues...
                    </div>
                  )}
                </div>
              </div>
            )}

            {issues.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <Eye className="w-3 h-3" />
                Layout validation passed ✓
              </div>
            )}

            {/* Position Debug */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Node Positions</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {nodes.slice(0, 6).map(node => (
                  <div key={node.id} className="text-xs flex justify-between">
                    <span className="truncate">{node.id}</span>
                    <span className="text-muted-foreground">
                      ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}