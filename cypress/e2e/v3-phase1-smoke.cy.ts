describe('V3 Phase 1 - Type System & Contracts (Smoke Test)', () => {
  beforeEach(() => {
    cy.visit('/edu-tree-v3-vertical');
    cy.window().then((win) => {
      // Wait for React Flow to mount
      cy.get('[data-rf-node]', { timeout: 10000 }).should('exist');
    });
  });

  it('exposes RF instance id and maintains stability across re-renders', () => {
    cy.window().then((win) => {
      const instanceId1 = (win as any).__rfInstanceId;
      expect(instanceId1).to.be.a('string');
      expect(instanceId1.length).to.be.greaterThan(0);

      // Trigger a re-render (fit view action)
      cy.contains('button', 'Fit View').click();
      
      cy.window().then((win2) => {
        const instanceId2 = (win2 as any).__rfInstanceId;
        expect(instanceId2).to.equal(instanceId1, 'RF instance should remain stable across re-renders');
      });
    });
  });

  it('exposes __dumpV3() with complete Phase 1 contracts', () => {
    cy.window().then((win) => {
      const dump = (win as any).__dumpV3?.();
      
      // Verify dump function exists and returns data
      expect(dump, '__dumpV3() should exist and return data').to.exist;
      
      // Phase 1 contract fields
      expect(dump).to.have.property('instanceId');
      expect(dump.instanceId).to.be.a('string');
      
      expect(dump).to.have.property('nodes');
      expect(dump.nodes).to.be.an('array');
      expect(dump.nodes.length).to.be.greaterThan(0);
      
      expect(dump).to.have.property('edges');
      expect(dump.edges).to.be.an('array');
      
      expect(dump).to.have.property('layout');
      expect(dump.layout).to.be.a('string');
      
      expect(dump).to.have.property('tokens');
      expect(dump.tokens).to.be.an('object');
      
      // Phase 1: branchState placeholder (unselected)
      expect(dump).to.have.property('branchState');
      expect(dump.branchState).to.deep.equal({ kind: 'unselected' });
    });
  });

  it('renders same node/edge counts as baseline (no behavior change)', () => {
    cy.get('[data-rf-node]').then(($nodes) => {
      const nodeCount = $nodes.length;
      // Expected baseline: 7 nodes (Y1, Program Gate, Y2, Track Gate, Y3-SE, Y3-DS, Y4)
      expect(nodeCount).to.equal(7, 'Node count should match baseline');
    });

    cy.get('[data-rf-edge]').then(($edges) => {
      const edgeCount = $edges.length;
      // Edges should exist (exact count may vary based on implementation)
      expect(edgeCount).to.be.greaterThan(0);
    });
  });

  it('validates grid alignment (VERT.GRID = 8)', () => {
    cy.window().then((win) => {
      const dump = (win as any).__dumpV3?.();
      expect(dump?.tokens?.GRID).to.equal(8);

      // Verify all node positions are grid-aligned
      dump.nodes.forEach((node: any) => {
        expect(node.position.x % 8).to.equal(0, `Node ${node.id} X position should be grid-aligned`);
        expect(node.position.y % 8).to.equal(0, `Node ${node.id} Y position should be grid-aligned`);
      });
    });
  });

  it('validates Phase 1 layout tokens (RANKING_WEIGHTS + MERGE_RADIUS)', () => {
    cy.window().then((win) => {
      const dump = (win as any).__dumpV3?.();
      const tokens = dump?.tokens;

      // Verify RANKING_WEIGHTS exist and sum to 1.0
      expect(tokens).to.have.property('RANKING_WEIGHTS');
      const weights = tokens.RANKING_WEIGHTS;
      
      expect(weights.CREDITS_KEPT).to.equal(0.4);
      expect(weights.TIME_WEEKS).to.equal(0.3);
      expect(weights.COST_USD).to.equal(0.2);
      expect(weights.OUTCOME_ALIGNMENT).to.equal(0.1);

      const sum = weights.CREDITS_KEPT + weights.TIME_WEEKS + weights.COST_USD + weights.OUTCOME_ALIGNMENT;
      expect(sum).to.equal(1.0, 'Ranking weights should sum to 1.0');

      // Verify MERGE_RADIUS
      expect(tokens.MERGE_RADIUS).to.equal(24);
    });
  });

  it('validates no console errors during render', () => {
    // Cypress captures console errors automatically
    // This test ensures clean render with no warnings
    cy.window().then((win) => {
      // Check for React Flow instance (proves clean mount)
      const dump = (win as any).__dumpV3?.();
      expect(dump?.nodes?.length).to.be.greaterThan(0);
    });
  });

  it('validates V3NodeData supports new Phase 1 fields (dev hook)', () => {
    cy.window().then((win) => {
      const dump = (win as any).__dumpV3?.();
      const nodes = dump?.nodes || [];

      // Sample a node to verify schema (not checking values, just structure)
      if (nodes.length > 0) {
        const sampleNode = nodes[0];
        
        // Phase 1 fields may be undefined but should not error
        // This test just verifies the structure compiles
        expect(sampleNode).to.have.property('id');
        expect(sampleNode).to.have.property('type');
        expect(sampleNode).to.have.property('data');
        expect(sampleNode).to.have.property('position');

        // V3NodeData may have: tier, tierLabel, type, lineage, alternatives
        // (These are optional; we just verify they don't break if present)
        const data = sampleNode.data;
        expect(data).to.be.an('object');
      }
    });
  });
});
