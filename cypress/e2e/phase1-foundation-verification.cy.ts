describe('Phase 1 Foundation Verification', () => {
  beforeEach(() => {
    // Mock authenticated state for tutorial features
    cy.window().then((win) => {
      win.localStorage.setItem('lp:tutorial:enabled', 'true');
    });
  });

  it('validates maya-alts tutorial anchor exists and deep-link works', () => {
    cy.visit('/workflows?tutorial=on&tip=maya_alts', { 
      failOnStatusCode: false 
    });
    
    // Wait for page to load and tutorial to activate
    cy.wait(500);
    
    // Check that URL parameters are cleaned
    cy.location('search').should('not.contain', 'tutorial=').and('not.contain', 'tip=');
    
    // Verify the maya-alts element exists
    cy.get('#maya-alts').should('exist');
    
    // Check that tutorial tip element exists within the section
    cy.get('#maya-alts').within(() => {
      cy.get('[data-tutorial-tip="maya_alt_paths"]').should('exist');
    });
  });

  it('validates maya-certs tutorial anchor exists and deep-link works', () => {
    cy.visit('/workflows?tutorial=on&tip=maya_certs', { 
      failOnStatusCode: false 
    });
    
    // Wait for page to load and tutorial to activate
    cy.wait(500);
    
    // Check that URL parameters are cleaned
    cy.location('search').should('not.contain', 'tutorial=').and('not.contain', 'tip=');
    
    // Verify the maya-certs element exists
    cy.get('#maya-certs').should('exist');
    
    // Check that tutorial tip element exists within the section
    cy.get('#maya-certs').within(() => {
      cy.get('[data-tutorial-tip="maya_certificates"]').should('exist');
    });
  });

  it('validates multi-track integration in workflows page', () => {
    cy.visit('/workflows', { failOnStatusCode: false });
    
    // Check that the workflows page loads without errors
    cy.get('.container').should('exist');
    
    // Verify that Maya Intelligence Dashboard loads
    cy.contains('Maya Intelligence Dashboard').should('exist');
    
    // Verify that Enhanced Workflow Dashboard loads
    cy.contains('Maya\'s Autonomous Workflow Engine').should('exist');
  });
});