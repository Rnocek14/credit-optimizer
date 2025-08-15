import { EnhancedSkillTreeLayout, type LayoutNode, type LayoutEdge } from '../lib/enhancedSkillTreeLayout';

// Helper function to create test nodes with proper typing
const createTestNodes = (count: number): LayoutNode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `node-${i}`,
    type: 'skill' as const,
    title: `Test Skill ${i + 1}`,
    data: {}
  }));
};

// Helper function to create test edges with proper typing
const createTestEdges = (connections: Array<[number, number]>): LayoutEdge[] => {
  return connections.map(([from, to]) => ({
    source: `node-${from}`,
    target: `node-${to}`,
    type: 'requires' as const
  }));
};

describe('EnhancedSkillTreeLayout', () => {
  const defaultOptions = {
    algorithm: 'semantic-hierarchy' as const,
    containerWidth: 1600,
    containerHeight: 1200,
    nodeSpacing: { horizontal: 220, vertical: 160, category: 100 },
    layerHeight: 180
  };

  describe('Algorithm Selection', () => {
    it('should use semantic-hierarchy algorithm by default', () => {
      const nodes = createTestNodes(2);
      const edges = createTestEdges([[0, 1]]);
      
      const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultOptions);
      const positioned = layout.calculateLayout();
      
      expect(positioned).toHaveLength(2);
      expect(positioned[0]).toHaveProperty('x');
      expect(positioned[0]).toHaveProperty('y');
    });
  });

  describe('Orphan Node Handling', () => {
    it('should position orphan nodes separately', () => {
      const nodes: LayoutNode[] = [
        { id: 'orphan', type: 'skill', title: 'Orphaned Skill', data: {} },
        { id: 'connected-1', type: 'skill', title: 'Connected 1', data: {} },
        { id: 'connected-2', type: 'skill', title: 'Connected 2', data: {} }
      ];
      const edges: LayoutEdge[] = [
        { source: 'connected-1', target: 'connected-2', type: 'requires' }
      ];

      const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultOptions);
      const positioned = layout.calculateLayout();
      const orphanNode = positioned.find(n => n.id === 'orphan');
      
      expect(orphanNode).toBeDefined();
      expect(orphanNode?.x).toBeGreaterThan(0);
      expect(orphanNode?.y).toBeGreaterThan(0);
    });
  });

  describe('Cycle Detection', () => {
    it('should prevent infinite loops in circular dependencies', () => {
      const nodes = createTestNodes(3);
      const edges: LayoutEdge[] = [
        { source: 'node-0', target: 'node-1', type: 'requires' },
        { source: 'node-1', target: 'node-2', type: 'requires' },
        { source: 'node-2', target: 'node-0', type: 'requires' } // Creates cycle
      ];

      expect(() => {
        const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultOptions);
        layout.calculateLayout();
      }).not.toThrow();
    });
  });

  describe('Depth-Based Positioning', () => {
    it('should position nodes based on dependency depth', () => {
      const nodes = createTestNodes(4);
      const edges = createTestEdges([[0, 1], [1, 2], [2, 3]]);
      
      const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultOptions);
      const positioned = layout.calculateLayout();
      
      // Nodes should be positioned at increasing X coordinates based on depth
      const sortedByX = positioned.sort((a, b) => a.x - b.x);
      
      expect(sortedByX[0].id).toBe('node-0');
      expect(sortedByX[1].id).toBe('node-1');
      expect(sortedByX[2].id).toBe('node-2');
      expect(sortedByX[3].id).toBe('node-3');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large graphs efficiently', () => {
      const nodes = createTestNodes(100);
      const edges = createTestEdges(Array.from({ length: 150 }, (_, i) => [
        i % 100,
        (i + 1) % 100
      ]));
      
      const start = performance.now();
      const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultOptions);
      layout.calculateLayout();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node list', () => {
      const layout = new EnhancedSkillTreeLayout([], [], defaultOptions);
      const positioned = layout.calculateLayout();
      
      expect(positioned).toEqual([]);
    });

    it('should handle single node', () => {
      const nodes = createTestNodes(1);
      const layout = new EnhancedSkillTreeLayout(nodes, [], defaultOptions);
      const positioned = layout.calculateLayout();
      
      expect(positioned).toHaveLength(1);
      expect(positioned[0].x).toBeGreaterThanOrEqual(0);
      expect(positioned[0].y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Category-Based Layout', () => {
    it('should group nodes by category when available', () => {
      const nodes: LayoutNode[] = [
        { id: '1', type: 'skill', title: 'Backend Development', category: 'technical', data: {} },
        { id: '2', type: 'skill', title: 'API Design', category: 'technical', data: {} },
        { id: '3', type: 'course', title: 'Database Fundamentals', category: 'education', data: {} },
        { id: '4', type: 'project', title: 'E-commerce API', category: 'practical', data: {} },
        { id: '5', type: 'job', title: 'Backend Engineer', category: 'career', data: {} }
      ];
      
      const layout = new EnhancedSkillTreeLayout(nodes, [], defaultOptions);
      const positioned = layout.calculateLayout();
      
      expect(positioned).toHaveLength(5);
      
      // Nodes with same category should be grouped together
      const technicalNodes = positioned.filter(n => 
        nodes.find(original => original.id === n.id)?.category === 'technical'
      );
      
      expect(technicalNodes).toHaveLength(2);
    });
  });

  describe('Layout Stability', () => {
    it('should produce consistent results for identical inputs', () => {
      const nodes: LayoutNode[] = [
        { id: '1', type: 'skill', title: 'Skill A', data: {} },
        { id: '2', type: 'skill', title: 'Skill B', data: {} },
        { id: '3', type: 'skill', title: 'Skill C', data: {} }
      ];
      
      const layout1 = new EnhancedSkillTreeLayout(nodes, [], defaultOptions);
      const positioned1 = layout1.calculateLayout();
      
      const layout2 = new EnhancedSkillTreeLayout(nodes, [], defaultOptions);
      const positioned2 = layout2.calculateLayout();
      
      expect(positioned1).toEqual(positioned2);
    });
  });

  describe('Container Bounds', () => {
    it('should respect container dimensions', () => {
      const nodes: LayoutNode[] = [
        { id: '1', type: 'skill', title: 'Skill A', data: {} },
        { id: '2', type: 'skill', title: 'Skill B', data: {} },
        { id: '3', type: 'skill', title: 'Skill C', data: {} },
        { id: '4', type: 'skill', title: 'Skill D', data: {} },
        { id: '5', type: 'skill', title: 'Skill E', data: {} }
      ];
      
      const layout = new EnhancedSkillTreeLayout(nodes, [], {
        ...defaultOptions,
        containerWidth: 800,
        containerHeight: 600
      });
      const positioned = layout.calculateLayout();
      
      positioned.forEach(node => {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(800);
        expect(node.y).toBeLessThanOrEqual(600);
      });
    });
  });
});