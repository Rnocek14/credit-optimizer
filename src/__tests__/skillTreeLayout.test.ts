// PR-8: Skill Tree Layout Tests
import { calculateEnhancedSkillTreeLayout, EnhancedSkillTreeLayout, type LayoutNode, type LayoutEdge } from '@/lib/enhancedSkillTreeLayout';

describe('EnhancedSkillTreeLayout', () => {
  // Test fixtures
  const createTestNodes = (count: number): LayoutNode[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      type: i % 2 === 0 ? 'skill' : 'job',
      title: `Test Node ${i}`,
      category: `Category ${i % 3}`,
      level: i % 5 + 1
    }));
  };

  const createTestEdges = (nodeCount: number): LayoutEdge[] => {
    const edges: LayoutEdge[] = [];
    for (let i = 0; i < nodeCount - 1; i++) {
      edges.push({
        source: `node-${i}`,
        target: `node-${i + 1}`,
        type: 'requires'
      });
    }
    return edges;
  };

  describe('Depth Calculation', () => {
    it('should assign correct depths for linear dependency chain', () => {
      const nodes = createTestNodes(5);
      const edges = createTestEdges(5);
      
      const layout = new EnhancedSkillTreeLayout(nodes, edges, {
        algorithm: 'semantic-hierarchy',
        containerWidth: 1600,
        containerHeight: 1200,
        nodeSpacing: { horizontal: 220, vertical: 160, category: 100 },
        layerHeight: 180
      });

      const positioned = layout.calculateLayout();
      
      // Verify nodes are positioned at different Y levels
      const yPositions = positioned.map(node => node.y);
      const uniqueYPositions = [...new Set(yPositions)];
      
      expect(uniqueYPositions.length).toBeGreaterThan(1);
      expect(positioned[0].y).toBeLessThan(positioned[positioned.length - 1].y);
    });

    it('should handle orphan nodes correctly', () => {
      const nodes = [
        { id: 'orphan', type: 'skill', title: 'Orphan Node' },
        { id: 'connected-1', type: 'skill', title: 'Connected 1' },
        { id: 'connected-2', type: 'skill', title: 'Connected 2' }
      ];
      const edges = [
        { source: 'connected-1', target: 'connected-2', type: 'requires' }
      ];

      const layout = new EnhancedSkillTreeLayout(nodes, edges, {
        algorithm: 'semantic-hierarchy',
        containerWidth: 1600,
        containerHeight: 1200,
        nodeSpacing: { horizontal: 220, vertical: 160, category: 100 },
        layerHeight: 180
      });

      const positioned = layout.calculateLayout();
      const orphanNode = positioned.find(n => n.id === 'orphan');
      
      // Orphan should be positioned at the bottom (high Y value)
      expect(orphanNode?.y).toBeGreaterThan(1000);
    });

    it('should prevent infinite loops in circular dependencies', () => {
      const nodes = createTestNodes(3);
      const edges = [
        { source: 'node-0', target: 'node-1', type: 'requires' },
        { source: 'node-1', target: 'node-2', type: 'requires' },
        { source: 'node-2', target: 'node-0', type: 'requires' } // Creates cycle
      ];

      expect(() => {
        const layout = new EnhancedSkillTreeLayout(nodes, edges, {
          algorithm: 'semantic-hierarchy',
          containerWidth: 1600,
          containerHeight: 1200,
          nodeSpacing: { horizontal: 220, vertical: 160, category: 100 },
          layerHeight: 180
        });
        layout.calculateLayout();
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle small graphs quickly (≤100ms)', () => {
      const nodes = createTestNodes(12);
      const edges = createTestEdges(12);
      
      const startTime = performance.now();
      calculateEnhancedSkillTreeLayout(nodes, edges);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle medium graphs efficiently (≤250ms)', () => {
      const nodes = createTestNodes(60);
      const edges = createTestEdges(60);
      
      const startTime = performance.now();
      calculateEnhancedSkillTreeLayout(nodes, edges);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(250);
    });

    it('should handle large graphs within budget (≤450ms)', () => {
      const nodes = createTestNodes(150);
      const edges = createTestEdges(150);
      
      const startTime = performance.now();
      calculateEnhancedSkillTreeLayout(nodes, edges);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(450);
    });
  });

  describe('Layout Quality', () => {
    it('should maintain minimum spacing between nodes', () => {
      const nodes = createTestNodes(10);
      const edges = createTestEdges(10);
      
      const positioned = calculateEnhancedSkillTreeLayout(nodes, edges);
      
      // Check no nodes overlap
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const nodeA = positioned[i];
          const nodeB = positioned[j];
          
          const distance = Math.sqrt(
            Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2)
          );
          
          // Minimum distance should be at least node width + spacing
          expect(distance).toBeGreaterThan(100);
        }
      }
    });

    it('should group nodes by category', () => {
      const nodes = [
        { id: 'cat1-1', type: 'skill', title: 'Skill 1', category: 'Programming' },
        { id: 'cat1-2', type: 'skill', title: 'Skill 2', category: 'Programming' },
        { id: 'cat2-1', type: 'skill', title: 'Skill 3', category: 'Design' },
        { id: 'cat2-2', type: 'skill', title: 'Skill 4', category: 'Design' }
      ];
      const edges: LayoutEdge[] = [];

      const positioned = calculateEnhancedSkillTreeLayout(nodes, edges);
      
      // Nodes in same category should be closer to each other
      const cat1Nodes = positioned.filter(n => n.id.includes('cat1'));
      const cat2Nodes = positioned.filter(n => n.id.includes('cat2'));
      
      expect(cat1Nodes.length).toBe(2);
      expect(cat2Nodes.length).toBe(2);
      
      // Distance between cat1 nodes should be less than distance to cat2 nodes
      const cat1Distance = Math.abs(cat1Nodes[0].x - cat1Nodes[1].x);
      const crossDistance = Math.abs(cat1Nodes[0].x - cat2Nodes[0].x);
      
      expect(cat1Distance).toBeLessThan(crossDistance);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node list', () => {
      const positioned = calculateEnhancedSkillTreeLayout([], []);
      expect(positioned).toEqual([]);
    });

    it('should handle single node', () => {
      const nodes = [{ id: 'single', type: 'skill', title: 'Single Node' }];
      const positioned = calculateEnhancedSkillTreeLayout(nodes, []);
      
      expect(positioned).toHaveLength(1);
      expect(positioned[0].x).toBeGreaterThan(0);
      expect(positioned[0].y).toBeGreaterThan(0);
    });

    it('should handle disconnected components', () => {
      const nodes = [
        { id: 'comp1-1', type: 'skill', title: 'Component 1 Node 1' },
        { id: 'comp1-2', type: 'skill', title: 'Component 1 Node 2' },
        { id: 'comp2-1', type: 'skill', title: 'Component 2 Node 1' },
        { id: 'comp2-2', type: 'skill', title: 'Component 2 Node 2' }
      ];
      const edges = [
        { source: 'comp1-1', target: 'comp1-2', type: 'requires' },
        { source: 'comp2-1', target: 'comp2-2', type: 'requires' }
      ];

      const positioned = calculateEnhancedSkillTreeLayout(nodes, edges);
      expect(positioned).toHaveLength(4);
      
      // All nodes should be positioned
      positioned.forEach(node => {
        expect(node.x).toBeGreaterThan(0);
        expect(node.y).toBeGreaterThan(0);
      });
    });
  });
});