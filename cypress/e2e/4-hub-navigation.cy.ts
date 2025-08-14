describe('4-Hub Navigation System', () => {
  beforeEach(() => {
    // Mock authentication for testing
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', 'mock-token');
    });
  });

  it('should display the correct hub navigation items', () => {
    cy.visit('/plan');
    
    // Check that hub navigation exists
    cy.get('[data-testid="hub-nav"]').should('exist');
    
    // Check primary hubs are visible
    cy.get('[data-testid="nav-discover"]').should('be.visible');
    cy.get('[data-testid="nav-plan"]').should('be.visible');
    
    // Progress hub should be visible for active users
    cy.get('[data-testid="nav-progress"]').should('be.visible');
  });

  it('should navigate between hubs correctly', () => {
    cy.visit('/plan');
    
    // Navigate to Discover hub
    cy.get('[data-testid="nav-discover"]').click();
    cy.url().should('include', '/discover');
    
    // Navigate to Progress hub
    cy.get('[data-testid="nav-progress"]').click();
    cy.url().should('include', '/progress');
    
    // Navigate back to Plan hub
    cy.get('[data-testid="nav-plan"]').click();
    cy.url().should('include', '/plan');
  });

  it('should display Today dashboard in Plan hub', () => {
    cy.visit('/plan');
    
    // Check Today dashboard components
    cy.get('[data-testid="today-next-step"]').should('be.visible');
    cy.get('[data-testid="today-focus-skills"]').should('be.visible');
    cy.get('[data-testid="today-quick-wins"]').should('be.visible');
    cy.get('[data-testid="today-streak"]').should('be.visible');
    
    // Check primary CTA
    cy.get('[data-testid="cta-next-step"]').should('be.visible');
  });

  it('should support tab navigation in Plan hub', () => {
    cy.visit('/plan');
    
    // Check default tab
    cy.get('[data-testid="tab-roadmap"]').should('have.attr', 'data-state', 'active');
    
    // Navigate to Goals tab
    cy.get('[data-testid="tab-goals"]').click();
    cy.url().should('include', 'tab=goals');
    cy.get('[data-testid="tab-goals"]').should('have.attr', 'data-state', 'active');
    
    // Navigate to Workflows tab
    cy.get('[data-testid="tab-workflows"]').click();
    cy.url().should('include', 'tab=workflows');
    cy.get('[data-testid="tab-workflows"]').should('have.attr', 'data-state', 'active');
  });

  it('should support tab navigation in Discover hub', () => {
    cy.visit('/discover');
    
    // Check tabs exist
    cy.get('[data-testid="tab-careers"]').should('be.visible');
    cy.get('[data-testid="tab-courses"]').should('be.visible');
    cy.get('[data-testid="tab-mentors"]').should('be.visible');
    
    // Test tab switching
    cy.get('[data-testid="tab-courses"]').click();
    cy.get('[data-testid="tab-courses"]').should('have.attr', 'data-state', 'active');
  });

  it('should support tab navigation in Progress hub', () => {
    cy.visit('/progress');
    
    // Check tabs exist
    cy.get('[data-testid="tab-history"]').should('be.visible');
    cy.get('[data-testid="tab-portfolio"]').should('be.visible');
    cy.get('[data-testid="tab-credentials"]').should('be.visible');
    cy.get('[data-testid="tab-resume"]').should('be.visible');
    
    // Test tab switching
    cy.get('[data-testid="tab-portfolio"]').click();
    cy.get('[data-testid="tab-portfolio"]').should('have.attr', 'data-state', 'active');
  });

  it('should handle Next Step CTA correctly', () => {
    cy.visit('/plan');
    
    // Click Next Step CTA
    cy.get('[data-testid="cta-next-step"]').click();
    
    // Should navigate to roadmap tab
    cy.url().should('include', 'tab=roadmap');
    cy.get('[data-testid="tab-roadmap"]').should('have.attr', 'data-state', 'active');
  });

  it('should display correct CTAs with data-testids', () => {
    // Test Discover hub CTAs
    cy.visit('/discover');
    cy.get('[data-testid="save-to-plan"]').should('exist');
    
    // Test Progress hub CTAs
    cy.visit('/progress');
    cy.get('[data-testid="add-to-resume"]').should('exist');
    cy.get('[data-testid="manage-wallet"]').should('exist');
  });

  it('should handle deep linking to hub tabs', () => {
    // Test direct navigation to specific tabs
    cy.visit('/plan?tab=goals');
    cy.get('[data-testid="tab-goals"]').should('have.attr', 'data-state', 'active');
    
    cy.visit('/discover?tab=courses');
    cy.get('[data-testid="tab-courses"]').should('have.attr', 'data-state', 'active');
    
    cy.visit('/progress?tab=portfolio');
    cy.get('[data-testid="tab-portfolio"]').should('have.attr', 'data-state', 'active');
  });

  it('should handle legacy route redirects', () => {
    // Test some key legacy redirects
    cy.visit('/goals');
    cy.url().should('include', '/plan');
    
    cy.visit('/explore');
    cy.url().should('include', '/discover');
    
    cy.visit('/learning-history');
    cy.url().should('include', '/progress');
  });

  it('should show progressive disclosure correctly', () => {
    cy.visit('/plan');
    
    // Should show Discover and Plan by default
    cy.get('[data-testid="nav-discover"]').should('be.visible');
    cy.get('[data-testid="nav-plan"]').should('be.visible');
    
    // Progress should be visible for non-new users
    cy.get('[data-testid="nav-progress"]').should('be.visible');
    
    // Contribute may or may not be visible depending on permissions
    cy.get('body').then($body => {
      if ($body.find('[data-testid="nav-contribute"]').length > 0) {
        cy.get('[data-testid="nav-contribute"]').should('be.visible');
      }
    });
  });
});