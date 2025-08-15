// PR-8: Cypress E2E Tests for Skill Tree Filters

describe('Skill Tree Filters', () => {
  beforeEach(() => {
    // Mock authentication
    window.localStorage.setItem('sb-vzpissitddpunkpythsb-auth-token', JSON.stringify({
      access_token: 'mock-token',
      user: { id: 'test-user', email: 'test@example.com' }
    }));

    // Visit the progress page where skill tree is displayed
    cy.visit('/progress?tab=skill-tree');
    
    // Wait for the skill tree to load
    cy.get('[data-testid="skill-tree-canvas"]', { timeout: 10000 }).should('be.visible');
  });

  describe('Filter Functionality', () => {
    it('should show all filters and initial state', () => {
      // Check that filter controls are present
      cy.get('[data-testid="verified-only-filter"]').should('be.visible');
      cy.get('[data-testid="track-filter"]').should('be.visible');
      cy.get('[data-testid="goal-path-filter"]').should('be.visible');
      
      // Initially, no filters should be active
      cy.get('[data-testid="filter-summary"]').should('not.exist');
    });

    it('should filter to verified skills only', () => {
      // Get initial node count
      cy.get('[data-testid="skill-tree-stats"]').invoke('text').then((initialStats) => {
        const initialCount = parseInt(initialStats.match(/(\d+)/)?.[1] || '0');
        
        // Apply verified only filter
        cy.get('[data-testid="verified-only-filter"]').click();
        
        // Check that filter is active
        cy.get('[data-testid="verified-only-filter"]').should('have.class', 'bg-primary');
        
        // Check that node count changed
        cy.get('[data-testid="skill-tree-stats"]').invoke('text').then((filteredStats) => {
          const filteredCount = parseInt(filteredStats.match(/(\d+)/)?.[1] || '0');
          expect(filteredCount).to.be.lessThan(initialCount);
        });
        
        // Check that filter summary is shown
        cy.get('[data-testid="filter-summary"]').should('contain', 'Verified skills only');
      });
    });

    it('should filter by track selection', () => {
      // Open track dropdown
      cy.get('[data-testid="track-filter"]').click();
      
      // Select a track
      cy.get('[data-testid="track-option-frontend"]').click();
      
      // Check that track badge appears
      cy.get('[data-testid="selected-track-badge"]').should('contain', 'Frontend');
      
      // Check that filter summary shows track info
      cy.get('[data-testid="filter-summary"]').should('contain', 'Track: Frontend');
    });

    it('should toggle goal path only mode', () => {
      // Click goal path filter
      cy.get('[data-testid="goal-path-filter"]').click();
      
      // Check that filter is active
      cy.get('[data-testid="goal-path-filter"]').should('have.class', 'bg-primary');
      
      // Check that filter summary shows goal path
      cy.get('[data-testid="filter-summary"]').should('contain', 'Goal path focused');
    });

    it('should combine multiple filters', () => {
      // Apply verified only filter
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Apply goal path filter
      cy.get('[data-testid="goal-path-filter"]').click();
      
      // Check that both filters are shown in summary
      cy.get('[data-testid="filter-summary"]')
        .should('contain', 'Verified skills only')
        .and('contain', 'Goal path focused');
    });

    it('should clear all filters', () => {
      // Apply multiple filters
      cy.get('[data-testid="verified-only-filter"]').click();
      cy.get('[data-testid="goal-path-filter"]').click();
      
      // Clear all filters
      cy.get('[data-testid="clear-filters"]').click();
      
      // Check that filters are cleared
      cy.get('[data-testid="verified-only-filter"]').should('not.have.class', 'bg-primary');
      cy.get('[data-testid="goal-path-filter"]').should('not.have.class', 'bg-primary');
      cy.get('[data-testid="filter-summary"]').should('not.exist');
    });
  });

  describe('Filter Performance', () => {
    it('should apply filters quickly (<150ms)', () => {
      const startTime = Date.now();
      
      // Apply verified only filter
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Check that nodes update quickly
      cy.get('[data-testid="skill-tree-canvas"]').should('be.visible').then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        expect(duration).to.be.lessThan(150);
      });
    });

    it('should maintain smooth performance during filter changes', () => {
      // Rapidly toggle filters
      cy.get('[data-testid="verified-only-filter"]').click();
      cy.wait(50);
      cy.get('[data-testid="goal-path-filter"]').click();
      cy.wait(50);
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Check that tree remains responsive
      cy.get('[data-testid="skill-tree-canvas"]').should('be.visible');
      cy.get('body').should('not.have.class', 'loading');
    });
  });

  describe('Node Count Validation', () => {
    it('should accurately count filtered nodes', () => {
      // Apply verified only filter
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Get displayed count from filter summary
      cy.get('[data-testid="filter-summary"]').invoke('text').then((summaryText) => {
        const displayedMatch = summaryText.match(/Showing (\d+) of (\d+)/);
        if (displayedMatch) {
          const [, filteredCount, totalCount] = displayedMatch;
          
          // Count actual visible nodes in the tree
          cy.get('[data-testid="skill-node"]').then(($nodes) => {
            expect($nodes.length.toString()).to.equal(filteredCount);
          });
        }
      });
    });

    it('should show correct node colors for track filtering', () => {
      // Open track dropdown and select frontend
      cy.get('[data-testid="track-filter"]').click();
      cy.get('[data-testid="track-option-frontend"]').click();
      
      // Check that visible nodes have correct track styling
      cy.get('[data-testid="skill-node"]').each(($node) => {
        cy.wrap($node).should('have.attr', 'data-track', 'frontend');
      });
    });
  });

  describe('URL State Persistence', () => {
    it('should persist filter state in URL', () => {
      // Apply filters
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Check URL contains filter parameters
      cy.url().should('include', 'verifiedOnly=true');
      
      // Reload page
      cy.reload();
      
      // Check that filter state is restored
      cy.get('[data-testid="verified-only-filter"]').should('have.class', 'bg-primary');
    });

    it('should support deep linking with filters', () => {
      // Navigate directly to filtered view
      cy.visit('/progress?tab=skill-tree&verifiedOnly=true&goalPath=true');
      
      // Check that filters are applied
      cy.get('[data-testid="verified-only-filter"]').should('have.class', 'bg-primary');
      cy.get('[data-testid="goal-path-filter"]').should('have.class', 'bg-primary');
    });
  });

  describe('Accessibility', () => {
    it('should announce filter changes to screen readers', () => {
      // Apply filter
      cy.get('[data-testid="verified-only-filter"]').click();
      
      // Check for aria-live region update
      cy.get('[aria-live="polite"]').should('contain', 'Filter applied');
    });

    it('should support keyboard navigation', () => {
      // Tab to first filter
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'verified-only-filter');
      
      // Use Enter to activate filter
      cy.focused().type('{enter}');
      cy.get('[data-testid="verified-only-filter"]').should('have.class', 'bg-primary');
    });
  });
});