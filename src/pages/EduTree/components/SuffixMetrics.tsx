/**
 * Suffix Metrics Component
 * Shows deltas for time, cost, credits within suffix
 */

import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { useSuffixCompareStore } from '../state/useSuffixCompareStore';

interface SuffixMetricsProps {
  nodes: Node[];
  edges: Edge[];
  reachableSet: Set<string> | null;
  mode: 'single' | 'dual';
}

interface MetricData {
  time?: number; // estimated terms
  cost?: number; // estimated cost
  credits?: number; // credit hours
  roi?: number; // return on investment
}

function computeSuffixMetrics(
  nodes: Node[], 
  edges: Edge[], 
  reachableSet: Set<string>
): MetricData {
  if (!reachableSet) return {};
  
  const suffixNodes = nodes.filter(n => reachableSet.has(n.id));
  
  // Extract metrics from node data (placeholder - adapt to your data structure)
  let totalCredits = 0;
  let totalCost = 0;
  
  suffixNodes.forEach(node => {
    const data = node.data as any;
    if (data.creditsNeeded) {
      totalCredits += data.creditsNeeded;
    }
    // Add other metric extraction logic based on your data structure
  });
  
  return {
    credits: totalCredits,
    cost: totalCost,
    time: Math.ceil(totalCredits / 15), // rough estimate of terms
  };
}

export function SuffixMetrics({ nodes, edges, reachableSet, mode }: SuffixMetricsProps) {
  const { enabled } = useSuffixCompareStore();
  
  if (!enabled || !reachableSet) return null;
  
  const metrics = computeSuffixMetrics(nodes, edges, reachableSet);
  
  if (!metrics.credits && !metrics.cost && !metrics.time) return null;
  
  return (
    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur border rounded-lg p-3 shadow-lg min-w-[200px] z-10">
      <div className="text-sm font-semibold text-foreground mb-2">
        Suffix Analysis
      </div>
      
      <div className="space-y-1 text-xs">
        {metrics.credits && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credits:</span>
            <span className="text-foreground font-medium">{metrics.credits}</span>
          </div>
        )}
        
        {metrics.time && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Terms:</span>
            <span className="text-foreground font-medium">{metrics.time}</span>
          </div>
        )}
        
        {metrics.cost && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Cost:</span>
            <span className="text-foreground font-medium">${metrics.cost.toLocaleString()}</span>
          </div>
        )}
      </div>
      
      {mode === 'dual' && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          Showing suffix comparison
        </div>
      )}
    </div>
  );
}