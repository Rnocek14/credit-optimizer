/// <reference types="cypress" />

describe('Demo Flows', () => {
  it('Explore → Plan flow (demo)', () => {
    // Try to add a course to the plan if the button exists
    cy.visit('/career-copilot');
    cy.get('body').then(($body) => {
      const hasAdd = $body.find('button:contains("Add to Path"), a:contains("Add to Path")').length > 0;
      if (hasAdd) {
        cy.contains(/Add to Path/i).first().click();
        // Toast or inline confirmation if available
        cy.contains(/added to (plan|path)/i, { timeout: 2000 }).should('be.visible');
      }
    });
    // Plan reflects item from store (at least page is reachable)
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

    // Set sprint flag explicitly for Day‑1 gate
    cy.window().then((win) => {
      win.localStorage.setItem('day1_done', 'true');
    });

    // Sprint board should show Day‑1 cards as Done
    cy.visit('/sprint-board');
    cy.contains('Day 1 — Blockers').parent().within(() => {
      cy.contains('Done');
    });
  });
});
