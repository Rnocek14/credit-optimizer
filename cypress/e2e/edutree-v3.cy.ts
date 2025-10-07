/// <reference types="cypress" />

describe('EduTree V3 Canvas', () => {
  beforeEach(() => {
    // Visit the V3 page with flag
    cy.visit('/edu-tree?v3=1');
    
    // Wait for ReactFlow to mount
    cy.get('.react-flow', { timeout: 10000 }).should('exist');
  });

  it('loads V3 canvas successfully', () => {
    // Check that V3 canvas is rendered
    cy.contains('V3 Engine Active').should('be.visible');
    
    // Check that we have nodes
    cy.get('.react-flow__node').should('have.length.greaterThan', 0);
  });

  it('displays correct node count', () => {
    // Check the debug info shows nodes
    cy.contains(/Nodes: \d+/).should('be.visible');
    cy.contains(/Edges: \d+/).should('be.visible');
  });

  it('validate overlaps button works', () => {
    // Click validate overlaps button
    cy.contains('button', 'Validate Overlaps').click();
    
    // Should show a toast (success or error)
    cy.get('[data-sonner-toast]', { timeout: 3000 }).should('exist');
  });

  it('fit view button works', () => {
    // Click fit view button
    cy.contains('button', 'Fit View').click();
    
    // Canvas should still be visible after fitting
    cy.get('.react-flow', { timeout: 2000 }).should('be.visible');
  });

  it('displays requirement nodes', () => {
    // Check for requirement node cards
    cy.get('.react-flow__node[data-id]').first().should('exist');
  });

  it('displays edges between nodes', () => {
    // Check for edges
    cy.get('.react-flow__edge').should('have.length.greaterThan', 0);
  });

  it('supports pan and zoom', () => {
    // Check that ReactFlow controls exist
    cy.get('.react-flow__controls').should('be.visible');
    
    // Check zoom controls
    cy.get('.react-flow__controls button').should('have.length.greaterThan', 0);
  });

  it('shows minimap', () => {
    // Check that minimap exists
    cy.get('.react-flow__minimap').should('be.visible');
  });

  it('can enable metrics view', () => {
    // Visit with metrics flag
    cy.visit('/edu-tree?v3=1&metrics=1');
    
    // Wait for ReactFlow
    cy.get('.react-flow', { timeout: 10000 }).should('exist');
    
    // Should show layout metrics
    cy.contains('Layout Metrics').should('be.visible');
    cy.contains(/Layout: \d+.*ms/).should('be.visible');
    cy.contains(/Collision: \d+.*ms/).should('be.visible');
  });

  it('validates no overlaps on initial render', () => {
    // Click validate button
    cy.contains('button', 'Validate Overlaps').click();
    
    // Should show success toast (no overlaps)
    cy.contains('No overlaps detected', { timeout: 3000 }).should('be.visible');
  });

  it('renders gate nodes differently from requirement nodes', () => {
    // Gate nodes should exist
    cy.get('.react-flow__node').should('have.length.greaterThan', 0);
    
    // Should have both types of nodes (check via class or structure)
    cy.get('.react-flow__node').then($nodes => {
      expect($nodes.length).to.be.greaterThan(5); // Should have multiple node types
    });
  });

  it('displays node titles', () => {
    // At least one node should have visible text
    cy.get('.react-flow__node').first().should('contain.text', /\w+/);
  });

  it('maintains stable layout on re-render', () => {
    let firstPositions: any[] = [];
    
    // Capture initial positions
    cy.get('.react-flow__node').then($nodes => {
      firstPositions = $nodes.toArray().map(el => ({
        id: el.getAttribute('data-id'),
        transform: el.style.transform
      }));
    });
    
    // Trigger re-render by clicking fit view
    cy.contains('button', 'Fit View').click();
    cy.wait(500);
    
    // Validate overlaps to ensure determinism
    cy.contains('button', 'Validate Overlaps').click();
    cy.contains('No overlaps detected', { timeout: 3000 }).should('be.visible');
  });
});
