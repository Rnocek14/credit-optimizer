import { useEffect } from 'react';

interface TierClassManagerProps {
  edges: any[];
  reactFlowEdges: any[];
  activePath: { id?: string; edgeIds?: string[]; nodeIds?: string[] } | null;
}

/**
 * Component that handles mount-safe tier class application
 * Must be rendered inside ReactFlow to access DOM elements
 */
export function TierClassManager({ edges, reactFlowEdges, activePath }: TierClassManagerProps) {
  
  useEffect(() => {
    // A1: TierClassManager now no-op - tiers applied at render time
    // Keep only pre-flight logging for debugging
    console.log('[Tiers] path nodeIds:', activePath?.nodeIds);
    console.log('[Tiers] path edgeIds:', activePath?.edgeIds);
    
    // DOM mutation removed - tier classes now set via Edge className at render
    // This component serves only as a debug monitor
  }, [activePath?.id, JSON.stringify(activePath?.edgeIds||[]), JSON.stringify(activePath?.nodeIds||[])]);

  return null; // This component only handles side effects
}