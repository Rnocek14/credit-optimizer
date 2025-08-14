/**
 * Cross-Hub Value Loops Tests
 * Tests automatic intelligence flows between Discover ↔ Plan ↔ Progress
 */

describe('Cross-Hub Intelligence Flows', () => {
  beforeEach(() => {
    cy.visit('/');
    // Mock authentication for consistent testing
    cy.window().then((win) => {
      win.localStorage.setItem('auth_user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });
  });

  describe('Flow 1: Discover → Plan (Auto Micro-Goal Creation)', () => {
    it('should auto-create micro-goal when saving course from Discover', () => {
      // Navigate to Discover
      cy.visit('/discover');
      cy.get('[data-testid="discover-hub"]').should('be.visible');

      // Find and save a course
      cy.get('[data-testid="course-card"]').first().within(() => {
        // Click save to plan button
        cy.get('[data-testid="save-to-plan-btn"]').click();
      });

      // Should show success message with micro-goal creation
      cy.get('[data-testid="toast"]').should('contain', 'saved to your Plan');
      cy.get('[data-testid="toast"]').should('contain', 'Micro-goal created automatically');

      // Should redirect to Plan hub
      cy.url().should('include', '/plan');
      cy.get('[data-testid="plan-hub"]').should('be.visible');

      // Check that micro-goal was created
      cy.get('[data-testid="micro-goal-card"]').should('exist');
      cy.get('[data-testid="micro-goal-card"]').should('contain', 'Complete:');

      // Verify goal has suggested due date
      cy.get('[data-testid="micro-goal-due-date"]').should('exist');

      // Check recommendation feed for "Goal Created" card
      cy.get('[data-testid="reco-feed"]').within(() => {
        cy.get('[data-testid="reco-card"]').should('contain', 'Goal Created');
      });
    });

    it('should show CRI boost for relevant skill gap courses', () => {
      // Mock user with skill gaps
      cy.intercept('GET', '**/skill-gaps', {
        fixture: 'skill_gaps.json'
      }).as('getSkillGaps');

      cy.visit('/discover');
      
      // Wait for skill gaps to load
      cy.wait('@getSkillGaps');

      // Find course related to skill gap
      cy.get('[data-testid="course-card"]').contains('Python').within(() => {
        // Should show CRI boost chip
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', 'CRI +');
        
        // Hover to see explanation
        cy.get('[data-testid="cri-boost-chip"]').trigger('mouseover');
        cy.get('[role="tooltip"]').should('contain', 'Addresses');
        cy.get('[role="tooltip"]').should('contain', 'skill gap');
      });
    });

    it('should save with priority selector and create appropriate micro-goal', () => {
      cy.visit('/discover');

      cy.get('[data-testid="course-card"]').first().within(() => {
        // Click priority selector dropdown
        cy.get('[data-testid="save-with-priority-btn"]').click();
      });

      // Select high priority
      cy.get('[data-testid="priority-high"]').click();

      // Should create high priority micro-goal
      cy.url().should('include', '/plan');
      cy.get('[data-testid="micro-goal-card"]').within(() => {
        cy.get('[data-testid="priority-badge"]').should('contain', 'High');
      });
    });
  });

  describe('Flow 2: Plan → Progress (Completion Triggers)', () => {
    beforeEach(() => {
      // Setup user with existing plan items
      cy.intercept('GET', '**/saved_plan_items', {
        fixture: 'plan_items.json'
      }).as('getPlanItems');
    });

    it('should update progress and show celebration when roadmap step completed', () => {
      cy.visit('/plan?tab=roadmap');
      cy.wait('@getPlanItems');

      // Find incomplete roadmap step
      cy.get('[data-testid="roadmap-step"]').first().within(() => {
        // Mark as completed
        cy.get('[data-testid="mark-complete-btn"]').click();
      });

      // Should show completion confirmation
      cy.get('[data-testid="toast"]').should('contain', 'Step completed');

      // Navigate to Progress to verify updates
      cy.visit('/progress');
      
      // Check skill tree updates
      cy.get('[data-testid="skill-tree"]').within(() => {
        cy.get('[data-testid="skill-node"]').should('have.class', 'completed');
      });

      // Check for celebration card in recommendations
      cy.get('[data-testid="reco-feed"]').within(() => {
        cy.get('[data-testid="celebration-card"]').should('exist');
        cy.get('[data-testid="celebration-card"]').should('contain', 'Celebration');
      });

      // Verify XP was awarded
      cy.get('[data-testid="user-xp"]').should('be.visible');
    });

    it('should trigger celebration animation on milestone completion', () => {
      cy.visit('/plan?tab=roadmap');

      // Complete a milestone-level step
      cy.get('[data-testid="milestone-step"]').first().within(() => {
        cy.get('[data-testid="mark-complete-btn"]').click();
      });

      // Should trigger celebration animation
      cy.get('[data-testid="celebration-confetti"]').should('be.visible');
      cy.get('[data-testid="celebration-message"]').should('contain', 'Milestone completed');

      // Check celebration moment was created
      cy.get('[data-testid="celebration-moments"]').should('exist');
    });

    it('should award XP and check for badge unlocks on completion', () => {
      cy.visit('/plan?tab=roadmap');

      // Mock XP award response
      cy.intercept('POST', '**/user_achievements', {
        statusCode: 200,
        body: { xp_awarded: 50, badge_unlocked: true }
      }).as('awardXP');

      cy.get('[data-testid="roadmap-step"]').first().within(() => {
        cy.get('[data-testid="mark-complete-btn"]').click();
      });

      cy.wait('@awardXP');

      // Should show XP award notification
      cy.get('[data-testid="toast"]').should('contain', 'XP awarded');
      
      // If badge unlocked, should show badge notification
      cy.get('[data-testid="badge-unlock-modal"]').should('be.visible');
    });
  });

  describe('Flow 3: Progress → Plan (Next Step Suggestions)', () => {
    it('should suggest next steps when skill reaches target level', () => {
      cy.visit('/progress');

      // Mock skill level reaching target
      cy.get('[data-testid="skill-node"]').first().within(() => {
        cy.get('[data-testid="skill-progress"]').should('exist');
        
        // Simulate reaching target level
        cy.get('[data-testid="mark-skill-complete"]').click();
      });

      // Should trigger next step analysis
      cy.get('[data-testid="toast"]').should('contain', 'Skill mastered');

      // Navigate to Plan to see new recommendations
      cy.visit('/plan');

      // Check for "Take Next Step" recommendation
      cy.get('[data-testid="reco-feed"]').within(() => {
        cy.get('[data-testid="reco-card"]').should('contain', 'Take Next Step');
        cy.get('[data-testid="next-step-reco"]').should('exist');
      });

      // Verify deep-link works
      cy.get('[data-testid="next-step-reco"]').within(() => {
        cy.get('[data-testid="reco-primary-cta"]').click();
      });

      // Should navigate to specific next action
      cy.url().should('include', '/plan?tab=roadmap');
      cy.get('[data-testid="highlighted-step"]').should('be.visible');
    });

    it('should auto-create next prerequisite goal when skill target met', () => {
      cy.visit('/progress');

      // Complete a skill that has prerequisites
      cy.get('[data-testid="skill-node"][data-skill="python"]').within(() => {
        cy.get('[data-testid="mark-mastered"]').click();
      });

      // Should auto-create next prerequisite recommendation
      cy.get('[data-testid="toast"]').should('contain', 'Next step unlocked');

      // Check Plan for new auto-created goal
      cy.visit('/plan');
      cy.get('[data-testid="auto-goal-card"]').should('exist');
      cy.get('[data-testid="auto-goal-card"]').should('contain', 'Next: Learn');
    });

    it('should handle complex prerequisite chains correctly', () => {
      // Mock complex skill tree with multiple prerequisites
      cy.intercept('GET', '**/career-step-levels', {
        fixture: 'complex_skill_tree.json'
      }).as('getSkillTree');

      cy.visit('/progress');
      cy.wait('@getSkillTree');

      // Complete a foundational skill
      cy.get('[data-testid="foundational-skill"]').first().within(() => {
        cy.get('[data-testid="mark-complete"]').click();
      });

      // Should unlock multiple dependent skills
      cy.get('[data-testid="unlocked-skills"]').should('have.length.greaterThan', 1);

      // Should prioritize most important next step
      cy.visit('/plan');
      cy.get('[data-testid="priority-recommendation"]').should('exist');
    });
  });

  describe('Flow 4: CRI Boost Integration', () => {
    beforeEach(() => {
      // Mock user with CRI gaps
      cy.intercept('GET', '**/cri-score', {
        body: {
          overall_score: 65,
          skill_gaps: [
            { skill: 'Python', gap_score: 25, priority: 'high' },
            { skill: 'SQL', gap_score: 15, priority: 'medium' }
          ]
        }
      }).as('getCRIScore');
    });

    it('should show CRI boost chips on relevant recommendations', () => {
      cy.visit('/plan');
      cy.wait('@getCRIScore');

      // Check recommendation feed for CRI boost chips
      cy.get('[data-testid="reco-feed"]').within(() => {
        // Should have CRI boost chips on relevant recommendations
        cy.get('[data-testid="cri-boost-chip"]').should('exist');
        cy.get('[data-testid="cri-boost-chip"]').should('contain', 'CRI +');
        
        // Verify boost percentage is shown
        cy.get('[data-testid="cri-boost-chip"]').should('match', /CRI \+\d+%/);
      });
    });

    it('should sort CRI-boosted recommendations higher in feed', () => {
      cy.visit('/plan');
      cy.wait('@getCRIScore');

      cy.get('[data-testid="reco-feed"]').within(() => {
        // First few recommendations should have CRI boosts
        cy.get('[data-testid="reco-card"]').first().within(() => {
          cy.get('[data-testid="cri-boost-chip"]').should('exist');
        });

        cy.get('[data-testid="reco-card"]').eq(1).within(() => {
          cy.get('[data-testid="cri-boost-chip"]').should('exist');
        });
      });
    });

    it('should show CRI explanation in tooltip', () => {
      cy.visit('/plan');
      cy.wait('@getCRIScore');

      cy.get('[data-testid="cri-boost-chip"]').first().trigger('mouseover');
      
      // Should show tooltip with explanation
      cy.get('[role="tooltip"]').should('be.visible');
      cy.get('[role="tooltip"]').should('contain', 'CRI Boost Applied');
      cy.get('[role="tooltip"]').should('contain', 'Addresses');
      cy.get('[role="tooltip"]').should('contain', 'skill gap');
      cy.get('[role="tooltip"]').should('contain', 'Career Readiness Index');
    });

    it('should apply CRI boost when saving items to plan', () => {
      cy.visit('/discover');

      // Find item that addresses skill gap
      cy.get('[data-testid="course-card"]').contains('Python').within(() => {
        cy.get('[data-testid="save-to-plan-btn"]').click();
      });

      // Should show success with CRI boost notification
      cy.get('[data-testid="toast"]').should('contain', 'CRI boosted');
      cy.get('[data-testid="toast"]').should('match', /\+\d+%/);

      // Verify saved item has CRI boost in plan
      cy.visit('/plan');
      cy.get('[data-testid="saved-item"]').should('have.attr', 'data-cri-boost');
    });
  });

  describe('Complete Cross-Hub Flow Integration', () => {
    it('should demonstrate full cross-hub intelligence loop', () => {
      // Start in Discover with skill gap
      cy.visit('/discover');
      
      // Save course that addresses skill gap (Discover → Plan)
      cy.get('[data-testid="course-card"]').contains('Python').within(() => {
        cy.get('[data-testid="cri-boost-chip"]').should('be.visible');
        cy.get('[data-testid="save-to-plan-btn"]').click();
      });

      // Verify micro-goal created in Plan
      cy.url().should('include', '/plan');
      cy.get('[data-testid="micro-goal-card"]').should('exist');

      // Complete the learning step (Plan → Progress)
      cy.get('[data-testid="micro-goal-card"]').within(() => {
        cy.get('[data-testid="mark-complete-btn"]').click();
      });

      // Verify progress updates and celebration
      cy.get('[data-testid="toast"]').should('contain', 'completed');
      cy.visit('/progress');
      cy.get('[data-testid="skill-node"][data-skill="python"]').should('have.class', 'completed');

      // Complete skill to trigger next step (Progress → Plan)
      cy.get('[data-testid="skill-node"][data-skill="python"]').within(() => {
        cy.get('[data-testid="mark-mastered"]').click();
      });

      // Verify next step recommendation appears
      cy.visit('/plan');
      cy.get('[data-testid="next-step-reco"]').should('exist');

      // Verify CRI score improvement
      cy.get('[data-testid="cri-score"]').should('contain', 'Improved');
    });

    it('should handle multiple simultaneous cross-hub triggers', () => {
      // Setup scenario with multiple active goals and skill gaps
      cy.intercept('GET', '**/micro_goals', {
        fixture: 'multiple_goals.json'
      }).as('getMultipleGoals');

      cy.visit('/plan');
      cy.wait('@getMultipleGoals');

      // Complete multiple items simultaneously
      cy.get('[data-testid="micro-goal-card"]').each(($goal, index) => {
        if (index < 3) { // Complete first 3 goals
          cy.wrap($goal).within(() => {
            cy.get('[data-testid="mark-complete-btn"]').click();
          });
        }
      });

      // Should handle all completions and generate appropriate triggers
      cy.get('[data-testid="toast"]').should('have.length.greaterThan', 2);

      // Verify progress updates across multiple skills
      cy.visit('/progress');
      cy.get('[data-testid="skill-node"].completed').should('have.length.greaterThan', 2);

      // Verify multiple new recommendations generated
      cy.visit('/plan');
      cy.get('[data-testid="auto-generated-reco"]').should('have.length.greaterThan', 1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle failed micro-goal creation gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '**/micro_goals', {
        statusCode: 500,
        body: { error: 'Database error' }
      }).as('failedMicroGoal');

      cy.visit('/discover');
      cy.get('[data-testid="course-card"]').first().within(() => {
        cy.get('[data-testid="save-to-plan-btn"]').click();
      });

      // Should still save to plan but show warning about micro-goal
      cy.get('[data-testid="toast"]').should('contain', 'saved to your Plan');
      cy.get('[data-testid="toast"]').should('contain', 'micro-goal creation failed');
    });

    it('should handle missing user data gracefully', () => {
      // Clear user authentication
      cy.window().then((win) => {
        win.localStorage.removeItem('auth_user');
      });

      cy.visit('/plan');
      
      // Should show appropriate message or redirect to auth
      cy.get('[data-testid="auth-required"]').should('be.visible');
    });

    it('should handle disconnected cross-hub triggers', () => {
      // Mock scenario where cross-hub communication fails
      cy.intercept('POST', '**/completion_triggers', {
        statusCode: 503,
        body: { error: 'Service unavailable' }
      }).as('failedTrigger');

      cy.visit('/plan');
      cy.get('[data-testid="roadmap-step"]').first().within(() => {
        cy.get('[data-testid="mark-complete-btn"]').click();
      });

      // Should complete step locally but show warning about cross-hub sync
      cy.get('[data-testid="toast"]').should('contain', 'Step completed');
      cy.get('[data-testid="toast"]').should('contain', 'sync failed');
    });
  });
});

// Helper functions for test data setup
function setupUserWithSkillGaps() {
  return cy.intercept('GET', '**/skill-gaps', {
    body: [
      {
        skill: 'Python',
        currentLevel: 1,
        targetLevel: 3,
        priority: 'high',
        suggestedActions: ['Find Python courses', 'Practice coding'],
        estimatedTimeToClose: '6-8 weeks'
      },
      {
        skill: 'SQL',
        currentLevel: 0,
        targetLevel: 3,
        priority: 'medium',
        suggestedActions: ['Learn SQL basics', 'Practice queries'],
        estimatedTimeToClose: '4-6 weeks'
      }
    ]
  }).as('getSkillGaps');
}

function setupCompleteCareerPath() {
  return cy.intercept('GET', '**/career-step-levels', {
    fixture: 'complete_career_path.json'
  }).as('getCareerPath');
}