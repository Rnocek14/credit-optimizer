describe('Discover Market Infusion', () => {
  beforeEach(() => {
    cy.visit('/discover');
    cy.wait(2000); // Allow market data to load
  });

  it('displays market-enhanced career cards with opportunity scores', () => {
    cy.get('[data-testid="tab-careers"]').click();
    
    // Check that career cards display market information
    cy.get('[data-testid="career-card"]').should('have.length.at.least', 3);
    cy.get('[data-testid="opportunity-score"]').should('be.visible');
    cy.get('[data-testid="market-badge"]').should('be.visible');
  });

  it('allows sorting by different criteria', () => {
    cy.get('[data-testid="sort-opportunity"]').should('be.visible').click();
    cy.get('[data-testid="sort-salary"]').click();
    cy.get('[data-testid="sort-growth"]').click();
  });

  it('shows market tooltips with calculation details', () => {
    cy.get('[data-testid="market-tooltip-trigger"]').first().trigger('mouseover');
    cy.get('[data-testid="market-tooltip-content"]').should('contain', 'Opportunity Score');
    cy.get('[data-testid="calculation-breakdown"]').should('be.visible');
  });

  it('displays course ROI calculations', () => {
    cy.get('[data-testid="tab-courses"]').click();
    cy.get('[data-testid="course-roi"]').should('be.visible');
    cy.get('[data-testid="expected-roi"]').should('contain', '%');
  });

  it('handles deep linking with sort parameters', () => {
    cy.visit('/discover?sort=salary');
    cy.get('[data-testid="sort-salary"]').should('have.class', 'bg-primary');
  });
});