import { useEffect } from 'react';

interface TierClassManagerProps {
  edges: any[];
  activePath: { edgeIds?: string[]; nodeIds?: string[] } | null;
}

/**
 * Component that handles mount-safe tier class application
 * Must be rendered inside ReactFlow to access DOM elements
 */
export function TierClassManager({ edges, activePath }: TierClassManagerProps) {
  
  useEffect(() => {
    // Use double requestAnimationFrame to ensure React Flow has flushed to DOM
    const applyTierClasses = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const hasRealEdges = (activePath?.edgeIds?.length ?? 0) > 0;
        const pathEdgeIds = new Set(activePath?.edgeIds || []);
        const pathNodeIds = new Set(activePath?.nodeIds || []);
        
        // Helper to determine tier with fallback logic
        const tierForEdge = (edge: any) => {
          if (hasRealEdges) {
            return pathEdgeIds.has(edge.id) ? 'on-path'
              : (pathNodeIds.has(edge.source) || pathNodeIds.has(edge.target)) ? 'related' : 'off-path';
          }
          // Fallback: no edgeIds yet → still tier via nodes
          return (pathNodeIds.has(edge.source) && pathNodeIds.has(edge.target)) ? 'on-path'
            : (pathNodeIds.has(edge.source) || pathNodeIds.has(edge.target)) ? 'related' : 'off-path';
        };
        
        // Apply tier classes to edge paths with improved selectors
        const edgeElements = document.querySelectorAll('[data-id^="reactflow__edge-"], [data-id^="rf__edge-"], g[class*="react-flow__edge"]');
        edgeElements.forEach((edgeEl) => {
          const pathEl = edgeEl.querySelector('path.react-flow__edge-path') as SVGPathElement | null;
          if (!pathEl) return;
          
          // Remove existing tier classes
          pathEl.classList.remove('lp-edge-on-path', 'lp-edge-related', 'lp-edge-off-path');
          pathEl.removeAttribute('data-tier');
          
          // Find matching edge by ID
          const edgeId = (edgeEl as HTMLElement).getAttribute('data-id')?.replace(/^.*edge-/, '') ?? '';
          const matchingEdge = edges.find(e => e.id === edgeId);
          if (!matchingEdge) return;
          
          // Determine and apply tier
          const tier = tierForEdge(matchingEdge);
          pathEl.classList.add(`lp-edge-${tier}`);
          pathEl.setAttribute('data-tier', tier);
        });
        
        // Apply tier classes to nodes
        activePath?.nodeIds?.forEach((nodeId) => {
          const nodeElement = document.querySelector(`[data-testid="lp-node"][data-id="${nodeId}"]`);
          if (!nodeElement) return;
          
          nodeElement.classList.remove('lp-node-on-path', 'lp-node-related', 'lp-node-off-path');
          nodeElement.classList.add('lp-node-on-path');
          nodeElement.setAttribute('data-tier', 'on-path');
        });
        
        // Log tier counts for debugging
        setTimeout(() => {
          const on = document.querySelectorAll('path.react-flow__edge-path.lp-edge-on-path').length;
          const rel = document.querySelectorAll('path.react-flow__edge-path.lp-edge-related').length;
          const off = document.querySelectorAll('path.react-flow__edge-path.lp-edge-off-path').length;
          console.log('[V2] tiers', { on, rel, off, hasRealEdges, edgeCount: edges.length });
        }, 100);
      }));
    };
    
    applyTierClasses();
  }, [edges, activePath?.edgeIds, activePath?.nodeIds]);

  return null; // This component only handles side effects
}