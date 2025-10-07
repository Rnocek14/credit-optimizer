/**
 * V3 Debug Panel with Vertical Flow Assertions
 * 
 * Displays real-time validation of:
 * - Monotonic Y (spine nodes increase downward)
 * - Fork geometry (Y3 SE/DS same Y, proper separation)
 * - Grid alignment (all positions snap to GRID)
 * - Token display (VERT constants)
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { V3Node } from '../types/v3';
import { VERT, VerticalTokens } from '../utils/layoutTokensVertical';
import { Activity, AlertCircle, CheckCircle2, Settings } from 'lucide-react';

interface V3DebugPanelProps {
  nodes: V3Node[];
  isVertical: boolean;
  onClose?: () => void;
}

interface VerticalAssertion {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: any;
}

function checkMonotonicY(nodes: V3Node[]): VerticalAssertion {
  // Build the spine in the exact flow order we expect: top→bottom
  // Y1 → Program Gate → Y2 → Track Gate → Y4
  const ordered: V3Node[] = [];
  
  const y1Bundle = nodes.find(n => 
    n.type === 'track-bundle' && 
    n.data.year === 1 && 
    (!n.data.trackId || n.data.trackId === 'any')
  );
  
  const programGate = nodes.find(n => 
    n.type === 'gate' && 
    n.data.year === 2
  );
  
  const y2Bundle = nodes.find(n => 
    n.type === 'track-bundle' && 
    n.data.year === 2 && 
    (!n.data.trackId || n.data.trackId === 'any')
  );
  
  const trackGate = nodes.find(n => 
    n.type === 'gate' && 
    n.data.year === 3
  );
  
  const y4Bundle = nodes.find(n => 
    n.type === 'track-bundle' && 
    n.data.year === 4 && 
    (!n.data.trackId || n.data.trackId === 'any')
  );
  
  // Add nodes in spine order (skip if missing)
  [y1Bundle, programGate, y2Bundle, trackGate, y4Bundle].forEach(n => {
    if (n) ordered.push(n);
  });
  
  const violations: any[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
    if (curr.position.y <= prev.position.y) {
      violations.push({
        prev: `${prev.id} (Y${prev.data.year ?? '?'})`,
        curr: `${curr.id} (Y${curr.data.year ?? '?'})`,
        prevY: prev.position.y,
        currY: curr.position.y
      });
    }
  }
  
  return {
    name: 'Monotonic Y',
    status: violations.length === 0 ? 'pass' : 'fail',
    message: violations.length === 0 
      ? `${ordered.length} spine nodes in correct top→bottom order`
      : `${violations.length} Y-order violation(s)`,
    details: violations.length > 0 ? violations : undefined
  };
}

function checkForkGeometry(nodes: V3Node[], tokens: VerticalTokens): VerticalAssertion {
  const y3SE = nodes.find(n => n.data.year === 3 && n.data.trackId === 'se');
  const y3DS = nodes.find(n => n.data.year === 3 && n.data.trackId === 'ds');
  
  if (!y3SE || !y3DS) {
    return {
      name: 'Fork Geometry',
      status: 'skip',
      message: 'Y3 fork not found (SE/DS bundles missing)'
    };
  }
  
  const sameY = Math.abs(y3SE.position.y - y3DS.position.y) <= tokens.GRID;
  const separation = Math.abs(y3SE.position.x - y3DS.position.x);
  const adequateSeparation = separation >= tokens.H_SPACING;
  
  return {
    name: 'Fork Geometry',
    status: sameY && adequateSeparation ? 'pass' : 'fail',
    message: sameY && adequateSeparation
      ? `Y3 fork aligned (separation: ${separation}px)`
      : `Y3 fork issues`,
    details: !sameY || !adequateSeparation ? {
      sameY,
      separation,
      minSeparation: tokens.H_SPACING,
      y3SE: { x: y3SE.position.x, y: y3SE.position.y },
      y3DS: { x: y3DS.position.x, y: y3DS.position.y }
    } : undefined
  };
}

function checkGridAlignment(nodes: V3Node[], tokens: VerticalTokens): VerticalAssertion {
  const offGrid = nodes.filter(n => 
    (n.position.x % tokens.GRID) !== 0 || 
    (n.position.y % tokens.GRID) !== 0
  );
  
  return {
    name: 'Grid Alignment',
    status: offGrid.length === 0 ? 'pass' : 'fail',
    message: offGrid.length === 0
      ? `All ${nodes.length} nodes grid-aligned (${tokens.GRID}px)`
      : `${offGrid.length} node(s) off-grid`,
    details: offGrid.length > 0 ? offGrid.map(n => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      xMod: n.position.x % tokens.GRID,
      yMod: n.position.y % tokens.GRID
    })) : undefined
  };
}

function checkNoOverlaps(nodes: V3Node[], tokens: VerticalTokens): VerticalAssertion {
  const overlaps: any[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      
      const aWidth = tokens.NODE_WIDTH;
      const aHeight = a.type === 'gate' ? tokens.GATE_HEIGHT : tokens.NODE_HEIGHT;
      const bWidth = tokens.NODE_WIDTH;
      const bHeight = b.type === 'gate' ? tokens.GATE_HEIGHT : tokens.NODE_HEIGHT;
      
      const xOverlap = !(a.position.x + aWidth <= b.position.x || b.position.x + bWidth <= a.position.x);
      const yOverlap = !(a.position.y + aHeight <= b.position.y || b.position.y + bHeight <= a.position.y);
      
      if (xOverlap && yOverlap) {
        overlaps.push({ a: a.id, b: b.id });
      }
    }
  }
  
  return {
    name: 'No Overlaps',
    status: overlaps.length === 0 ? 'pass' : 'fail',
    message: overlaps.length === 0
      ? 'No node overlaps detected'
      : `${overlaps.length} overlap(s) detected`,
    details: overlaps.length > 0 ? overlaps : undefined
  };
}

export default function V3DebugPanel({ nodes, isVertical, onClose }: V3DebugPanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  
  if (!isVertical) {
    return null; // Only show for vertical layout
  }
  
  const assertions: VerticalAssertion[] = [
    checkMonotonicY(nodes),
    checkForkGeometry(nodes, VERT),
    checkGridAlignment(nodes, VERT),
    checkNoOverlaps(nodes, VERT)
  ];
  
  const passed = assertions.filter(a => a.status === 'pass').length;
  const failed = assertions.filter(a => a.status === 'fail').length;
  const allPass = failed === 0 && assertions.every(a => a.status !== 'skip');
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-background/95 backdrop-blur border-2">
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Vertical Flow Debug</span>
              <Badge variant={allPass ? 'default' : 'destructive'} className="text-xs">
                {passed}/{assertions.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
          
          {/* Assertions */}
          <div className="space-y-1.5">
            {assertions.map((assertion, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {assertion.status === 'pass' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                )}
                {assertion.status === 'fail' && (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                {assertion.status === 'skip' && (
                  <div className="h-3.5 w-3.5 flex-shrink-0 mt-0.5">-</div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{assertion.name}</div>
                  <div className="text-muted-foreground">{assertion.message}</div>
                  {expanded && assertion.details && (
                    <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-auto max-h-32">
                      {JSON.stringify(assertion.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Tokens Display */}
          {expanded && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium mb-2">Vertical Tokens (VERT)</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>CENTER_X</div>
                <div className="font-mono">{VERT.CENTER_X}px</div>
                
                <div>NODE_WIDTH</div>
                <div className="font-mono">{VERT.NODE_WIDTH}px</div>
                
                <div>NODE_HEIGHT</div>
                <div className="font-mono">{VERT.NODE_HEIGHT}px</div>
                
                <div>GATE_HEIGHT</div>
                <div className="font-mono">{VERT.GATE_HEIGHT}px</div>
                
                <div>VERTICAL_GAP</div>
                <div className="font-mono">{VERT.VERTICAL_GAP}px</div>
                
                <div>H_SPACING</div>
                <div className="font-mono">{VERT.H_SPACING}px</div>
                
                <div>GRID</div>
                <div className="font-mono">{VERT.GRID}px</div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs font-medium mb-2">Spine Y Values</div>
                <div className="space-y-1 text-xs">
                  {(() => {
                    const y1 = nodes.find(n => n.type === 'track-bundle' && n.data.year === 1 && (!n.data.trackId || n.data.trackId === 'any'));
                    const gY2 = nodes.find(n => n.type === 'gate' && n.data.year === 2);
                    const y2 = nodes.find(n => n.type === 'track-bundle' && n.data.year === 2 && (!n.data.trackId || n.data.trackId === 'any'));
                    const gY3 = nodes.find(n => n.type === 'gate' && n.data.year === 3);
                    const y4 = nodes.find(n => n.type === 'track-bundle' && n.data.year === 4 && (!n.data.trackId || n.data.trackId === 'any'));
                    
                    return [
                      { label: 'Y1 Bundle', node: y1 },
                      { label: 'Gate→Y2', node: gY2 },
                      { label: 'Y2 Bundle', node: y2 },
                      { label: 'Gate→Y3', node: gY3 },
                      { label: 'Y4 Bundle', node: y4 }
                    ].filter(item => item.node).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>{item.label}</span>
                        <span className="font-mono text-primary">{item.node!.position.y}px</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              <div className="mt-2 text-xs">
                <Badge variant="secondary" className="text-[10px]">
                  Layout: Vertical • Nodes: {nodes.length}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
