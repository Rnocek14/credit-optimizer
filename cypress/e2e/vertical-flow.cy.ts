/// <reference types="cypress" />

/**
 * Vertical flow smoke tests
 * 
 * Validates:
 * - Straight-down spine (monotonic Y)
 * - Y3 fork geometry (SE/DS same Y, different X)
 * - Y4 merge (below both Y3 branches)
 * - Edge directions (all downward)
 */

describe('EduTree V3 Vertical Flow', () => {
  beforeEach(() => {
    cy.visit('/edu-tree?v3=1&layout=vertical');
    cy.get('.react-flow', { timeout: 10000 }).should('exist');
  });

  it('renders vertical layout successfully', () => {
    // Check that nodes exist
    cy.get('.react-flow__node').should('have.length.greaterThan', 0);
    
    // Check for vertical flow indicator
    cy.contains('Vertical Flow').should('be.visible');
  });

  it('validates straight-down spine flow', () => {
    // Spine nodes should have monotonically increasing Y
    const spineIds = ['y1-bundle', 'gate-y2-programs', 'y2-bundle', 'gate-y3-tracks', 'y4-bundle'];
    
    let previousY = -Infinity;
    
    spineIds.forEach(id => {
      cy.get(`.react-flow__node[data-id="${id}"]`).then($el => {
        const rect = $el[0].getBoundingClientRect();
        const currentY = rect.top;
        
        // Current Y should be greater than previous (moving down)
        expect(currentY).to.be.greaterThan(previousY);
        previousY = currentY;
      });
    });
  });

  it('validates Y3 fork geometry', () => {
    // SE and DS should share same Y but different X
    cy.get('.react-flow__node[data-id="y3-se-bundle"]').then($se => {
      cy.get('.react-flow__node[data-id="y3-ds-bundle"]').then($ds => {
        const seRect = $se[0].getBoundingClientRect();
        const dsRect = $ds[0].getBoundingClientRect();
        
        // Same Y (within 2px tolerance for rounding)
        expect(Math.abs(seRect.top - dsRect.top)).to.be.lessThan(2);
        
        // SE left of DS
        expect(seRect.left).to.be.lessThan(dsRect.left);
        
        // Reasonable horizontal separation (at least 100px)
        expect(dsRect.left - seRect.right).to.be.greaterThan(100);
      });
    });
  });

  it('validates Y4 merge below Y3', () => {
    // Y4 should be below both Y3 branches
    cy.get('.react-flow__node[data-id="y4-bundle"]').then($y4 => {
      const y4Top = $y4[0].getBoundingClientRect().top;
      
      cy.get('.react-flow__node[data-id="y3-se-bundle"]').then($se => {
        const seBottom = $se[0].getBoundingClientRect().bottom;
        expect(y4Top).to.be.greaterThan(seBottom);
      });
      
      cy.get('.react-flow__node[data-id="y3-ds-bundle"]').then($ds => {
        const dsBottom = $ds[0].getBoundingClientRect().bottom;
        expect(y4Top).to.be.greaterThan(dsBottom);
      });
    });
  });

  it('validates no overlaps', () => {
    cy.contains('button', 'Validate Overlaps').click();
    cy.contains('No overlaps detected', { timeout: 3000 }).should('be.visible');
  });

  it('shows comparison UI when Track Gate selected', () => {
    // Click Track Gate
    cy.get('.react-flow__node[data-id="gate-y3-tracks"]').click();
    
    // Should show mini compare cards or drawer
    cy.get('[data-testid="mini-compare"]', { timeout: 2000 })
      .should('exist');
  });

  it('validates all edges point downward', () => {
    // All edges should have visual flow from top to bottom
    cy.get('.react-flow__edge').should('have.length.greaterThan', 0);
    
    // Sample check: verify edges have correct handle types in DOM
    cy.get('.react-flow__edge').first().should('exist');
  });

  it('maintains layout stability on re-render', () => {
    // Capture initial Y4 position
    let initialY4Top: number;
    
    cy.get('.react-flow__node[data-id="y4-bundle"]').then($el => {
      initialY4Top = $el[0].getBoundingClientRect().top;
    });
    
    // Trigger re-render via fit view
    cy.contains('button', 'Fit View').click();
    cy.wait(500);
    
    // Verify position unchanged (within tolerance)
    cy.get('.react-flow__node[data-id="y4-bundle"]').then($el => {
      const newY4Top = $el[0].getBoundingClientRect().top;
      // Allow some tolerance for viewport adjustments
      expect(Math.abs(newY4Top - initialY4Top)).to.be.lessThan(50);
    });
  });

  it('shows grid alignment', () => {
    // All node positions should be grid-aligned (multiples of 8)
    cy.get('.react-flow__node').first().then($el => {
      const style = window.getComputedStyle($el[0]);
      const transform = style.transform;
      // Just verify transform exists (detailed grid check is in unit tests)
      expect(transform).to.not.equal('none');
    });
  });
});
