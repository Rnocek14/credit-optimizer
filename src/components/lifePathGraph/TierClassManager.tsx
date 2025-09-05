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
    // Use requestAnimationFrame to ensure React Flow has flushed to DOM
    const applyTierClasses = () => {
      requestAnimationFrame(() => {
        const pathEdgeIds = new Set(activePath?.edgeIds || []);
        const pathNodeIds = new Set(activePath?.nodeIds || []);
        
        // Apply tier classes to edge paths
        edges.forEach(edge => {
          const edgeElement = document.querySelector(`[data-testid="rf__edge-${edge.id}"]`);
          if (!edgeElement) return;
          
          const pathElement = edgeElement.querySelector('.react-flow__edge-path');
          if (!pathElement) return;
          
          // Remove existing tier classes
          pathElement.classList.remove('lp-edge-on-path', 'lp-edge-related', 'lp-edge-off-path');
          pathElement.removeAttribute('data-tier');
          
          // Determine tier
          let tier: string;
          if (pathEdgeIds.has(edge.id)) {
            tier = 'on-path';
          } else if (pathNodeIds.has(edge.source) || pathNodeIds.has(edge.target)) {
            tier = 'related';
          } else {
            tier = 'off-path';
          }
          
          // Apply new tier
          pathElement.classList.add(`lp-edge-${tier}`);
          pathElement.setAttribute('data-tier', tier);
        });
        
        // Apply tier classes to nodes
        activePath?.nodeIds?.forEach((nodeId, index) => {
          const nodeElement = document.querySelector(`[data-testid="lp-node"][data-id="${nodeId}"]`);
          if (!nodeElement) return;
          
          nodeElement.classList.remove('lp-node-on-path', 'lp-node-related', 'lp-node-off-path');
          nodeElement.classList.add('lp-node-on-path');
          nodeElement.setAttribute('data-tier', 'on-path');
        });
      });
    };
    
    applyTierClasses();
  }, [edges, activePath]);

  return null; // This component only handles side effects
}