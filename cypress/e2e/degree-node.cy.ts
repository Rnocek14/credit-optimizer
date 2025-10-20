describe('Degree Node V5', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('toggles collapse and persists across reload', () => {
    // Wait for degree node to render
    cy.get('.degree-node').should('be.visible');
    
    // Should start expanded (default state)
    cy.get('.degree-node').should('have.class', 'expanded');
    
    // Click to collapse
    cy.get('.degree-node').click();
    
    // Should now be collapsed
    cy.get('.degree-node').should('have.class', 'collapsed');
    
    // Reload page
    cy.reload();
    
    // Collapsed state should persist
    cy.get('.degree-node').should('have.class', 'collapsed');
    
    // Click to expand again
    cy.get('.degree-node').click();
    cy.get('.degree-node').should('have.class', 'expanded');
  });

  it('shows clamped progress ≤ 100%', () => {
    cy.get('.degree-node').should('be.visible');
    
    // Expand if collapsed
    cy.get('.degree-node').then(($node) => {
      if ($node.hasClass('collapsed')) {
        cy.get('.degree-node').click();
      }
    });
    
    // Check progressbar value is clamped
    cy.get('[role="progressbar"]')
      .should('have.attr', 'aria-valuenow')
      .then((val) => {
        const numVal = Number(val);
        expect(numVal).to.be.at.least(0);
        expect(numVal).to.be.at.most(100);
      });
  });

  it('hides planned chip when complete', () => {
    cy.get('.degree-node').should('be.visible');
    
    // Expand if collapsed
    cy.get('.degree-node').then(($node) => {
      if ($node.hasClass('collapsed')) {
        cy.get('.degree-node').click();
      }
    });
    
    // Check if degree is complete
    cy.get('.degree-node').within(() => {
      cy.get('body').then(($body) => {
        const isComplete = $body.text().includes('✅ Completed');
        
        if (isComplete) {
          // Planned chip should not exist when complete
          cy.contains('📚 Planned').should('not.exist');
        } else {
          // If not complete and planned > earned, chip should exist
          cy.get('[role="progressbar"]').should('exist');
        }
      });
    });
  });

  it('shows warnings popover when clicked', () => {
    cy.get('.degree-node').should('be.visible');
    
    // Expand if collapsed
    cy.get('.degree-node').then(($node) => {
      if ($node.hasClass('collapsed')) {
        cy.get('.degree-node').click();
      }
    });
    
    // Check if warnings badge exists
    cy.get('.degree-node').within(() => {
      cy.get('body').then(($body) => {
        if ($body.find('[aria-label*="warning"]').length > 0) {
          // Click warnings badge
          cy.get('[aria-label*="warning"]').click();
          
          // Popover should appear
          cy.get('[role="dialog"]').should('be.visible');
          cy.contains('Planning Warnings').should('be.visible');
        }
      });
    });
  });

  it('supports keyboard navigation', () => {
    cy.get('.degree-node').should('be.visible');
    
    // Focus on degree node
    cy.get('.degree-node').focus();
    
    // Press Enter to toggle
    cy.get('.degree-node').type('{enter}');
    
    // Should toggle state
    cy.get('.degree-node').should('have.class', 'collapsed');
    
    // Press Space to toggle back
    cy.get('.degree-node').type(' ');
    cy.get('.degree-node').should('have.class', 'expanded');
  });
});
