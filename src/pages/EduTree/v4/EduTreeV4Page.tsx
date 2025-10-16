/**
 * EduTree V4 - Main Page Component
 * Spine-first academic planner with overlay system
 */

import { useState, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { seed60NodePlan } from './data/seed60NodePlan';
import { OverlayState, NodeType } from './types/v4';
import { useV4DebugTools } from './hooks/useV4DebugTools';
import { V4DevHUD } from './dev/V4DevHUD';
import EduTreeV4Canvas from './components/EduTreeV4Canvas';
import { TransferSummaryPanel } from './components/panels/TransferSummaryPanel';
import { CompareSummaryPanel } from './components/panels/CompareSummaryPanel';

export default function EduTreeV4Page() {
  const [overlays, setOverlays] = useState<OverlayState>({
    transfer: false,
    compare: false,
    optimize: false
  });

  const { nodes, edges } = seed60NodePlan;
  const debugTools = useV4DebugTools(nodes, edges, overlays);

  const toggleOverlay = (name: keyof OverlayState) => {
    setOverlays(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Calculate transfer metrics from seed data
  const transferMetrics = useMemo(() => {
    const externalNodes = nodes.filter(n => n.type === NodeType.External);
    const transferUsed = externalNodes.reduce((sum, n) => sum + (n.data.credits || 0), 0);
    
    const sources = {
      CLEP: externalNodes
        .filter(n => n.data.source === 'exam')
        .reduce((sum, n) => sum + (n.data.credits || 0), 0),
      AP: 0, // Add when you have AP nodes
      ACE: 0, // Add when you have ACE nodes
    };
    
    return {
      used: transferUsed,
      cap: 60, // Policy: max 60 transfer credits
      sources,
    };
  }, [nodes]);

  // Calculate comparison metrics for Plan A vs Plan B
  const comparisonMetrics = useMemo(() => {
    return {
      planA: {
        name: 'Plan A',
        totalCost: 45000,
        completionTime: '4 years',
        transferCredits: 4,
      },
      planB: {
        name: 'Plan B',
        totalCost: 42000,
        completionTime: '3.5 years',
        transferCredits: 12,
      }
    };
  }, []);

  const residencyMetrics = useMemo(() => {
    const completedInResidence = nodes.filter(
      n => n.type === NodeType.Course && n.data.status === 'completed'
    );
    const residencyCredits = completedInResidence.reduce(
      (sum, n) => sum + (n.data.credits || 0), 
      0
    );
    
    return {
      required: 30, // Policy: must complete 30 credits in residence
      met: residencyCredits,
    };
  }, [nodes]);

  return (
    <div className="h-screen w-full bg-background">
      {/* Debug HUD */}
      <V4DevHUD debugState={debugTools} />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">EduTree V4</h1>
          <p className="text-sm text-muted-foreground">Spine-first academic planner (Development)</p>
        </div>
      </div>
      
      {/* Overlay Controls */}
      <div className="absolute top-20 left-4 z-10 space-x-2">
        <Button 
          onClick={() => toggleOverlay('transfer')}
          variant={overlays.transfer ? 'default' : 'outline'}
          size="sm"
        >
          Transfer Credit
        </Button>
        <Button 
          onClick={() => toggleOverlay('compare')}
          variant={overlays.compare ? 'default' : 'outline'}
          size="sm"
        >
          Compare Plans
        </Button>
        <Button 
          onClick={() => toggleOverlay('optimize')}
          variant={overlays.optimize ? 'default' : 'outline'}
          size="sm"
        >
          Optimize
        </Button>
      </div>
      
      {/* V4 Canvas */}
      <div className="h-[calc(100vh-120px)] w-full">
        <ReactFlowProvider>
          <EduTreeV4Canvas 
            nodes={nodes} 
            edges={edges} 
            overlays={overlays}
          />
        </ReactFlowProvider>
      </div>

      {/* Transfer Summary Panel */}
      <TransferSummaryPanel 
        visible={overlays.transfer && !overlays.compare} 
        transferCredits={transferMetrics}
        residency={residencyMetrics}
      />

      {/* Compare Summary Panel */}
      <CompareSummaryPanel
        visible={overlays.compare}
        planA={comparisonMetrics.planA}
        planB={comparisonMetrics.planB}
        onSwitchToPlanB={() => console.log('Switch to Plan B')}
      />
    </div>
  );
}
