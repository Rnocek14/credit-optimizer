describe('Day 2 Flows (minimal)', () => {
  it('Career Copilot renders', () => {
    cy.visit('/career-copilot');
    cy.contains(/Career Co-?Pilot/i).should('exist');
    cy.contains(/Run Demo Workflow/i).should('exist');
  });

  it('Wallet OpenBadge export button exists', () => {
    cy.visit('/wallet');
    cy.get('[data-testid="export-openbadge"]').first().should('exist');
  });

  it('Institution & Employer hubs load (demo banners optional)', () => {
    cy.visit('/institution');
    cy.contains(/Institution Hub/i).should('exist');
    cy.visit('/employer');
    cy.contains(/Employer Hub/i).should('exist');
  });

  it('Projects section shows in Resume Builder (empty state OK)', () => {
    cy.visit('/resume-builder');
    cy.contains(/Proof Projects/i).should('exist');
  });
});
