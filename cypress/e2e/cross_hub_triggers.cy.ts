/// <reference types="cypress" />

describe('Cross-Hub Intelligence Flows', () => {
  beforeEach(() => {
    // Set up user authentication and mocks
    cy.window().then((win) => {
      win.localStorage.setItem('sb-auth-token', 'mock-auth-token');
    });

    // Mock API responses for cross-hub integration
    cy.intercept('GET', '**/career-goals**', { fixture: 'career-goals.json' }).as('getCareerGoals');
    cy.intercept('GET', '**/skill-gaps**', { fixture: 'skill-gaps.json' }).as('getSkillGaps');
    cy.intercept('GET', '**/unified-recommendations**', { fixture: 'unified-recommendations.json' }).as('getRecommendations');
    cy.intercept('POST', '**/plan-items**', { 
      statusCode: 201, 
      body: { id: 'new-plan-item-id', success: true }
    }).as('saveToPlan');
    cy.intercept('POST', '**/completion-triggers**', { 
      statusCode: 201, 
      body: { id: 'completion-trigger-id', success: true }
    }).as('createCompletionTrigger');
    cy.intercept('POST', '**/celebration-moments**', { 
      statusCode: 201, 
      body: { id: 'celebration-id', success: true }
    }).as('createCelebration');
  });

  describe('Flow 1: Discover → Plan (Auto Micro-Goal Creation)', () => {
    it('should save course from Discover and auto-create micro-goal', () => {
      // Setup course data with CRI boost
      const courseData = {
        id: 'react-advanced-course',
        title: 'Advanced React Patterns',
        type: 'course',
        timeEstimate: '6 weeks',
        skillTags: ['React', 'JavaScript'],
        criBoost: 12.5,
        criExplanation: 'Addresses React skill gap for Senior Frontend role'
      };

      cy.visit('/discover');
      
      // Find and save a course to plan
      cy.get('[data-testid="course-card-react-advanced"]').should('be.visible');
      cy.get('[data-testid="save-to-plan-button"]').first().click();
      
      // Verify priority selection dropdown
      cy.get('[data-testid="priority-dropdown"]').should('be.visible');
      cy.get('[data-testid="priority-high"]').click();
      
      // Verify CRI boost is displayed
      cy.get('[data-testid="cri-boost-chip"]').should('contain', '+12.5%');
      cy.get('[data-testid="cri-boost-chip"]').trigger('mouseover');
      cy.get('[role="tooltip"]').should('contain', 'CRI Boost Applied');
      cy.get('[role="tooltip"]').should('contain', 'Addresses React skill gap');
      
      // Confirm save
      cy.get('[data-testid="confirm-save-button"]').click();
      
      // Verify API call
      cy.wait('@saveToPlan').then((interception) => {
        expect(interception.request.body).to.include({
          type: 'course',
          priority: 'high',
          timeEstimate: '6 weeks'
        });
      });
      
      // Verify success toast
      cy.get('.toast').should('contain', 'Added to your plan');
      
      // Navigate to Plan and verify micro-goal was created
      cy.visit('/plan');
      cy.wait('@getCareerGoals');
      
      // Check for auto-created micro-goal
      cy.get('[data-testid="micro-goals-section"]').within(() => {
        cy.contains('Complete Advanced React Patterns').should('be.visible');
        cy.get('[data-testid="due-date"]').should('contain', 'Due in 7 days');
      });
    });

    it('should prevent duplicate micro-goals on repeated saves', () => {
      const courseId = 'react-basics-course';
      
      // Mock response for duplicate check
      cy.intercept('POST', '**/plan-items**', {
        statusCode: 409,
        body: { error: 'Item already exists in plan' }
      }).as('duplicateSave');
      
      cy.visit('/discover');
      
      // Try to save the same course twice
      cy.get(`[data-testid="course-card-${courseId}"]`).should('be.visible');
      cy.get('[data-testid="save-to-plan-button"]').first().click();
      cy.get('[data-testid="priority-medium"]').click();
      cy.get('[data-testid="confirm-save-button"]').click();
      
      // Second attempt should show already saved state
      cy.get('[data-testid="save-to-plan-button"]').first().should('contain', 'Saved');
      cy.get('[data-testid="save-to-plan-button"]').first().should('be.disabled');
    });
  });

  describe('Flow 2: Plan → Progress (Completion Triggers)', () => {
    it('should complete roadmap step and trigger celebration', () => {
      cy.visit('/plan');
      cy.wait('@getCareerGoals');
      
      // Find and complete a roadmap step
      cy.get('[data-testid="roadmap-step-react-fundamentals"]').should('be.visible');
      cy.get('[data-testid="complete-step-button"]').click();
      
      // Verify completion trigger API call
      cy.wait('@createCompletionTrigger').then((interception) => {
        expect(interception.request.body).to.include({
          trigger_type: 'milestone_completed',
          target_action: 'award_xp_and_celebrate'
        });
      });
      
      // Verify immediate UI feedback
      cy.get('[data-testid="roadmap-step-react-fundamentals"]').within(() => {
        cy.get('[data-testid="completion-checkmark"]').should('be.visible');
        cy.get('.progress-bar').should('have.attr', 'aria-valuenow', '100');
      });
      
      // Navigate to Progress and verify celebration
      cy.visit('/progress');
      cy.wait('@createCelebration');
      
      // Check for celebration moment
      cy.get('[data-testid="celebration-modal"]').should('be.visible');
      cy.get('[data-testid="celebration-title"]').should('contain', 'Milestone Achieved!');
      cy.get('[data-testid="xp-award"]').should('contain', '+50 XP');
    });

    it('should update skill tree and trigger skill level up', () => {
      cy.visit('/plan');
      
      // Complete multiple related steps to trigger skill upgrade
      cy.get('[data-testid="complete-step-button"]').first().click();
      cy.get('[data-testid="complete-step-button"]').eq(1).click();
      
      // Navigate to Progress to see skill tree updates
      cy.visit('/progress');
      
      // Verify skill node upgrade
      cy.get('[data-testid="skill-node-react"]').within(() => {
        cy.get('[data-testid="skill-level"]').should('contain', 'Level 2');
        cy.get('[data-testid="level-up-badge"]').should('be.visible');
      });
      
      // Check for skill upgrade celebration
      cy.get('[data-testid="skill-upgrade-notification"]').should('be.visible');
      cy.get('[data-testid="skill-upgrade-notification"]').should('contain', 'React skill upgraded!');
    });
  });

  describe('Flow 3: Progress → Plan (Next Step Suggestions)', () => {
    it('should trigger next step suggestion when skill target is met', () => {
      cy.visit('/progress');
      
      // Simulate reaching a skill target
      cy.get('[data-testid="skill-node-javascript"]').click();
      cy.get('[data-testid="mark-target-achieved"]').click();
      
      // Navigate to Plan to see suggestion
      cy.visit('/plan');
      cy.wait('@getRecommendations');
      
      // Verify next step suggestion appears
      cy.get('[data-testid="next-step-suggestions"]').should('be.visible');
      cy.get('[data-testid="suggested-action"]').should('contain', 'Take Next Step');
      cy.get('[data-testid="suggestion-title"]').should('contain', 'Advanced JavaScript Concepts');
      
      // Verify CRI boost on suggestion
      cy.get('[data-testid="next-step-suggestions"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', '+');
      });
    });

    it('should create unified goal from cross-hub recommendation', () => {
      cy.visit('/progress');
      
      // Meet prerequisite skill requirements
      cy.get('[data-testid="skill-node-typescript"]').click();
      cy.get('[data-testid="mark-mastered"]').click();
      
      // Navigate to Plan
      cy.visit('/plan');
      
      // Accept auto-generated recommendation
      cy.get('[data-testid="auto-recommendation"]').should('be.visible');
      cy.get('[data-testid="accept-recommendation"]').click();
      
      // Verify unified goal creation
      cy.wait('@saveToPlan').then((interception) => {
        expect(interception.request.body).to.include({
          type: 'career_path',
          metadata: {
            source: 'cross_hub_trigger',
            trigger_type: 'skill_mastery'
          }
        });
      });
    });
  });

  describe('Flow 4: CRI Boost Integration', () => {
    it('should display CRI boost chips with correct sorting', () => {
      cy.visit('/plan');
      cy.wait('@getRecommendations');
      
      // Verify CRI boost sorting (highest boost first)
      cy.get('[data-testid="recommendation-list"]').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').first().should('contain', '+15.0%');
        cy.get('[data-testid="cri-boost-chip"]').eq(1).should('contain', '+8.5%');
        cy.get('[data-testid="cri-boost-chip"]').eq(2).should('contain', '+3.2%');
      });
    });

    it('should show detailed CRI boost tooltip', () => {
      cy.visit('/discover');
      
      // Hover over CRI boost chip
      cy.get('[data-testid="cri-boost-chip"]').first().trigger('mouseover');
      
      // Verify tooltip content
      cy.get('[role="tooltip"]').should('be.visible');
      cy.get('[role="tooltip"]').should('contain', 'CRI Boost Applied');
      cy.get('[role="tooltip"]').should('contain', 'This addresses your Skill Gaps');
      cy.get('[role="tooltip"]').should('contain', 'raises your Career Readiness Index');
    });

    it('should hide CRI chips when boost is 0 or negative', () => {
      // Mock recommendations with no CRI boost
      cy.intercept('GET', '**/unified-recommendations**', {
        body: {
          recommendations: [{
            id: 'no-boost-item',
            title: 'Basic HTML Course',
            criBoost: 0,
            timeEstimate: '2 hours'
          }]
        }
      }).as('getNoBoostedRecommendations');
      
      cy.visit('/discover');
      cy.wait('@getNoBoostedRecommendations');
      
      // Verify no CRI chips are shown
      cy.get('[data-testid="cri-boost-chip"]').should('not.exist');
    });
  });

  describe('Complete Cross-Hub Flow Integration', () => {
    it('should execute end-to-end cross-hub scenario', () => {
      // 1. Start in Discover, save course with high CRI boost
      cy.visit('/discover');
      cy.get('[data-testid="course-card-fullstack"]').should('be.visible');
      cy.get('[data-testid="save-to-plan-button"]').first().click();
      cy.get('[data-testid="priority-high"]').click();
      cy.get('[data-testid="confirm-save-button"]').click();
      
      cy.wait('@saveToPlan');
      cy.get('.toast').should('contain', 'Added to your plan');
      
      // 2. Navigate to Plan, verify micro-goal created
      cy.visit('/plan');
      cy.wait('@getCareerGoals');
      cy.get('[data-testid="micro-goals-section"]').should('contain', 'Complete Fullstack');
      
      // 3. Complete the course steps
      cy.get('[data-testid="complete-step-button"]').first().click();
      cy.wait('@createCompletionTrigger');
      
      // 4. Navigate to Progress, verify XP and celebration
      cy.visit('/progress');
      cy.get('[data-testid="celebration-modal"]').should('be.visible');
      cy.get('[data-testid="xp-award"]').should('be.visible');
      
      // 5. Check skill tree updates
      cy.get('[data-testid="skill-tree"]').should('be.visible');
      cy.get('[data-testid="skill-level"]').should('contain', 'Level');
      
      // 6. Return to Plan for next recommendations
      cy.visit('/plan');
      cy.get('[data-testid="next-step-suggestions"]').should('be.visible');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API failures gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '**/plan-items**', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('saveFailure');
      
      cy.visit('/discover');
      cy.get('[data-testid="save-to-plan-button"]').first().click();
      cy.get('[data-testid="priority-medium"]').click();
      cy.get('[data-testid="confirm-save-button"]').click();
      
      cy.wait('@saveFailure');
      
      // Verify error handling
      cy.get('.toast').should('contain', 'Failed to save');
      cy.get('[data-testid="save-to-plan-button"]').should('not.be.disabled');
    });

    it('should handle missing user data', () => {
      // Mock empty user data
      cy.intercept('GET', '**/skill-gaps**', { body: { gaps: [] } }).as('getEmptyGaps');
      cy.intercept('GET', '**/unified-recommendations**', { body: { recommendations: [] } }).as('getEmptyRecommendations');
      
      cy.visit('/plan');
      cy.wait('@getEmptyGaps');
      cy.wait('@getEmptyRecommendations');
      
      // Verify graceful empty state
      cy.get('[data-testid="empty-state"]').should('be.visible');
      cy.get('[data-testid="empty-state"]').should('contain', 'No recommendations available');
    });

    it('should handle disconnected cross-hub triggers', () => {
      // Test when triggers are disabled
      cy.window().then((win) => {
        win.localStorage.setItem('featureFlags', JSON.stringify({
          crossHubTriggers: false
        }));
      });
      
      cy.visit('/plan');
      cy.get('[data-testid="complete-step-button"]').first().click();
      
      // Verify no cross-hub triggers fire
      cy.get('@createCompletionTrigger').should('not.exist');
      cy.get('[data-testid="manual-celebration-prompt"]').should('be.visible');
    });
  });
});

// Helper functions for test data setup
function setupUserWithSkillGaps() {
  cy.intercept('GET', '**/skill-gaps**', {
    body: {
      gaps: [
        {
          skill: 'React',
          priority: 'high',
          estimatedTimeToClose: '4 weeks',
          criImpact: 15.0
        },
        {
          skill: 'TypeScript',
          priority: 'medium',
          estimatedTimeToClose: '2 weeks',
          criImpact: 8.5
        }
      ]
    }
  }).as('getSkillGaps');
}

function setupCompleteCareerPath() {
  cy.intercept('GET', '**/career-goals**', {
    body: {
      goals: [
        {
          id: 'frontend-path',
          title: 'Frontend Developer Path',
          steps: [
            { id: 'html-css', title: 'HTML & CSS Fundamentals', completed: true },
            { id: 'javascript', title: 'JavaScript Essentials', completed: true },
            { id: 'react', title: 'React Framework', completed: false }
          ]
        }
      ]
    }
  }).as('getCareerGoals');
}