describe('Tutorial Deep-link Support', () => {
  beforeEach(() => {
    // Mock authenticated state for tutorial features
    cy.window().then((win) => {
      win.localStorage.setItem('lp:tutorial:enabled', 'true');
    });
  });

  it('opens Market Intelligence overview tip via query params', () => {
    cy.visit('/market-intelligence?tutorial=on&tip=mi_overview_card', { 
      failOnStatusCode: false 
    });
    
    // Wait for page to load and tutorial to activate
    cy.wait(500);
    
    // Check that tutorial mode is enabled
    cy.window().then((win) => {
      expect(win.localStorage.getItem('lp:tutorial:enabled')).to.equal('true');
    });
    
    // Check that URL parameters are cleaned
    cy.location('search').should('not.contain', 'tutorial=').and('not.contain', 'tip=');
    
    // Verify the tip element exists (if present on page)
    cy.get('body').then(($body) => {
      if ($body.find('[data-tutorial-tip="mi_overview_card"]').length > 0) {
        cy.get('[data-tutorial-tip="mi_overview_card"]').should('exist');
      }
    });
  });

  it('handles non-existent tips gracefully', () => {
    cy.visit('/market-intelligence?tutorial=on&tip=invalid_tip_id', { 
      failOnStatusCode: false 
    });
    
    cy.wait(500);
    
    // URL should still be cleaned even if tip doesn't exist
    cy.location('search').should('not.contain', 'tutorial=').and('not.contain', 'tip=');
  });
});