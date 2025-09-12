describe('TrackOverlayPOC smoke', () => {
  it('applies highlight classes and path styles', () => {
    cy.visit('/sandbox/track-overlay');

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
});