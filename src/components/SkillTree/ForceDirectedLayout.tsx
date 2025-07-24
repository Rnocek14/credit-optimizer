import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  level?: number;
  category?: string;
  fixed?: boolean;
}

interface ForceLayoutParams {
  nodes: Node[];
  edges: Edge[];
  width: number;
  height: number;
  iterations?: number;
}

export const useForceDirectedLayout = () => {
  
  const applyForceDirectedLayout = useCallback(({ 
    nodes, 
    edges, 
    width, 
    height,
    iterations = 50 
  }: ForceLayoutParams): Node[] => {
    
    if (!nodes.length) return nodes;
    
    // Convert nodes to layout format
    const layoutNodes: LayoutNode[] = nodes.map(node => ({
      id: node.id,
      x: node.position.x || Math.random() * width,
      y: node.position.y || Math.random() * height,
      width: 180,
      height: 120,
      type: node.type || 'default',
      level: typeof node.data?.level === 'number' ? node.data.level : undefined,
      category: (node.data?.category || node.data?.trackCategory) as string | undefined,
      fixed: Boolean(node.data?.isGoal)
    }));

    // Create hierarchy-based initial positioning
    const typeOrder = ['skill', 'course', 'project', 'certification', 'careerStep', 'job'];
    const typeYPositions = new Map<string, number>();
    
    typeOrder.forEach((type, index) => {
      typeYPositions.set(type, height * 0.1 + (index * height * 0.15));
    });

    // Position nodes by type initially
    layoutNodes.forEach(node => {
      const baseY = typeYPositions.get(node.type) || height * 0.5;
      
      if (node.type === 'careerStep' && node.level !== undefined) {
        // Stack career steps by level
        node.y = baseY + (node.level * 150);
      } else if (node.type === 'skill') {
        // Group skills by category
        const categoryIndex = ['Programming', 'Framework', 'Tools', 'Soft Skills'].indexOf(node.category || '');
        node.y = baseY + (categoryIndex >= 0 ? categoryIndex * 60 : 0);
      } else {
        node.y = baseY;
      }
    });

    // Force-directed simulation
    for (let iteration = 0; iteration < iterations; iteration++) {
      const alpha = 1 - (iteration / iterations); // Cooling factor
      
      layoutNodes.forEach(nodeA => {
        if (nodeA.fixed) return;
        
        let forceX = 0;
        let forceY = 0;
        
        // Repulsive forces between all nodes
        layoutNodes.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;
          
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDistance = Math.max(nodeA.width, nodeA.height) + 40; // Minimum separation
          
          if (distance < minDistance * 2) {
            const repulsion = (minDistance * minDistance) / (distance * distance);
            forceX += (dx / distance) * repulsion * alpha;
            forceY += (dy / distance) * repulsion * alpha;
          }
        });
        
        // Attractive forces for connected nodes
        edges.forEach(edge => {
          const isSource = edge.source === nodeA.id;
          const isTarget = edge.target === nodeA.id;
          
          if (isSource || isTarget) {
            const otherNodeId = isSource ? edge.target : edge.source;
            const otherNode = layoutNodes.find(n => n.id === otherNodeId);
            
            if (otherNode) {
              const dx = otherNode.x - nodeA.x;
              const dy = otherNode.y - nodeA.y;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              const idealDistance = 200; // Ideal connection distance
              
              const attraction = (distance - idealDistance) * 0.01;
              forceX += (dx / distance) * attraction * alpha;
              forceY += (dy / distance) * attraction * alpha;
            }
          }
        });
        
        // Apply type-based constraints (keep layers roughly in place)
        const targetY = typeYPositions.get(nodeA.type) || height * 0.5;
        const layerForce = (targetY - nodeA.y) * 0.02 * alpha;
        forceY += layerForce;
        
        // Center bias to prevent drift
        const centerX = width / 2;
        const centerForceX = (centerX - nodeA.x) * 0.001 * alpha;
        forceX += centerForceX;
        
        // Apply forces with velocity damping
        const damping = 0.8;
        nodeA.x += forceX * damping;
        nodeA.y += forceY * damping;
        
        // Boundary constraints
        nodeA.x = Math.max(nodeA.width / 2, Math.min(width - nodeA.width / 2, nodeA.x));
        nodeA.y = Math.max(nodeA.height / 2, Math.min(height - nodeA.height / 2, nodeA.y));
      });
    }
    
    // Convert back to ReactFlow format
    return nodes.map(node => {
      const layoutNode = layoutNodes.find(n => n.id === node.id);
      if (!layoutNode) return node;
      
      return {
        ...node,
        position: {
          x: layoutNode.x - layoutNode.width / 2,
          y: layoutNode.y - layoutNode.height / 2
        }
      };
    });
    
  }, []);

  return { applyForceDirectedLayout };
};
