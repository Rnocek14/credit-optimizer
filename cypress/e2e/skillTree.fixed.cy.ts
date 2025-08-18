describe('Skill Tree Fixed Rendering', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '3c459625-e499-5ddb-b64d-a442dd21f474' }
      }));
    });
  });

  it('renders skill nodes after fixes', () => {
    cy.visit('/progress?tab=skill-tree');
    
    // Wait for the skill tree canvas to be visible
    cy.get('[data-testid="skill-tree-canvas"]', { timeout: 15000 }).should('be.visible');
    
    // Check that skill nodes render (either real data or canary)
    cy.get('[data-testid="skill-node"]', { timeout: 10000 }).should('have.length.greaterThan', 0);
    
    // Verify React Flow elements exist
    cy.get('.react-flow__nodes').should('exist');
    cy.get('.react-flow__edges').should('exist');
    
    // Print found node IDs for debugging
    cy.get('[data-testid="skill-node"]').then(($nodes) => {
      const nodeIds = Array.from($nodes).map(node => 
        node.getAttribute('data-node-id')
      );
      cy.log('Found skill nodes:', nodeIds);
    });
  });

  it('shows canary node when no data', () => {
    // Mock empty response
    cy.intercept('GET', '**/career_graph_nodes**', { body: [] });
    
    cy.visit('/progress?tab=skill-tree');
    
    // Should show canary node when no real data
    cy.get('[data-testid="skill-node"]', { timeout: 10000 })
      .should('have.length', 1)
      .should('contain', 'Canary Node');
  });

  it('has proper canvas dimensions', () => {
    cy.visit('/progress?tab=skill-tree');
    
    // Verify canvas has minimum height
    cy.get('[data-testid="skill-tree-canvas"]')
      .should('have.css', 'min-height')
      .and('match', /\d+px/);
  });
});