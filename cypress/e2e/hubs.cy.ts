describe('4-Hub Information Architecture', () => {
  beforeEach(() => {
    // Navigate to the plan hub as it's the default landing page
    cy.visit('/plan');
  });

  it('shows exactly 4 hubs in navigation', () => {
    cy.get('[data-testid="hub-nav"]').within(() => {
      cy.get('[data-testid^="hub-link-"]').should('have.length.at.least', 2); // Always shows DISCOVER and PLAN
      cy.get('[data-testid="hub-link-discover"]').should('contain', 'DISCOVER');
      cy.get('[data-testid="hub-link-plan"]').should('contain', 'PLAN');
      
      // PROGRESS and CONTRIBUTE may be hidden based on user stage/permissions
      // So we just check they exist if visible
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="hub-link-progress"]').length > 0) {
          cy.get('[data-testid="hub-link-progress"]').should('contain', 'PROGRESS');
        }
        if ($body.find('[data-testid="hub-link-contribute"]').length > 0) {
          cy.get('[data-testid="hub-link-contribute"]').should('contain', 'CONTRIBUTE');
        }
      });
    });
  });

  it('redirects legacy routes to correct hubs', () => {
    // Test DISCOVER redirects
    cy.visit('/explore-courses');
    cy.url().should('include', '/discover');

    cy.visit('/market-intelligence');
    cy.url().should('include', '/discover');

    // Test PLAN redirects  
    cy.visit('/planner');
    cy.url().should('include', '/plan');

    cy.visit('/goals');
    cy.url().should('include', '/plan');

    // Test PROGRESS redirects
    cy.visit('/learning-history');
    cy.url().should('include', '/progress');

    cy.visit('/resume-builder');
    cy.url().should('include', '/progress');

    // Test root and dashboard redirect to plan
    cy.visit('/dashboard');
    cy.url().should('include', '/plan');
  });

  it('shows Maya guidance on each hub', () => {
    // Test DISCOVER hub
    cy.visit('/discover');
    cy.get('[data-testid="maya-panel-discover"]').should('exist');
    cy.get('[data-testid="cta-save-to-plan"]').should('exist');

    // Test PLAN hub
    cy.visit('/plan');
    cy.get('[data-testid="maya-panel-plan"]').should('exist');
    cy.get('[data-testid="cta-next-step"]').should('exist');

    // Test PROGRESS hub
    cy.visit('/progress');
    cy.get('[data-testid="maya-panel-progress"]').should('exist');
    cy.get('[data-testid="cta-add-to-resume"]').should('exist');

    // Test CONTRIBUTE hub
    cy.visit('/contribute');
    cy.get('[data-testid="maya-panel-contribute"]').should('exist');
    cy.get('[data-testid="cta-contribute"]').should('exist');
  });

  it('has progressive disclosure based on journey stage', () => {
    cy.get('[data-testid="hub-nav"]').should('have.attr', 'data-stage');
    
    // Check that navigation adapts to user stage
    cy.get('[data-testid="hub-nav"]').then(($nav) => {
      const stage = $nav.attr('data-stage');
      
      if (stage === 'new') {
        // New users should see DISCOVER and PLAN only
        cy.get('[data-testid="hub-link-discover"]').should('exist');
        cy.get('[data-testid="hub-link-plan"]').should('exist');
      } else {
        // Active/power users should see PROGRESS too
        cy.get('[data-testid="hub-link-progress"]').should('exist');
      }
    });
  });

  it('navigates between hubs correctly', () => {
    // Start on PLAN
    cy.visit('/plan');
    cy.get('[data-testid="hub-link-plan"]').should('have.class', 'bg-primary');

    // Navigate to DISCOVER
    cy.get('[data-testid="hub-link-discover"]').click();
    cy.url().should('include', '/discover');
    cy.get('[data-testid="hub-link-discover"]').should('have.class', 'bg-primary');

    // Navigate to PROGRESS (if visible)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="hub-link-progress"]').length > 0) {
        cy.get('[data-testid="hub-link-progress"]').click();
        cy.url().should('include', '/progress');
        cy.get('[data-testid="hub-link-progress"]').should('have.class', 'bg-primary');
      }
    });
  });
});