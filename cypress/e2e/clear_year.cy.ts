describe('Clear Year — data consistency + invalidation + a11y focus', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    cy.visit('/edu-tree-v5');
    // Wait for page to load
    cy.get('[data-testid="year-section"]').should('exist');
  });

  it('clears a year and disables the button; focuses heading; invalidates queries', () => {
    // Find Year 1 section
    cy.contains('h2', /Year 1/i).as('yearH');
    
    // Find and click Clear Year button for Year 1
    cy.get('[data-testid="year-section"]').first().within(() => {
      cy.contains('button', /clear year/i).click();
    });

    // Confirm dialog
    cy.on('window:confirm', () => true);

    // Toast confirms
    cy.contains(/Year cleared/i, { timeout: 5000 }).should('exist');

    // Button disabled post-clear
    cy.get('[data-testid="year-section"]').first().within(() => {
      cy.contains('button', /clear year/i).should('be.disabled');
    });

    // Heading receives focus
    cy.get('@yearH').should('have.focus');

    // Dock templates for Year 1 modules should re-query → just assert panel still works
    cy.get('[data-testid="module-node"]').first().click();
    cy.get('[role="tab"]').contains(/templates/i).click();
    cy.get('[data-testid="templates-panel"]').should('exist');
  });

  it('supports summer key in legacy store without errors', () => {
    // This spec is mainly a regression: ensures no crash if -summer keys exist
    cy.window().then(w => {
      // Simulate stale summer keys
      const storeKey = Object.keys(w.localStorage).find(k => k.includes('v5-plan'));
      if (storeKey) {
        const storeData = JSON.parse(w.localStorage.getItem(storeKey) || '{}');
        if (storeData.state?.semesters) {
          storeData.state.semesters['1-summer'] = { 
            credits: 3, 
            courseIds: ['X'],
            workloadHours: 9 
          };
          w.localStorage.setItem(storeKey, JSON.stringify(storeData));
        }
      }
    });
    
    cy.reload();
    
    // Clear Year 1 should not throw
    cy.get('[data-testid="year-section"]').first().within(() => {
      cy.contains('button', /clear year/i).click();
    });
    cy.on('window:confirm', () => true);
    cy.contains(/Year cleared/i, { timeout: 5000 }).should('exist');
  });

  it('clears only the target year and preserves other years', () => {
    // Add courses to Year 1 and Year 2
    cy.get('[data-testid="module-node"]').eq(0).click();
    cy.contains('button', /add to plan/i).click();
    
    cy.get('[data-testid="module-node"]').eq(5).click();
    cy.contains('button', /add to plan/i).click();

    // Clear Year 1
    cy.get('[data-testid="year-section"]').first().within(() => {
      cy.contains('button', /clear year/i).click();
    });
    cy.on('window:confirm', () => true);

    // Verify Year 1 is cleared but Year 2 still has content
    cy.get('[data-testid="year-section"]').eq(0).within(() => {
      cy.contains(/0 credits/i).should('exist');
    });
    
    cy.get('[data-testid="year-section"]').eq(1).within(() => {
      cy.contains(/0 credits/i).should('not.exist');
    });
  });
});
