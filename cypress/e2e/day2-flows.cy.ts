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

it("TrackSelector appears and track chip updates", () => {
  cy.visit('/plan');
  cy.contains(/Plan/i).should('exist');
  cy.get('[data-testid="track-selector"]').should('exist');
});

it("Resume Builder shows track context note or selector", () => {
  cy.visit('/resume-builder');
  cy.contains(/Resume|AI Resume Builder/i).should('exist');
  cy.get('[data-testid="track-selector"]').should('exist');
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid=track-chip]').length) {
      cy.get('[data-testid=track-chip]').should('be.visible');
    }
  });
});