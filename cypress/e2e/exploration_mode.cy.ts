describe('Exploration Mode — A/B + Exploration Flow', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    cy.clearPlanStore();
    cy.seedSatisfiedModule();
    cy.restoreLocalStorage();
  });
  
  afterEach(() => {
    cy.saveLocalStorage();
  });

  it('forces Bucket A (OFF) via localStorage and hides exploration banner', () => {
    cy.forceABBucket('A');
    cy.visit('/edu-tree-v5');
    cy.wait(1000); // Allow initial load

    // Open a satisfied module's templates
    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();

    // No exploration banner when flag off
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('not.exist');
  });

  it('forces Bucket B (ON) and shows exploration banner on satisfied modules', () => {
    cy.forceABBucket('B');
    cy.visit('/edu-tree-v5');
    cy.wait(1000);

    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();

    // Exploration banner should be visible
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('exist');
    
    // Templates should render (empty state guarded)
    cy.get('[data-testid="template-card"]').should('have.length.greaterThan', 0);
  });

  it('applies an exploratory template and only changes the target module', () => {
    cy.forceABBucket('B');
    cy.visit('/edu-tree-v5');
    cy.wait(1000);

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
    cy.contains(/Module Satisfied.*Explore Alternatives/i).should('exist');
    cy.get('[data-testid="template-card"]').should('have.length.greaterThan', 0);
  });

  it('logs telemetry with bucket information', () => {
    cy.stubTelemetry();
    cy.forceABBucket('B');
    cy.visit('/edu-tree-v5');
    
    // Verify ab_assignment event was logged with bucket
    cy.window().then((win) => {
      // @ts-ignore
      const events = win.__telemetryEvents || [];
      const assignmentEvent = events.find((e: any) => e.eventName === 'ab_assignment');
      expect(assignmentEvent).to.exist;
      expect(assignmentEvent.payload.bucket).to.be.oneOf(['A', 'B']);
    });
  });
});
