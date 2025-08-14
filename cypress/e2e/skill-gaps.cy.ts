/**
 * Cypress tests for skill gap detection
 */

describe('Skill Gap Detection', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '**/auth/v1/user', {
      statusCode: 200,
      body: {
        id: 'test-user-123',
        email: 'test@example.com'
      }
    }).as('getUser');

    cy.intercept('GET', '**/rest/v1/career_goals*', {
      statusCode: 200,
      body: []
    }).as('getGoals');

    cy.intercept('GET', '**/rest/v1/user_skill_progress*', {
      statusCode: 200,
      body: []
    }).as('getUserSkills');

    cy.intercept('GET', '**/rest/v1/career_paths*', {
      statusCode: 200,
      body: {
        key_skills: ['Python', 'SQL', 'Machine Learning']
      }
    }).as('getCareerPath');

    // Visit progress page
    cy.visit('/progress');
  });

  it('should display fallback skills when no goals exist', () => {
    // Wait for API calls to complete
    cy.wait(['@getUser', '@getGoals', '@getUserSkills']);

    // Navigate to skill gaps tab
    cy.get('[data-testid="reco-feed"]').should('be.visible');
    cy.contains('button', 'Skill Gaps').click();

    // Should show skill gap recommendations
    cy.get('[data-testid="skill-gaps-list"]').should('exist');
    
    // Should contain fallback skills
    cy.contains('SQL').should('be.visible');
    cy.contains('Python').should('be.visible');
  });

  it('should display empty state when everything is covered', () => {
    // Mock user has all fallback skills
    cy.intercept('GET', '**/rest/v1/user_skill_progress*', {
      statusCode: 200,
      body: [
        { skills: { name: 'SQL' } },
        { skills: { name: 'Python' } },
        { skills: { name: 'Machine Learning' } },
        { skills: { name: 'Data Analysis' } },
        { skills: { name: 'Docker' } },
        { skills: { name: 'JavaScript' } },
        { skills: { name: 'React' } },
        { skills: { name: 'TypeScript' } }
      ]
    }).as('getUserSkillsComplete');

    cy.visit('/progress');
    cy.wait(['@getUser', '@getGoals', '@getUserSkillsComplete']);

    cy.contains('button', 'Skill Gaps').click();
    cy.get('[data-testid="skill-gaps-empty"]').should('be.visible');
  });

  it('should display gaps from career goals', () => {
    // Mock user has goals
    cy.intercept('GET', '**/rest/v1/career_goals*', {
      statusCode: 200,
      body: [
        {
          id: 'goal-1',
          target_role: 'Data Scientist',
          career_path_id: 'path-1'
        }
      ]
    }).as('getGoalsWithData');

    // Mock only partial skills
    cy.intercept('GET', '**/rest/v1/user_skill_progress*', {
      statusCode: 200,
      body: [
        { skills: { name: 'Python' } }
      ]
    }).as('getUserSkillsPartial');

    cy.visit('/progress');
    cy.wait(['@getUser', '@getGoalsWithData', '@getUserSkillsPartial', '@getCareerPath']);

    cy.contains('button', 'Skill Gaps').click();
    
    // Should show gaps for missing skills
    cy.contains('SQL').should('be.visible');
    cy.contains('Machine Learning').should('be.visible');
    
    // Should not show Python (user already has it)
    cy.get('[data-testid="skill-gaps-list"]').should('not.contain', 'Python');
  });

  it('should allow saving skill gaps to plan', () => {
    cy.intercept('POST', '**/rest/v1/saved_plan_items', {
      statusCode: 201,
      body: { id: 'saved-item-123' }
    }).as('saveToPlan');

    cy.visit('/progress');
    cy.wait(['@getUser', '@getGoals', '@getUserSkills']);

    cy.contains('button', 'Skill Gaps').click();
    
    // Find first skill gap and save to plan
    cy.get('[data-testid="skill-gaps-list"]').within(() => {
      cy.get('button').contains('Save').first().click();
    });

    cy.wait('@saveToPlan').then((interception) => {
      expect(interception.request.body).to.have.property('source_hub', 'skill_gaps');
    });

    // Should show success toast
    cy.contains('Added to plan').should('be.visible');
  });

  it('should display proper priority indicators', () => {
    cy.visit('/progress');
    cy.wait(['@getUser', '@getGoals', '@getUserSkills']);

    cy.contains('button', 'Skill Gaps').click();

    // Should show critical priority for SQL
    cy.get('[data-testid="skill-gaps-list"]').within(() => {
      cy.contains('SQL').should('be.visible');
      // Critical skills should appear first due to sorting
      cy.get('.bg-destructive').should('exist'); // Priority badge
    });
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('GET', '**/rest/v1/career_goals*', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('getGoalsError');

    cy.visit('/progress');
    cy.wait(['@getUser', '@getGoalsError']);

    cy.contains('button', 'Skill Gaps').click();
    
    // Should still show fallback skills even with API errors
    cy.get('[data-testid="skill-gaps-list"]').should('exist');
    cy.contains('SQL').should('be.visible');
  });
});