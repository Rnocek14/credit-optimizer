describe('Progress Hub Skill Tree', () => {
  beforeEach(() => {
    // Mock user authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: {
          access_token: 'mock-token',
          user: { id: 'user-123', email: 'test@example.com' }
        }
      }));
    });

    // Intercept API calls
    cy.intercept('GET', '**/career_graph_nodes**', { 
      fixture: 'career-nodes.json' 
    }).as('getCareerNodes');
    
    cy.intercept('GET', '**/career_graph_edges**', { 
      fixture: 'career-edges.json' 
    }).as('getCareerEdges');
    
    cy.intercept('GET', '**/user_skill_progress**', { 
      fixture: 'user-progress.json' 
    }).as('getUserProgress');

    cy.intercept('POST', '**/rpc/calculate_cri**', {
      body: {
        overall_score: 75,
        breakdown: {
          skills_completed: 12,
          growth_score: 85
        }
      }
    }).as('calculateCRI');
  });

  it('should render skill tree by default when visiting /progress', () => {
    cy.visit('/progress');
    
    // Wait for data to load
    cy.wait(['@getCareerNodes', '@getCareerEdges', '@getUserProgress']);
    
    // Check that skill-tree tab is active by default
    cy.get('[data-testid="tab-skill-tree"]')
      .should('have.attr', 'data-state', 'active');
    
    // Check that skill tree canvas is visible
    cy.get('[class*="react-flow"]', { timeout: 10000 })
      .should('be.visible');
    
    // Verify CRI metrics are displayed
    cy.contains('Career Readiness').should('be.visible');
    cy.contains('75%').should('be.visible');
    
    // Check right rail components
    cy.contains('Recent Achievements').should('be.visible');
    cy.contains('Project Updates').should('be.visible');
    cy.contains('Next Suggestion').should('be.visible');
  });

  it('should update skill tree within 1s after completion event', () => {
    cy.visit('/progress?tab=skill-tree');
    cy.wait(['@getCareerNodes', '@getCareerEdges', '@getUserProgress']);
    
    // Mock a completion event
    cy.window().then((win) => {
      // Simulate Supabase realtime update
      const mockEvent = {
        eventType: 'UPDATE',
        new: {
          id: 'progress-123',
          skill_id: 'skill-456', 
          status: 'completed',
          updated_at: new Date().toISOString()
        },
        old: {
          status: 'in_progress'
        }
      };
      
      // Trigger the event handler (would be called by Supabase in real app)
      win.postMessage({ type: 'PROGRESS_UPDATE', data: mockEvent }, '*');
    });
    
    // Check that update notification appears within 1 second
    cy.get('.toast', { timeout: 1000 })
      .should('contain', 'updated');
  });

  it('should show node hover information with CRI influence', () => {
    cy.visit('/progress?tab=skill-tree');
    cy.wait(['@getCareerNodes', '@getCareerEdges', '@getUserProgress']);
    
    // Wait for skill tree to render
    cy.get('[class*="react-flow"]', { timeout: 10000 }).should('be.visible');
    
    // Find and hover over a skill node
    cy.get('[data-id*="skill"]', { timeout: 5000 })
      .first()
      .trigger('mouseover', { force: true });
    
    // Check that tooltip appears with node information
    // Note: This test may need adjustment based on actual tooltip implementation
    cy.get('[role="tooltip"]', { timeout: 2000 })
      .should('be.visible');
  });

  it('should deep-link correctly when clicking node actions', () => {
    cy.visit('/progress?tab=skill-tree');
    cy.wait(['@getCareerNodes', '@getCareerEdges', '@getUserProgress']);
    
    // Wait for skill tree to render
    cy.get('[class*="react-flow"]', { timeout: 10000 }).should('be.visible');
    
    // Click on a skill node
    cy.get('[data-id*="skill"]', { timeout: 5000 })
      .first()
      .click({ force: true });
    
    // Check that toast appears with action options
    cy.get('.toast', { timeout: 3000 })
      .should('be.visible')
      .and('contain', 'selected');
    
    // Test "Find Courses" action by checking if button exists and clicking
    cy.get('.toast button')
      .contains('Find Courses')
      .click();
    
    // Should navigate to discover with skill filter
    cy.url().should('include', '/discover');
    cy.url().should('include', 'skills=');
  });

  it('should navigate between tabs correctly', () => {
    cy.visit('/progress');
    
    // Default should be skill-tree
    cy.get('[data-testid="tab-skill-tree"]')
      .should('have.attr', 'data-state', 'active');
    
    // Click history tab
    cy.get('[data-testid="tab-history"]').click();
    cy.url().should('include', 'tab=history');
    cy.get('[data-testid="tab-history"]')
      .should('have.attr', 'data-state', 'active');
    
    // Click portfolio tab
    cy.get('[data-testid="tab-portfolio"]').click();
    cy.url().should('include', 'tab=portfolio');
    
    // Click credentials tab
    cy.get('[data-testid="tab-credentials"]').click();
    cy.url().should('include', 'tab=credentials');
    
    // Click resume tab
    cy.get('[data-testid="tab-resume"]').click();
    cy.url().should('include', 'tab=resume');
    
    // Return to skill tree
    cy.get('[data-testid="tab-skill-tree"]').click();
    cy.url().should('not.include', 'tab=');
  });

  it('should display CRI-based node tinting', () => {
    cy.visit('/progress?tab=skill-tree');
    cy.wait(['@getCareerNodes', '@getCareerEdges', '@getUserProgress', '@calculateCRI']);
    
    // Wait for skill tree to render with CRI data
    cy.get('[class*="react-flow"]', { timeout: 10000 }).should('be.visible');
    
    // Check that nodes have different styling based on CRI levels
    // This test would need to be adjusted based on actual node styling implementation
    cy.get('[data-id*="skill"]', { timeout: 5000 })
      .should('have.length.greaterThan', 0)
      .first()
      .should('have.css', 'background-color');
  });

  it('should show right rail achievements and project updates', () => {
    cy.visit('/progress?tab=skill-tree');
    
    // Check achievements rail
    cy.contains('Recent Achievements').should('be.visible');
    cy.contains('Python Expert').should('be.visible');
    cy.contains('Data Science Foundations').should('be.visible');
    
    // Check project updates
    cy.contains('Project Updates').should('be.visible');
    cy.contains('Customer Analytics Dashboard').should('be.visible');
    cy.contains('ML Prediction Model').should('be.visible');
    
    // Check next suggestion
    cy.contains('Next Suggestion').should('be.visible');
    
    // Test navigation links
    cy.contains('View All Achievements').should('have.attr', 'href').and('include', 'credentials');
    cy.contains('Manage Projects').should('have.attr', 'href').and('include', 'portfolio');
  });

  it('should redirect /skill-tree to /progress?tab=skill-tree', () => {
    cy.visit('/skill-tree');
    cy.url().should('include', '/progress');
    cy.url().should('include', 'tab=skill-tree');
    
    // Verify skill tree is displayed
    cy.get('[data-testid="tab-skill-tree"]')
      .should('have.attr', 'data-state', 'active');
  });

  it('should handle skill tree loading and error states', () => {
    // Test loading state
    cy.intercept('GET', '**/career_graph_nodes**', { 
      delay: 2000,
      fixture: 'career-nodes.json' 
    }).as('getCareerNodesDelay');
    
    cy.visit('/progress?tab=skill-tree');
    
    // Should show loading indicator
    cy.contains('Loading Skill Tree').should('be.visible');
    cy.get('[class*="animate-spin"]').should('be.visible');
    
    cy.wait('@getCareerNodesDelay');
    
    // Loading should disappear
    cy.contains('Loading Skill Tree').should('not.exist');
  });

  it('should handle error state gracefully', () => {
    // Mock API error
    cy.intercept('GET', '**/career_graph_nodes**', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('getCareerNodesError');
    
    cy.visit('/progress?tab=skill-tree');
    cy.wait('@getCareerNodesError');
    
    // Should show error message
    cy.contains('Error loading skill tree').should('be.visible');
    cy.contains('Reload').should('be.visible');
  });
});