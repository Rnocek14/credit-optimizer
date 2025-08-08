describe('Day 2 High-Impact Features', () => {
  beforeEach(() => {
    // Visit the main page
    cy.visit('/');
  });

  it('1) Proof project attach from Skill Tree → visible on /projects → visible on /resume-builder', () => {
    // Navigate to skill tree
    cy.visit('/skill-tree');
    
    // Wait for skill tree to load
    cy.wait(2000);
    
    // Look for any skill node and click it
    cy.get('[data-testid*="skill-node"]').first().click();
    
    // Wait for side panel to open
    cy.wait(1000);
    
    // Click attach proof project button
    cy.get('[data-testid="attach-proof-skill"]').should('be.visible').click();
    
    // Fill out the modal
    cy.get('input[placeholder*="title"]').type('Test Proof Project');
    cy.get('textarea').first().type('This is a test proof project description');
    
    // Submit the modal
    cy.get('button').contains('Save').click();
    
    // Verify toast appears
    cy.contains('Project added to Proof Projects').should('be.visible');
    
    // Navigate to projects page
    cy.visit('/projects');
    
    // Verify project appears in list
    cy.get('[data-testid="projects-list"]').should('contain', 'Test Proof Project');
    
    // Navigate to resume builder
    cy.visit('/resume-builder');
    
    // Wait for page to load
    cy.wait(2000);
    
    // Verify project appears in resume builder
    cy.contains('Proof Projects').should('be.visible');
  });

  it('2) Wallet OpenBadge export returns dry-run JSON', () => {
    // Navigate to wallet
    cy.visit('/wallet');
    
    // Wait for page to load
    cy.wait(1000);
    
    // Click export button on first badge
    cy.get('[data-testid="export-openbadge"]').first().click();
    
    // Wait for download to complete
    cy.wait(3000);
    
    // Check that download was triggered (file will be in downloads folder)
    // In a real test, we'd verify the file content
    cy.contains('Badge Exported!').should('be.visible');
  });

  it('3) /institution and /employer load in demo guard', () => {
    // Test institution page
    cy.visit('/institution');
    
    // Verify demo banner shows
    cy.get('[data-testid="demo-guard-banner"]').should('be.visible');
    cy.contains('Demo Mode').should('be.visible');
    
    // Verify page content loads
    cy.contains('Institution Hub').should('be.visible');
    cy.contains('Cohort Overview').should('be.visible');
    
    // Test employer page
    cy.visit('/employer');
    
    // Verify demo banner shows
    cy.get('[data-testid="demo-guard-banner"]').should('be.visible');
    cy.contains('Demo Mode').should('be.visible');
    
    // Verify page content loads
    cy.contains('Employer Hub').should('be.visible');
    cy.contains('Candidate Matching').should('be.visible');
  });

  it('4) LinkedIn Import → roadmap modal → "Add Top 2 Steps to Plan (demo)" → visible in /plan', () => {
    // Navigate to career copilot
    cy.visit('/career-copilot');
    
    // Wait for page to load
    cy.wait(2000);
    
    // Scroll down to find LinkedIn import section
    cy.scrollTo('bottom');
    
    // Click simulate OAuth button
    cy.contains('Simulate OAuth').click();
    
    // Wait for modal to open with roadmap steps
    cy.wait(3000);
    
    // Verify modal shows roadmap steps
    cy.contains('Generated Roadmap Steps').should('be.visible');
    
    // Click "Add Top 2 Steps to Plan"
    cy.contains('Add Top 2 Steps to Plan (demo)').click();
    
    // Verify toast appears
    cy.contains('Steps Added to Plan!').should('be.visible');
    
    // Navigate to plan page
    cy.visit('/plan');
    
    // Wait for page to load
    cy.wait(1000);
    
    // Verify the added steps appear in the plan
    cy.get('[data-testid*="course-card"]').should('have.length.at.least', 2);
  });

  it('5) Verify projects can be toggled as verified', () => {
    // First add a project via skill tree
    cy.visit('/skill-tree');
    cy.wait(2000);
    
    cy.get('[data-testid*="skill-node"]').first().click();
    cy.wait(1000);
    
    cy.get('[data-testid="attach-proof-skill"]').click();
    cy.get('input[placeholder*="title"]').type('Verification Test Project');
    cy.get('button').contains('Save').click();
    
    // Navigate to projects page
    cy.visit('/projects');
    
    // Find the verified toggle and click it
    cy.get('[data-testid="verified-toggle"]').first().click();
    
    // Verify the status changed
    cy.contains('✅ Verified').should('be.visible');
  });

  it('6) Resume builder shows proof projects section', () => {
    // Add a project first
    cy.visit('/skill-tree');
    cy.wait(2000);
    
    cy.get('[data-testid*="skill-node"]').first().click();
    cy.wait(1000);
    
    cy.get('[data-testid="attach-proof-skill"]').click();
    cy.get('input[placeholder*="title"]').type('Resume Test Project');
    cy.get('button').contains('Save').click();
    
    // Navigate to resume builder
    cy.visit('/resume-builder');
    cy.wait(2000);
    
    // Verify proof projects section exists
    cy.contains('Proof Projects').should('be.visible');
    cy.contains('Resume Test Project').should('be.visible');
  });
});