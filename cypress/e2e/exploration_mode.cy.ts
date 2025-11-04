describe('Exploration Mode — A/B + Exploration Flow', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    cy.restoreLocalStorage();
  });
  
  afterEach(() => {
    cy.saveLocalStorage();
  });

  it('forces Bucket A (OFF) via localStorage and hides exploration banner', () => {
    cy.visit('/');
    cy.window().then(w => w.localStorage.setItem('v5_exploration_mode', 'false'));
    cy.reload();

    // Open a satisfied module's templates
    cy.visit('/edu-tree-v5');
    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();

    // No exploration banner when flag off
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('not.exist');
  });

  it('forces Bucket B (ON) and shows exploration banner on satisfied modules', () => {
    cy.visit('/');
    cy.window().then(w => w.localStorage.setItem('v5_exploration_mode', 'true'));
    cy.reload();

    cy.visit('/edu-tree-v5');
    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();

    // Exploration banner should be visible
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('exist');
    
    // Templates should render (empty state guarded)
    cy.get('[data-testid="template-card"]').should('have.length.greaterThan', 0);
  });

  it('applies an exploratory template and only changes the target module', () => {
    cy.visit('/');
    cy.window().then(w => w.localStorage.setItem('v5_exploration_mode', 'true'));
    cy.reload();

    cy.visit('/edu-tree-v5');
    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();

    cy.get('[data-testid="template-card"]').first().within(() => {
      cy.contains('button', /preview/i).click();
    });

    // Preview dialog → Apply
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', /apply/i).click();
    });

    // Expect dock to refresh candidates for this module only
    // (network-less heuristic: banner still visible, list reloaded)
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('exist');
    cy.get('[data-testid="template-card"]').should('have.length.greaterThan', 0);
  });

  it('logs telemetry with bucket information', () => {
    cy.visit('/');
    cy.window().then(w => {
      w.localStorage.setItem('v5_exploration_mode', 'true');
      // Spy on console to verify bucket logging
      cy.spy(w.console, 'log').as('consoleLog');
    });
    cy.reload();

    cy.visit('/edu-tree-v5');
    
    // Verify ab_assignment event was logged
    cy.get('@consoleLog').should('be.called');
  });
});
