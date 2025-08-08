/// <reference types="cypress" />

describe('Demo Flows', () => {
  it('Explore → Plan flow (demo)', () => {
    cy.visit('/career-copilot');
    cy.contains('Run Demo Workflow').should('be.visible');
  });

  it('Run Demo Workflow shows dry-run results', () => {
    cy.visit('/career-copilot');
    cy.contains('Run Demo Workflow').click();
    cy.contains('mode: dry-run').should('be.visible');
  });

  it('Marks Day‑1 cards as Done after workflow', () => {
    cy.visit('/career-copilot');
    cy.contains('Run Demo Workflow').click();
    cy.contains('mode: dry-run').should('be.visible');
    cy.visit('/sprint-board');
    cy.contains('Day 1 — Blockers').parent().within(() => {
      cy.contains('Done');
    });
  });
});
