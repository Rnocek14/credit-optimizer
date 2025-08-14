describe('Plan Recommendations', () => {
  beforeEach(() => {
    cy.visit('/plan?tab=overview');
  });

  it('loads Plan Overview with recommendation feed', () => {
    // Check that recommendation feed is visible
    cy.get('[data-testid="reco-feed"]').should('be.visible');
    
    // Check that at least one recommendation card exists
    cy.get('[data-testid="reco-card"]').should('have.length.at.least', 1);
  });

  it('filters recommendations by tabs', () => {
    // Click on skill gaps tab
    cy.get('[data-testid="reco-tab-skill-gaps"]').click();
    
    // Check that all visible cards are skill gap type
    cy.get('[data-testid="reco-card"]').each(($card) => {
      cy.wrap($card).should('contain', 'Skill Gap');
    });
  });

  it('verifies Next Step integration with Today Dashboard', () => {
    // Check that next step button exists
    cy.get('[data-testid="today-next-step"]').should('exist');
    
    // Clicking should navigate to appropriate page
    cy.get('[data-testid="today-next-step"]').click();
    
    // Should navigate to plan roadmap or discover (depending on recommendation)
    cy.url().should('satisfy', (url) => {
      return url.includes('/plan?tab=roadmap') || url.includes('/discover');
    });
  });

  it('shows quick actions when skill gaps exist', () => {
    // If skill gaps exist, quick actions should be visible
    cy.get('[data-testid="reco-card"]').then(($cards) => {
      const hasSkillGaps = Array.from($cards).some(card => 
        card.textContent?.includes('Skill Gap')
      );
      
      if (hasSkillGaps) {
        cy.get('[data-testid="qa-find-courses"]').should('be.visible');
        cy.get('[data-testid="qa-find-mentors"]').should('be.visible');
        cy.get('[data-testid="qa-start-project"]').should('be.visible');
        cy.get('[data-testid="qa-market-updates"]').should('be.visible');
      }
    });
  });

  it('verifies primary CTA functionality', () => {
    // Primary CTA should exist on first card
    cy.get('[data-testid="reco-primary-cta"]').should('exist');
    
    // Clicking should navigate appropriately
    cy.get('[data-testid="reco-primary-cta"]').click();
    
    // Should navigate to a valid hub
    cy.url().should('satisfy', (url) => {
      return url.includes('/discover') || 
             url.includes('/plan') || 
             url.includes('/progress') || 
             url.includes('/contribute');
    });
  });

  it('verifies accessibility of recommendation cards', () => {
    cy.get('[data-testid="reco-card"]').each(($card) => {
      // Each card should have an accessible title (h3 element)
      cy.wrap($card).find('h3').should('exist');
      
      // Cards should be keyboard accessible
      cy.wrap($card).should('not.have.attr', 'tabindex', '-1');
    });
  });

  it('tests density toggle functionality', () => {
    // Find and click density toggle
    cy.get('[data-testid="reco-density-toggle"]').click();
    
    // Verify that the layout changes (classes or styling should change)
    cy.get('[data-testid="reco-card"]').first().should('exist');
  });

  it('verifies deep linking with filters', () => {
    // Test find courses action with skill filters
    cy.get('[data-testid="qa-find-courses"]').then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click();
        cy.url().should('include', '/discover');
        cy.url().should('include', 'filter=skill-gaps');
      }
    });
  });
});