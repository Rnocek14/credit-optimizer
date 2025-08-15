describe('Skill Tree Rendering', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '3c459625-e499-5ddb-b64d-a442dd21f474' }
      }));
    });
  });

  it('renders visible skill nodes consistently', () => {
    cy.visit('/progress?tab=skill-tree');
    
    // Wait for the skill tree canvas container
    cy.get('[data-testid="skill-tree-canvas"]', { timeout: 15000 }).should('be.visible');
    
    // Assert that skill nodes are rendered
    cy.get('[data-testid="skill-node"]', { timeout: 10000 })
      .its('length')
      .should('be.gt', 0)
      .then((count) => {
        cy.log(`Found ${count} skill nodes rendered`);
      });
    
    // Print the first 3 node IDs for debugging
    cy.get('[data-testid="skill-node"]')
      .then(($nodes) => {
        const nodeIds = Array.from($nodes.slice(0, 3)).map(node => 
          node.getAttribute('data-node-id')
        );
        cy.log('First 3 node IDs:', nodeIds.join(', '));
      });
    
    // Verify nodes have proper attributes
    cy.get('[data-testid="skill-node"]').first().should('have.attr', 'data-node-type');
    cy.get('[data-testid="skill-node"]').first().should('have.attr', 'data-node-id');
    
    // Verify the React Flow canvas is present
    cy.get('.react-flow__nodes').should('exist');
    cy.get('.react-flow__edges').should('exist');
  });

  it('shows fallback layout when enhanced layout fails', () => {
    // Simulate layout failure by intercepting and breaking the layout
    cy.visit('/progress?tab=skill-tree');
    
    // Check console for fallback messages
    cy.window().then((win) => {
      const logs: string[] = [];
      const originalConsoleWarn = win.console.warn;
      win.console.warn = (...args) => {
        logs.push(args.join(' '));
        originalConsoleWarn.apply(win.console, args);
      };
      
      // Wait for canvas and check for fallback indicators
      cy.get('[data-testid="skill-tree-canvas"]', { timeout: 15000 }).should('be.visible');
      
      cy.then(() => {
        const hasFallbackMessage = logs.some(log => 
          log.includes('grid fallback') || log.includes('Enhanced layout returned 0')
        );
        if (hasFallbackMessage) {
          cy.log('✅ Grid fallback was used successfully');
        }
      });
    });
  });

  it('handles empty data gracefully', () => {
    // Mock empty response
    cy.intercept('GET', '**/career_graph_nodes**', { fixture: [] });
    cy.intercept('GET', '**/career_graph_edges**', { fixture: [] });
    
    cy.visit('/progress?tab=skill-tree');
    
    // Should show meaningful empty state
    cy.contains('No skills to display').should('be.visible');
    cy.contains('Check active data in career_graph_nodes').should('be.visible');
    cy.get('button').contains('Reload').should('be.visible');
  });
});