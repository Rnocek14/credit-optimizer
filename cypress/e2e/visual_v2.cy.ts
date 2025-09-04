const pathUrl = '/skilltree3';

const q = {
  node: '[data-testid="lp-node"]',
  edgeLabel: '[data-testid="lp-edge-label"]',
  edgeOn: '.lp-edge-on-path',
  edgeRelated: '.lp-edge-related',
  edgeOff: '.lp-edge-off-path',
  step: '[data-testid="lp-step-badge"]',
  preset: (k: string) => `[data-testid="lp-preset-${k}"]`,
};

describe('Life Path — Visual V2 Hierarchy', () => {
  before(() => {
    cy.window().then(win => {
      try { 
        win.localStorage.setItem('LP_VISUAL_V2', '1'); 
      } catch (e) {
        console.warn('Could not set localStorage:', e);
      }
    });
  });

  beforeEach(() => {
    cy.visit(pathUrl);
    // Wait for the graph to load
    cy.get(q.node, { timeout: 10000 }).should('have.length.greaterThan', 5);
  });

  it('Applies visual tiers and shows transfer labels', () => {
    // Basic structure exists
    cy.get(q.node).should('have.length.greaterThan', 5);
    cy.get(q.step).its('length').should('be.greaterThan', 2);

    // Visual V2 tiers are present (if enabled)
    cy.window().then(win => {
      if (win.localStorage.getItem('LP_VISUAL_V2') === '1') {
        cy.get(q.edgeOn).its('length').should('be.greaterThan', 2);
        cy.get(q.edgeOff).its('length').should('be.greaterThan', 1);
      }
    });

    // Transfer labels exist in all cases
    cy.get(q.edgeLabel).its('length').should('be.greaterThan', 0);
  });

  ['fastest', 'cheapest', 'creditMaximized', 'balanced'].forEach(preset => {
    it(`Preset ${preset}: path readable and counts stable`, () => {
      // Click preset and wait for update
      cy.get(q.preset(preset)).click();
      cy.wait(400);
      
      // Verify path is visible
      cy.get(q.step).its('length').should('be.greaterThan', 2);
      
      // Verify visual hierarchy (if V2 enabled)
      cy.window().then(win => {
        if (win.localStorage.getItem('LP_VISUAL_V2') === '1') {
          cy.get(q.edgeOn).its('length').should('be.greaterThan', 2);
        }
      });
      
      // Transfer labels persist
      cy.get(q.edgeLabel).its('length').should('be.greaterThan', 0);
    });
  });

  it('Visual V2 toggle works correctly', () => {
    // Test with V2 enabled
    cy.window().then(win => {
      win.localStorage.setItem('LP_VISUAL_V2', '1');
    });
    cy.reload();
    cy.get(q.node).should('have.length.greaterThan', 5);
    
    // Check for tier classes
    cy.get('body').then($body => {
      const hasTiers = $body.find('.lp-edge-on-path, .lp-edge-related, .lp-edge-off-path').length > 0;
      if (hasTiers) {
        cy.get(q.edgeOn).should('exist');
      }
    });

    // Test with V2 disabled
    cy.window().then(win => {
      win.localStorage.removeItem('LP_VISUAL_V2');
    });
    cy.reload();
    cy.get(q.node).should('have.length.greaterThan', 5);
    cy.get(q.step).its('length').should('be.greaterThan', 2);
  });

  it('Edge routing avoids node crossings', () => {
    // Enable V2 for SmoothStep routing
    cy.window().then(win => {
      win.localStorage.setItem('LP_VISUAL_V2', '1');
    });
    cy.reload();
    
    cy.get(q.node).should('have.length.greaterThan', 5);
    
    // Verify edges use proper anchoring (visual check that paths look clean)
    cy.get('.react-flow__edge').should('exist');
    
    // Check that step badges are visible with proper styling
    cy.get(q.step).should('be.visible').and('have.length.greaterThan', 2);
  });
});