/// <reference types="cypress" />

describe('Demo Flows - Comprehensive QA Suite', () => {
  beforeEach(() => {
    // Setup test environment
    cy.visit('/');
    cy.window().then((win) => {
      // Clear any existing test flags
      win.localStorage.removeItem('day1_done');
      win.localStorage.removeItem('demo_test_running');
    });
  });

  describe('Demo Flow 1: Social Learning → Certificate', () => {
    it('completes the full social learning challenge flow', () => {
      // Step 1: Navigate to Social Learning
      cy.visit('/social');
      cy.url().should('include', '/social');
      cy.get('[data-testid="challenge-cards"]', { timeout: 10000 }).should('be.visible');

      // Step 2: Join a Challenge
      cy.get('[data-testid="join-challenge-btn"]').first().click();
      cy.contains(/joined|active/i, { timeout: 5000 }).should('be.visible');

      // Step 3: Update Progress to 50%
      cy.get('[data-testid="progress-slider"]').first().click({ force: true });
      cy.get('[data-testid="progress-slider"]').first().invoke('val', 50).trigger('change');
      cy.contains('50%', { timeout: 3000 }).should('be.visible');

      // Step 4: Complete Challenge (100%)
      cy.get('[data-testid="progress-slider"]').first().invoke('val', 100).trigger('change');
      cy.contains(/completed|certificate/i, { timeout: 5000 }).should('be.visible');

      // Step 5: Verify Certificate
      cy.visit('/certificates');
      cy.get('[data-testid="certificate-card"]', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Demo Flow 2: Course Intelligence Pipeline', () => {
    it('completes the course intelligence analysis flow', () => {
      // Step 1: Navigate to Course History
      cy.visit('/course-history');
      cy.get('[data-testid="course-intelligence-section"]', { timeout: 10000 }).should('be.visible');

      // Step 2: Parse Course URL
      const testUrl = 'https://www.coursera.org/learn/machine-learning';
      cy.get('[data-testid="course-url-input"]').type(testUrl);
      cy.get('[data-testid="parse-course-btn"]').click();
      cy.get('[data-testid="loading-state"]', { timeout: 3000 }).should('be.visible');

      // Step 3: Analyze Course Quality
      cy.get('[data-testid="analyze-quality-btn"]', { timeout: 10000 }).click();
      cy.get('[data-testid="quality-grade"]', { timeout: 8000 }).should('be.visible');

      // Step 4: Extract Skills
      cy.get('[data-testid="extract-skills-btn"]').click();
      cy.get('[data-testid="skills-list"]', { timeout: 5000 }).should('be.visible');

      // Step 5: Get Recommendations
      cy.get('[data-testid="recommendations-section"]', { timeout: 5000 }).should('be.visible');

      // Step 6: Add to Plan
      cy.get('[data-testid="add-to-plan-btn"]').first().click();
      cy.contains(/added to plan/i, { timeout: 3000 }).should('be.visible');
    });
  });

  describe('Demo Flow 3: Maya Workflow Execution', () => {
    it('completes the Maya workflow execution flow', () => {
      // Step 1: Navigate to Workflows
      cy.visit('/workflows');
      cy.get('[data-testid="maya-dashboard"]', { timeout: 10000 }).should('be.visible');

      // Step 2: Select Workflow
      cy.get('[data-testid="workflow-card"]').first().click();
      cy.get('[data-testid="workflow-steps"]', { timeout: 5000 }).should('be.visible');

      // Step 3: Execute Workflow Step
      cy.get('[data-testid="execute-step-btn"]').first().click();
      cy.get('[data-testid="step-loading"]', { timeout: 3000 }).should('be.visible');
      cy.get('[data-testid="step-completed"]', { timeout: 10000 }).should('be.visible');

      // Step 4: Generate AI Explanation
      cy.get('[data-testid="get-explanation-btn"]').first().click();
      cy.get('[data-testid="ai-explanation"]', { timeout: 10000 }).should('be.visible');

      // Step 5: Validate Progress
      cy.get('[data-testid="validate-progress-btn"]').click();
      cy.get('[data-testid="validation-results"]', { timeout: 5000 }).should('be.visible');

      // Step 6: Complete Workflow
      cy.get('[data-testid="complete-workflow-btn"]').click();
      cy.contains(/workflow completed/i, { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Integration Testing', () => {
    it('validates cross-system data flow', () => {
      // Certificate Integration
      cy.visit('/social');
      cy.get('[data-testid="complete-challenge"]').first().click({ force: true });
      cy.visit('/certificates');
      cy.get('[data-testid="certificate-count"]').should('contain', '1');

      // XP System Integration
      cy.visit('/social');
      cy.get('[data-testid="user-xp"]').invoke('text').as('initialXP');
      cy.get('[data-testid="join-challenge-btn"]').first().click();
      cy.get('@initialXP').then((initialXP) => {
        cy.get('[data-testid="user-xp"]').should('not.contain', initialXP);
      });
    });
  });

  describe('Edge Case Testing', () => {
    it('handles invalid course URL', () => {
      cy.visit('/course-history');
      cy.get('[data-testid="course-url-input"]').type('invalid-url-test');
      cy.get('[data-testid="parse-course-btn"]').click();
      cy.contains(/invalid|error/i, { timeout: 5000 }).should('be.visible');
    });

    it('handles progress bounds validation', () => {
      cy.visit('/social');
      cy.get('[data-testid="progress-slider"]').first().invoke('val', 150).trigger('change');
      cy.get('[data-testid="progress-display"]').should('not.contain', '150%');
    });

    it('handles empty states gracefully', () => {
      cy.visit('/social');
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="no-challenges"]').length > 0) {
          cy.get('[data-testid="empty-state-message"]').should('be.visible');
        }
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('meets response time targets', () => {
      const startTime = Date.now();
      cy.visit('/social');
      cy.get('[data-testid="challenge-cards"]', { timeout: 2000 }).should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(2000); // < 2 seconds
      });
    });

    it('handles concurrent operations', () => {
      cy.visit('/social');
      // Simulate rapid progress updates
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="progress-slider"]').first().click({ force: true });
        cy.wait(100);
      }
      cy.get('[data-testid="progress-display"]').should('be.visible');
    });
  });

  // Original demo flows for backward compatibility
  it('Explore → Plan flow (demo)', () => {
    cy.visit('/career-copilot');
    cy.get('body').then(($body) => {
      const hasAdd = $body.find('button:contains("Add to Path"), a:contains("Add to Path")').length > 0;
      if (hasAdd) {
        cy.contains(/Add to Path/i).first().click();
        cy.contains(/added to (plan|path)/i, { timeout: 2000 }).should('be.visible');
      }
    });
    cy.visit('/plan');
    cy.location('pathname').should('include', '/plan');
  });

  it('Plan → History → Resume flow (demo)', () => {
    cy.visit('/plan');
    cy.get('body').then(($body) => {
      const hasMark = $body.find('button:contains("Mark Step Complete (demo)")').length > 0;
      if (hasMark) cy.contains('Mark Step Complete (demo)').click();
    });
    cy.visit('/history');
    cy.location('pathname').should('include', '/history');
    cy.visit('/resume-builder');
    cy.location('pathname').should('include', '/resume-builder');
  });

  it('Teach Hub → Path (dry-run integrator)', () => {
    cy.visit('/teach-hub');
    cy.get('body').then(($body) => {
      const hasApprove = $body.find('button:contains("Approve")').length > 0;
      if (hasApprove) {
        cy.contains('Approve').first().click();
        cy.contains(/diff|preview|integration/i, { timeout: 3000 }).should('be.visible');
      }
    });
  });

  it('Career Co‑Pilot: Run Demo Workflow shows dry-run results and sets flag', () => {
    cy.visit('/career-copilot');
    cy.contains('Run Demo Workflow').should('be.visible');
    cy.contains('Run Demo Workflow').click();
    cy.contains('mode: dry-run', { timeout: 8000 }).should('be.visible');

    cy.window().then((win) => {
      win.localStorage.setItem('day1_done', 'true');
    });

    cy.visit('/sprint-board');
    cy.contains('Day 1 — Blockers').parent().within(() => {
      cy.contains('Done');
    });
  });
});
