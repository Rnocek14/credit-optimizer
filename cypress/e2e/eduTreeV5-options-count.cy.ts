/**
 * E2E test for EduTree V5 options count edge cases
 * Validates hydration, filtering, and display states
 */

describe('EduTree V5: Options Count & Filters', () => {
  beforeEach(() => {
    // Use fixtures mode for consistent test data
    cy.visit('/edu-tree-v5?debug=1');
  });

  it('displays correct options count on initial load', () => {
    // Wait for first module card to render
    cy.get('[data-module-card]').first().should('be.visible');
    
    // Should show non-zero options count
    cy.get('[data-module-card]').first()
      .find('[data-interactive="true"]')
      .contains(/\d+ options? available/i)
      .should('be.visible');
    
    // Should NOT show "0 options" or empty state
    cy.get('[data-module-card]').first()
      .contains(/0 options|No marketplace options/i)
      .should('not.exist');
  });

  it('handles deep-link hydration correctly', () => {
    // Deep link directly to a specific module
    cy.visit('/edu-tree-v5?debug=1&scope=module&node=y1-fall-gened-humanities&tab=templates');
    
    // Wait for decision dock/drawer to open
    cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
    
    // Should display options, not "0 options"
    cy.get('[role="dialog"]')
      .contains(/\d+ options? available/i, { timeout: 5000 })
      .should('be.visible');
  });

  it('shows loading state during hydration', () => {
    // Slow network simulation
    cy.intercept('GET', '**/marketplace_options*', (req) => {
      req.reply((res) => {
        res.delay = 2000;
      });
    }).as('getOptions');

    cy.visit('/edu-tree-v5');
    
    // Expand a module before options load
    cy.get('[data-module-card]').first().within(() => {
      cy.get('button[aria-label*="Expand"]').click();
      
      // Should show loading state (may be very brief)
      // Only check if it's not already loaded
      cy.get('body').then(($body) => {
        if (!$body.text().includes('options available')) {
          cy.contains(/Loading options/i).should('be.visible');
        }
      });
    });
  });

  it('never shows "0 options" when data is present', () => {
    // Load page and check all visible modules
    cy.get('[data-module-card]').should('have.length.greaterThan', 0);
    
    cy.get('[data-module-card]').each(($card, index) => {
      // Only check first 5 to avoid timeout
      if (index < 5) {
        // Expand module
        cy.wrap($card).find('button[aria-label*="Expand"]').click();
        
        // If options exist, count should never be 0
        cy.wrap($card).then(($el) => {
          const text = $el.text();
          const hasOptions = text.includes('options available') || text.includes('option available');
          if (hasOptions) {
            // Verify it's not showing "0 options"
            expect(text).not.to.match(/\b0 options?\b/i);
          }
        });
        
        // Collapse for next iteration
        cy.wrap($card).find('button[aria-label*="Collapse"]').click();
      }
    });
  });

  it('maintains correct count after page refresh', () => {
    // Record initial count
    let initialCount: string;
    
    cy.get('[data-module-card]').first()
      .find('[data-interactive="true"]')
      .invoke('text')
      .then((text) => {
        initialCount = text.trim();
        
        // Refresh page
        cy.reload();
        
        // Verify count is same after hydration
        cy.get('[data-module-card]').first()
          .find('[data-interactive="true"]')
          .should('contain.text', initialCount);
      });
  });

  it('uses singular "option" for count of 1', () => {
    // Find any module with exactly 1 option
    cy.get('[data-module-card]').each(($card) => {
      const text = $card.text();
      if (text.includes('1 option available')) {
        // Verify it says "option" not "options"
        cy.wrap($card).contains(/1 option available/i).should('be.visible');
        cy.wrap($card).contains(/1 options available/i).should('not.exist');
        return false; // Break loop
      }
    });
  });

  it('uses plural "options" for count greater than 1', () => {
    // Find any module with >1 options
    cy.get('[data-module-card]').first().within(() => {
      cy.get('[data-interactive="true"]').invoke('text').then((text) => {
        const match = text.match(/(\d+)\s+options?\s+available/i);
        if (match) {
          const count = parseInt(match[1]);
          if (count > 1) {
            // Should use plural form
            cy.contains(/options available/i).should('be.visible');
          } else if (count === 1) {
            // Should use singular form
            cy.contains(/option available/i).should('be.visible');
          }
        }
      });
    });
  });
});
