/// <reference types="cypress" />

describe('Plan Today Dashboard', () => {
  beforeEach(() => {
    // Mock Supabase authentication
    cy.intercept('GET', '**/auth/v1/user', { 
      body: { 
        user: { 
          id: 'test-user-id', 
          email: 'test@example.com',
          created_at: new Date().toISOString()
        } 
      } 
    }).as('auth');

    // Mock real Supabase API endpoints
    cy.intercept('GET', '**/rest/v1/career_goals*', { fixture: 'career-goals.json' }).as('getCareerGoals');
    cy.intercept('GET', '**/rest/v1/learning_streaks*', { 
      body: { 
        currentStreak: 5, 
        level: 'Consistent Learner',
        lastActivity: new Date().toISOString() 
      } 
    }).as('getLearningStreaks');
    
    // Mock unified recommendations from real hook
    cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
      body: {
        recommendations: [
          {
            id: 'next-step-rec',
            title: 'Advanced React Hooks',
            type: 'course',
            timeEstimate: '2 hours',
            description: 'Master advanced React patterns with hooks',
            criBoost: 12.5,
            criExplanation: 'Addresses React skill gap for Senior role',
            actionUrl: '/course/advanced-react-hooks',
            progress: 0.3
          },
          {
            id: 'quick-win-1',
            title: 'CSS Grid Layout',
            type: 'skill',
            timeEstimate: '45 minutes',
            description: 'Quick CSS Grid tutorial',
            criBoost: 5.2,
            criExplanation: 'Improves frontend design skills'
          },
          {
            id: 'quick-win-2',
            title: 'Git Workflow Best Practices',
            type: 'project',
            timeEstimate: '30 minutes',
            description: 'Learn proper Git branching strategies',
            criBoost: 0, // Should not show CRI chip
          },
          {
            id: 'quick-win-3',
            title: 'API Testing with Postman',
            type: 'skill',
            timeEstimate: '1 hour',
            description: 'Learn API testing fundamentals',
            criBoost: 8.1,
            criExplanation: 'Essential for backend development'
          },
          {
            id: 'too-long',
            title: 'Full Stack Bootcamp',
            type: 'course',
            timeEstimate: '12 weeks',
            description: 'Comprehensive full stack course',
            criBoost: 25.0,
            criExplanation: 'Major career advancement'
          }
        ]
      }
    }).as('getRecommendations');

    cy.intercept('POST', '**/rest/v1/saved_plan_items*', {
      statusCode: 201,
      body: { id: 'new-plan-item', success: true }
    }).as('saveToPlan');
    
    // Navigate to plan route
    cy.visit('/plan');
  });

  describe('Next Step Recommendation', () => {
    it('should display the top recommendation as Next Step', () => {
      cy.wait('@getRecommendations');
      
      // Verify Next Step card is rendered
      cy.get('[data-testid="next-step-card"]').should('be.visible');
      cy.get('[data-testid="next-step-card"]').within(() => {
        cy.contains('Advanced React Hooks').should('be.visible');
        cy.contains('Master advanced React patterns').should('be.visible');
        cy.contains('2 hours').should('be.visible');
      });
    });

    it('should show progress bar when progress data exists', () => {
      cy.wait('@getRecommendations');
      
      cy.get('[data-testid="next-step-card"]').within(() => {
        cy.get('[role="progressbar"]').should('exist');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '30');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuemin', '0');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuemax', '100');
      });
    });

    it('should display CRI boost chip with tooltip', () => {
      cy.wait('@getRecommendations');
      
      cy.get('[data-testid="next-step-card"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', 'CRI +12.5%');
        
        // Test tooltip
        cy.get('[data-testid="cri-boost-chip"]').trigger('mouseover');
      });
      
      cy.get('[role="tooltip"]').should('be.visible');
      cy.get('[role="tooltip"]').should('contain', 'CRI Boost Applied');
      cy.get('[role="tooltip"]').should('contain', 'Addresses React skill gap');
      cy.get('[role="tooltip"]').should('contain', 'raises your Career Readiness Index');
    });

    it('should handle click-through action', () => {
      cy.wait('@getRecommendations');
      
      cy.get('[data-testid="next-step-card"]').within(() => {
        cy.get('[data-testid="next-step-action-0"]').should('be.visible');
        cy.get('[data-testid="next-step-action-0"]').should('contain', 'Start Learning');
        cy.get('[data-testid="next-step-action-0"]').click();
      });
      
      // Verify save to plan API call
      cy.wait('@saveToPlan').then((interception) => {
        expect(interception.request.body).to.include({
          type: 'quick_win',
          id: 'next-step-rec',
          title: 'Advanced React Hooks'
        });
        expect(interception.request.body.metadata).to.include({
          source: 'today_dashboard'
        });
      });
      
      // Verify success toast
      cy.get('.toast').should('contain', 'Added to your plan');
    });
  });

  describe('Quick Wins Section', () => {
    it('should display exactly 3 quick wins within 30-60 minute range', () => {
      cy.wait('@getRecommendations');
      
      // Should show quick wins section
      cy.get('[data-testid="quick-wins-section"]').should('be.visible');
      cy.get('[data-testid="quick-wins-section"]').within(() => {
        cy.contains('Quick Wins').should('be.visible');
      });
      
      // Should show exactly 3 items (45min, 30min, 1hour)
      cy.get('[data-testid^="quick-win-"]').should('have.length', 3);
      
      // Verify the correct items are shown (in time range)
      cy.get('[data-testid="quick-win-0"]').should('contain', 'CSS Grid Layout'); // 45min
      cy.get('[data-testid="quick-win-1"]').should('contain', 'Git Workflow Best Practices'); // 30min  
      cy.get('[data-testid="quick-win-2"]').should('contain', 'API Testing with Postman'); // 1hour
      
      // Should NOT show the next step item (2 hours) or too long items (12 weeks)
      cy.get('[data-testid="quick-wins-section"]').should('not.contain', 'Advanced React Hooks');
      cy.get('[data-testid="quick-wins-section"]').should('not.contain', 'Full Stack Bootcamp');
    });

    it('should show CRI boost chips only when criBoost > 0', () => {
      cy.wait('@getRecommendations');
      
      // First item has CRI boost
      cy.get('[data-testid="quick-win-0"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', 'CRI +5.2%');
      });
      
      // Second item has no CRI boost (criBoost: 0)
      cy.get('[data-testid="quick-win-1"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('not.exist');
      });
      
      // Third item has CRI boost
      cy.get('[data-testid="quick-win-2"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', 'CRI +8.1%');
      });
    });

    it('should handle quick win start action', () => {
      cy.wait('@getRecommendations');
      
      cy.get('[data-testid="quick-win-0"]').within(() => {
        cy.get('button').contains('Start').should('be.visible');
        cy.get('button').contains('Start').click();
      });
      
      // Verify save to plan with correct data
      cy.wait('@saveToPlan').then((interception) => {
        expect(interception.request.body).to.include({
          type: 'quick_win',
          id: 'quick-win-1',
          title: 'CSS Grid Layout'
        });
        expect(interception.request.body.metadata).to.include({
          source: 'today_dashboard_quick_win'
        });
      });
      
      cy.get('.toast').should('contain', 'Quick win started!');
    });
  });

  describe('Learning Streak and User Engagement', () => {
    it('should display current streak information', () => {
      cy.wait('@getLearningStreaks');
      
      cy.get('[data-testid="learning-streak"]').should('be.visible');
      cy.get('[data-testid="learning-streak"]').within(() => {
        cy.contains('5 day streak').should('be.visible');
        cy.contains('Consistent Learner').should('be.visible');
        cy.get('[data-testid="streak-icon"]').should('be.visible');
      });
    });

    it('should show unstick nudge for inactive users', () => {
      // Mock inactive user state
      cy.intercept('GET', '**/learning-streaks**', {
        body: {
          currentStreak: 0,
          level: 'Getting Started',
          lastActivity: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
          daysInactive: 4
        }
      }).as('getInactiveStreaks');
      
      cy.reload();
      cy.wait('@getInactiveStreaks');
      
      // Verify unstick prompt appears
      cy.get('[data-testid="unstick-prompt"]').should('be.visible');
      cy.get('[data-testid="unstick-prompt"]').within(() => {
        cy.contains('Been away for a while?').should('be.visible');
        cy.contains('4 days since your last activity').should('be.visible');
        cy.get('[data-testid="unstick-button"]').should('be.visible');
        cy.get('[data-testid="unstick-button"]').should('contain', 'Get me unstuck');
      });
    });

    it('should handle unstick action', () => {
      // Set up inactive user scenario
      cy.intercept('GET', '**/learning-streaks**', {
        body: {
          currentStreak: 0,
          daysInactive: 3,
          lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      }).as('getInactiveStreaks');
      
      cy.reload();
      cy.wait('@getInactiveStreaks');
      
      cy.get('[data-testid="unstick-button"]').click();
      
      // Verify unstick micro-task creation
      cy.wait('@saveToPlan').then((interception) => {
        expect(interception.request.body).to.include({
          type: 'micro_task',
          title: 'Get Back on Track'
        });
        expect(interception.request.body.metadata).to.deep.include({
          source: 'today_dashboard',
          days_inactive: 3,
          unstick_action: true
        });
      });
      
      cy.get('.toast').should('contain', 'Welcome back! Let\'s get you unstuck');
    });
  });

  describe('Dynamic Updates and Empty States', () => {
    it('should update quick wins when goals change', () => {
      cy.wait('@getRecommendations');
      
      // Initial state
      cy.get('[data-testid^="quick-win-"]').should('have.length', 3);
      
    // Mock updated recommendations
      cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
        body: {
          recommendations: [
            {
              id: 'new-rec',
              title: 'New 45-minute Course',
              type: 'course',
              timeEstimate: '45 minutes',
              criBoost: 10.0
            }
          ]
        }
      }).as('getUpdatedRecommendations');
      
      // Trigger refresh (could be from completing a goal)
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('recommendations-updated'));
      });
      
      cy.wait('@getUpdatedRecommendations');
      
      // Verify updated content
      cy.get('[data-testid="quick-win-0"]').should('contain', 'New 45-minute Course');
    });

    it('should handle empty recommendations gracefully', () => {
      cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
        body: { recommendations: [] }
      }).as('getEmptyRecommendations');
      
      cy.reload();
      cy.wait('@getEmptyRecommendations');
      
      // Verify empty state
      cy.get('[data-testid="empty-recommendations"]').should('be.visible');
      cy.get('[data-testid="empty-recommendations"]').within(() => {
        cy.contains('No recommendations available').should('be.visible');
        cy.contains('Check back later for personalized suggestions').should('be.visible');
      });
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should show fallback when unified dashboard is disabled', () => {
      // Disable unified dashboard feature flag
      cy.window().then((win) => {
        win.localStorage.setItem('featureFlags', JSON.stringify({
          unifiedTodayDashboard: false
        }));
      });
      
      cy.reload();
      
      // Should show fallback card instead of new dashboard
      cy.get('[data-testid="today-dashboard-fallback"]').should('be.visible');
      cy.get('[data-testid="today-dashboard-fallback"]').within(() => {
        cy.contains('Today\'s recommendations are being prepared').should('be.visible');
        cy.contains('Check back soon for personalized suggestions').should('be.visible');
      });
      
      // Should NOT show new dashboard components
      cy.get('[data-testid="next-step-card"]').should('not.exist');
      cy.get('[data-testid="quick-wins-section"]').should('not.exist');
    });

    it('should enable dashboard with query parameter', () => {
      // Start with disabled flag
      cy.window().then((win) => {
        win.localStorage.setItem('featureFlags', JSON.stringify({
          unifiedTodayDashboard: false
        }));
      });
      
      // Visit with enableToday query param
      cy.visit('/plan?enableToday=1');
      cy.wait('@getRecommendations');
      
      // Should show new dashboard despite disabled flag
      cy.get('[data-testid="next-step-card"]').should('be.visible');
      cy.get('[data-testid="quick-wins-section"]').should('be.visible');
      cy.get('[data-testid="today-dashboard-fallback"]').should('not.exist');
    });
  });

  describe('Loading States and Performance', () => {
    it('should show skeleton loaders while data is loading', () => {
      // Intercept with delay to test loading state
      cy.intercept('GET', '**/rest/v1/rpc/get_unified_recommendations*', {
        delay: 2000,
        body: { recommendations: [] }
      }).as('getSlowRecommendations');
      
      cy.visit('/plan');
      
      // Verify skeleton loaders are shown
      cy.get('[data-testid="next-step-skeleton"]').should('be.visible');
      cy.get('[data-testid="quick-wins-skeleton"]').should('be.visible');
      
      cy.wait('@getSlowRecommendations');
      
      // Verify skeletons are replaced with content or empty state
      cy.get('[data-testid="next-step-skeleton"]').should('not.exist');
      cy.get('[data-testid="quick-wins-skeleton"]').should('not.exist');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      cy.wait('@getRecommendations');
      
      // Check progress bar accessibility
      cy.get('[data-testid="next-step-card"]').within(() => {
        cy.get('[role="progressbar"]').should('have.attr', 'aria-label');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuemin', '0');
        cy.get('[role="progressbar"]').should('have.attr', 'aria-valuemax', '100');
      });
      
      // Check button accessibility
      cy.get('[data-testid="next-step-action-0"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="quick-win-0"] button').should('have.attr', 'aria-label');
      
      // Check tooltip accessibility
      cy.get('[data-testid="cri-boost-chip"]').first().should('have.attr', 'aria-describedby');
    });

    it('should support keyboard navigation', () => {
      cy.wait('@getRecommendations');
      
      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'next-step-action-0');
      
      cy.focused().tab();
      cy.get('[data-testid="quick-win-0"] button').should('be.focused');
      
      // Test Enter key activation
      cy.focused().type('{enter}');
      cy.wait('@saveToPlan');
    });

    it('should announce important changes to screen readers', () => {
      cy.wait('@getRecommendations');
      
      // Check for live regions
      cy.get('[aria-live="polite"]').should('exist');
      
      // Trigger an action that should announce changes
      cy.get('[data-testid="quick-win-0"]').within(() => {
        cy.get('button').contains('Start').click();
      });
      cy.wait('@saveToPlan');
      
      // Verify announcement
      cy.get('[aria-live="polite"]').should('contain', 'Quick win started');
    });
  });
});