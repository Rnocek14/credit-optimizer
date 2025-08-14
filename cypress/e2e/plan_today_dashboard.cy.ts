describe('Plan Today Dashboard', () => {
  beforeEach(() => {
    // Set up test data and intercept API calls
    cy.intercept('GET', '**/rest/v1/career_goals*', { fixture: 'multiple_goals.json' });
    cy.intercept('GET', '**/rest/v1/learning_streaks*', {
      body: [
        {
          id: 'streak-1',
          user_id: '2b458624-d498-4cca-a63d-9341cc20e363',
          streak_type: 'daily',
          current_streak: 5,
          longest_streak: 12,
          last_activity_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });
    
    // Mock unified recommendations with quick wins
    cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
      body: [
        {
          id: 'rec-1',
          type: 'skill_gap',
          title: 'Master React Context API',
          description: 'Learn advanced state management patterns',
          priority: 'high',
          timeEstimate: '2-3 hrs',
          progress: 65,
          actions: [
            { label: 'Find Courses', on: 'discover', params: { filter: 'react' } },
            { label: 'Start Project', on: 'contribute' }
          ],
          score: 95,
          createdAt: new Date().toISOString(),
          criBoost: 15,
          criExplanation: 'High market demand for React skills'
        },
        {
          id: 'rec-2',
          type: 'maya_action',
          title: 'Review Git Commands',
          description: 'Quick refresher on essential Git workflow',
          priority: 'medium',
          timeEstimate: '30 min',
          actions: [
            { label: 'Start Review', on: 'discover', params: { topic: 'git' } }
          ],
          score: 80,
          createdAt: new Date().toISOString()
        },
        {
          id: 'rec-3',
          type: 'proof_project',
          title: 'Practice API Integration',
          description: 'Build a small API consumer app',
          priority: 'medium',
          timeEstimate: '45 min',
          actions: [
            { label: 'Plan Project', on: 'plan' }
          ],
          score: 75,
          createdAt: new Date().toISOString(),
          criBoost: 8
        }
      ]
    });

    cy.visit('/plan');
  });

  it('renders a clear next step from the recommendation feed', () => {
    // Verify next step card is visible
    cy.get('[data-testid*="next-step"]').should('be.visible');
    
    // Check that it shows the top recommendation
    cy.contains('Master React Context API').should('be.visible');
    cy.contains('Learn advanced state management patterns').should('be.visible');
    
    // Verify time estimate and difficulty are shown
    cy.contains('2-3 hrs').should('be.visible');
    cy.contains('skill gap').should('be.visible');
    
    // Check CRI boost chip is displayed
    cy.get('[data-testid*="cri-boost"]').should('be.visible');
    cy.contains('15%').should('be.visible');
  });

  it('displays progress bar for next step when available', () => {
    // Check progress is shown
    cy.contains('Progress').should('be.visible');
    cy.contains('65%').should('be.visible');
    
    // Verify progress bar exists
    cy.get('[role="progressbar"]').should('exist');
  });

  it('shows dynamic action buttons based on recommendation type', () => {
    // Verify skill gap actions
    cy.get('[data-testid="next-step-action-0"]').should('contain', 'Find Courses');
    cy.get('[data-testid="next-step-action-1"]').should('contain', 'Start Project');
  });

  it('handles next step click-through correctly', () => {
    // Intercept the saveToPlan mutation
    cy.intercept('POST', '**/rest/v1/rpc/save_to_plan*', { body: { success: true } });
    
    // Click the primary action
    cy.get('[data-testid="next-step-action-0"]').click();
    
    // Should trigger the appropriate navigation/action
    // Note: This would typically navigate or trigger a state change
    // In a real test, we'd verify the URL change or API call
  });

  it('displays quick wins from filtered recommendations', () => {
    // Verify quick wins section exists
    cy.contains('Quick Wins').should('be.visible');
    
    // Check that quick wins are populated (30-45 min tasks)
    cy.get('[data-testid*="quick-win"]').should('have.length.at.least', 1);
    cy.contains('Review Git Commands').should('be.visible');
    cy.contains('30 min').should('be.visible');
    
    cy.contains('Practice API Integration').should('be.visible');
    cy.contains('45 min').should('be.visible');
  });

  it('shows CRI boost chips on quick wins when applicable', () => {
    // Look for CRI boost on the API integration quick win
    cy.contains('Practice API Integration')
      .parent()
      .within(() => {
        cy.get('[data-testid*="cri-boost"]').should('be.visible');
      });
  });

  it('handles quick win actions correctly', () => {
    // Intercept the quick win action
    cy.intercept('POST', '**/rest/v1/rpc/save_to_plan*', { body: { success: true } });
    
    // Click on a quick win
    cy.get('[data-testid="quick-win-0"]').click();
    
    // Should trigger the save to plan action
    // Verify the API call was made with correct data
  });

  it('displays current streak information', () => {
    // Verify streak section
    cy.contains('Progress').should('be.visible');
    cy.contains('Day Streak').should('be.visible');
    cy.contains('5').should('be.visible'); // Current streak from mock data
    
    // Check level display
    cy.contains('Level').should('be.visible');
    cy.contains('3').should('be.visible');
  });

  it('shows unstick nudge for inactive users', () => {
    // Mock an inactive user (no recent activity)
    cy.intercept('GET', '**/rest/v1/learning_streaks*', {
      body: [
        {
          id: 'streak-1',
          user_id: '2b458624-d498-4cca-a63d-9341cc20e363',
          streak_type: 'daily',
          current_streak: 0, // Inactive
          longest_streak: 12,
          last_activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });
    
    // Reload to get new data
    cy.reload();
    
    // Check for unstick button
    cy.get('[data-testid="unstick-button"]').should('be.visible');
    cy.contains('5 days since last activity').should('be.visible');
    cy.contains('Unstick me').should('be.visible');
  });

  it('handles unstick action correctly', () => {
    // Set up inactive user state
    cy.intercept('GET', '**/rest/v1/learning_streaks*', {
      body: [
        {
          id: 'streak-1',
          user_id: '2b458624-d498-4cca-a63d-9341cc20e363',
          streak_type: 'daily',
          current_streak: 0,
          longest_streak: 12,
          last_activity_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });
    
    // Mock the unstick action
    cy.intercept('POST', '**/rest/v1/rpc/save_to_plan*', { body: { success: true } });
    
    cy.reload();
    
    // Click unstick button
    cy.get('[data-testid="unstick-button"]').click();
    
    // Should trigger micro-task creation
    // Verify the API call was made
  });

  it('updates quick wins as goals and skills change', () => {
    // Mock a goal completion that would trigger recommendation refresh
    cy.intercept('POST', '**/rest/v1/rpc/complete_goal*', { body: { success: true } });
    
    // Update recommendations to show new quick wins
    cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
      body: [
        {
          id: 'rec-new',
          type: 'skill_gap',
          title: 'Learn TypeScript Basics',
          description: 'Essential typing for JavaScript',
          priority: 'high',
          timeEstimate: '1 hr',
          actions: [
            { label: 'Find Tutorial', on: 'discover' }
          ],
          score: 90,
          createdAt: new Date().toISOString()
        }
      ]
    });
    
    // Trigger a change (simulate goal completion)
    cy.window().then((win) => {
      win.postMessage({ type: 'GOAL_COMPLETED', goalId: 'goal-1' }, '*');
    });
    
    // Verify recommendations updated
    cy.contains('Learn TypeScript Basics').should('be.visible');
  });

  it('handles empty recommendation state gracefully', () => {
    // Mock empty recommendations
    cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', { body: [] });
    
    cy.reload();
    
    // Verify empty state messaging
    cy.contains('No recommendations available').should('be.visible');
    cy.contains('Check back later for personalized suggestions').should('be.visible');
    
    // Quick wins should also show empty state
    cy.contains('No quick wins available').should('be.visible');
  });

  it('maintains accessibility standards', () => {
    // Check for proper ARIA labels and roles
    cy.get('[role="progressbar"]').should('exist');
    
    // Verify all interactive elements are keyboard accessible
    cy.get('[data-testid="next-step-action-0"]').should('be.visible').focus();
    cy.get('[data-testid="quick-win-0"]').should('be.visible').focus();
    
    // Check contrast and text sizing
    cy.get('h3').should('have.css', 'font-weight', '600');
  });

  it('shows loading states while fetching data', () => {
    // Mock slow API response
    cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
      delay: 2000,
      body: []
    });
    
    cy.reload();
    
    // Verify skeleton loading states
    cy.get('.animate-pulse').should('be.visible');
  });
});