describe('EduTree multipath overlay', () => {
  it('applies highlight classes and path styles on main page', () => {
    cy.visit('/edu-tree?eduTreeMultiPathOverlay=true');

    // Wait for canvas to load
    cy.get('.react-flow__renderer').should('be.visible');

    // Enable comparison if checkbox exists
    cy.contains('Enable comparison').find('input[type="checkbox"]').check({ force: true });

    // Pick tracks via testids
    cy.get('[data-testid="primary-track"]').select('Software Engineering');
    cy.get('[data-testid="comparison-track"]').select('Data Science');

    // Sample several frames to account for any animations
    const sample = () => {
      cy.get('.react-flow__edge')
        .should('have.length.greaterThan', 0)
        .each($edge => {
          const cls = $edge.attr('class') || '';
          expect(cls).to.match(/edge--(primary|comparison|both|dim)/);

          // path element should exist and have a stroke
          cy.wrap($edge).find('.react-flow__edge-path')
            .should('exist')
            .and($p => {
              const stroke = $p.css('stroke');
              expect(stroke, 'stroke color set').to.be.ok;
            });
        });
    };

    sample();
    cy.wait(250); sample();
    cy.wait(250); sample();
  });

  it('works without comparison mode', () => {
    cy.visit('/edu-tree?eduTreeMultiPathOverlay=true');

    // Wait for canvas to load
    cy.get('.react-flow__renderer').should('be.visible');

    // Should work without comparison enabled
    cy.get('.react-flow__edge')
      .should('have.length.greaterThan', 0)
      .each($edge => {
        cy.wrap($edge).find('.react-flow__edge-path')
          .should('exist')
          .and($p => {
            const stroke = $p.css('stroke');
            expect(stroke, 'stroke color set').to.be.ok;
          });
      });
  });

    it('works with URL parameters for state persistence', () => {
      cy.visit('/edu-tree?eduTreeMultiPathOverlay=true&primary=se&comparison=ds&cmp=1');

      // Wait for canvas to load
      cy.get('.react-flow__renderer').should('be.visible');

      // Verify URL params are applied correctly
      cy.get('[data-testid="primary-track"]').should('have.value', 'Software Engineering');
      cy.get('[data-testid="comparison-track"]').should('have.value', 'Data Science');
      cy.contains('Enable comparison').find('input[type="checkbox"]').should('be.checked');

      // Verify edge styling is applied
      cy.get('.react-flow__edge')
        .should('have.length.greaterThan', 0)
        .each($edge => {
          const cls = $edge.attr('class') || '';
          expect(cls).to.match(/edge--(primary|comparison|both|dim)/);

          cy.wrap($edge).find('.react-flow__edge-path')
            .should('exist')
            .and($p => {
              const stroke = $p.css('stroke');
              expect(stroke, 'stroke color set').to.be.ok;
            });
        });
    });

    it('gracefully handles flag disabled', () => {
    cy.visit('/edu-tree?eduTreeMultiPathOverlay=false');

    // Should still render the canvas without overlay UI
    cy.get('.react-flow__renderer').should('be.visible');
    
    // Track selector should not be visible
    cy.contains('Enable comparison').should('not.exist');
  });
});