/**
 * E2E test for Y3 bundle alignment
 * Validates that SE and DS bundles in Year 3 share the same Y coordinate
 */

describe('EduTree V3: Y3 Bundle Alignment', () => {
  beforeEach(() => {
    cy.visit('/?v3=1&layout=vertical');
    cy.wait(1000); // Wait for graph to render
  });

  it('Y3 SE and DS bundles have same Y coordinate', () => {
    cy.window().then(win => {
      const dump = (win as any).__dumpV3?.();
      
      if (!dump) {
        throw new Error('__dumpV3 not available on window');
      }
      
      const y3Nodes = dump.nodes.filter((n: any) => n.data?.year === 3);
      
      // Should have 2 Y3 nodes (SE and DS)
      expect(y3Nodes.length).to.equal(2);
      
      // Both should have the same Y coordinate
      const [node1, node2] = y3Nodes;
      expect(node1.position.y).to.equal(node2.position.y);
      
      // Log for debugging
      cy.log('Y3 Alignment Check:', {
        SE: node1.position,
        DS: node2.position,
        yMatch: node1.position.y === node2.position.y
      });
    });
  });

  it('Y3 bundles have correct horizontal spacing', () => {
    cy.window().then(win => {
      const dump = (win as any).__dumpV3?.();
      const y3Nodes = dump.nodes.filter((n: any) => n.data?.year === 3);
      
      expect(y3Nodes.length).to.equal(2);
      
      const [node1, node2] = y3Nodes;
      const xDiff = Math.abs(node1.position.x - node2.position.x);
      
      // Should be separated by H_SPACING (320px)
      expect(xDiff).to.be.greaterThan(300);
      expect(xDiff).to.be.lessThan(340);
    });
  });

  it('validates no Y3 overlaps', () => {
    cy.get('[data-testid="validate-overlaps"]').click();
    
    cy.get('.sonner-toast')
      .should('be.visible')
      .and('contain', 'No overlaps');
  });
});
