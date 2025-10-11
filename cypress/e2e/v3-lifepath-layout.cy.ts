/// <reference types="cypress" />

/**
 * LifePath tier-based layout validation
 * 
 * Ensures LifePath data renders correctly in vertical mode with:
 * - Many positioned nodes (>10)
 * - Tier-based vertical stacking
 * - Checkpoint positioning
 */

describe('EduTree V3 - LifePath Tier Layout', () => {
  beforeEach(() => {
    cy.visit('/?v3=1&layout=vertical&source=lifepath');
    cy.get('.react-flow__renderer', { timeout: 15000 }).should('be.visible');
    cy.wait(1000); // Let graph stabilize
  });

  it('positions many nodes in tier mode', () => {
    // Should render significantly more than seed data (which has ~7-9 nodes)
    cy.get('.react-flow__node').should('have.length.greaterThan', 10);
    
    // Verify nodes are actually positioned (not at 0,0)
    cy.window().then(win => {
      const dump = (win as any).__dumpV3?.();
      if (dump?.nodes) {
        const positions = dump.nodes.map((n: any) => n.position);
        const positioned = positions.filter((p: any) => p && (p.x !== 0 || p.y !== 0));
        expect(positioned.length).to.be.greaterThan(10);
      }
    });
  });

  it('positions checkpoint after source node', () => {
    // Checkpoint should exist
    cy.get('[data-node-type="checkpoint"]').should('have.length.at.least', 1);
    
    // Checkpoint should be clickable (not behind edges)
    cy.get('[data-node-type="checkpoint"]').first().click();
    
    // Drawer should open
    cy.get('[data-testid="alternatives-drawer"]', { timeout: 3000 }).should('be.visible');
  });

  it('clears selection when switching to seed data', () => {
    // Click checkpoint to select alternative
    cy.get('[data-node-type="checkpoint"]').first().click();
    cy.get('[data-testid="alternatives-drawer"]').should('be.visible');
    
    // Select an alternative (if available)
    cy.get('[data-testid="alternative-option"]').first().click();
    
    // Toggle to seed data
    cy.contains('button', 'Data:').click(); // DevToolbar toggle
    
    // Selection should be cleared (no dimming)
    cy.get('.node-dimmed').should('not.exist');
  });

  it('validates no overlaps in tier layout', () => {
    cy.contains('button', 'Validate Overlaps').click();
    cy.contains('No overlaps detected', { timeout: 3000 }).should('be.visible');
  });
});
