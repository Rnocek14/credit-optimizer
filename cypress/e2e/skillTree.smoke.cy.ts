describe('Skill Tree population', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '3c459625-e499-5ddb-b64d-a442dd21f474' }
      }));
    });
  });

  it('renders nodes and edges', () => {
    cy.visit('/progress?tab=skill-tree');
    
    // Wait for the skill tree canvas to be visible
    cy.get('[data-testid="skill-tree-canvas"]', { timeout: 15000 }).should('be.visible');
    
    // Check that at least one skill node renders
    cy.get('[data-testid="skill-node"]', { timeout: 10000 }).its('length').should('be.greaterThan', 0);
    
    // Verify the canvas shows some content (not completely empty)
    cy.get('.react-flow__nodes').should('exist');
    cy.get('.react-flow__edges').should('exist');
  });

  it('shows meaningful empty state when no data', () => {
    // Mock empty response
    cy.intercept('GET', '**/career_graph_nodes**', { fixture: [] });
    
    cy.visit('/progress?tab=skill-tree');
    
    // Should show empty state message
    cy.contains('No skills to display').should('be.visible');
    cy.contains('Check active data in career_graph_nodes').should('be.visible');
    cy.get('button').contains('Reload').should('be.visible');
  });
});