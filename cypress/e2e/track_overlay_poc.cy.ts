describe('TrackOverlayPOC smoke', () => {
  it('renders with highlight classes on edges', () => {
    cy.visit('/sandbox/track-overlay');

    // Enable comparison if checkbox exists
    cy.contains('Enable comparison').find('input[type="checkbox"]').check({ force: true });

    // Pick tracks via testids
    cy.get('[data-testid="primary-track"]').select('Software Engineering');
    cy.get('[data-testid="comparison-track"]').select('Data Science');

    // Sample several frames to account for any animations
    const sample = () =>
      cy.get('.react-flow__edge').each(($e) => {
        const cls = $e.attr('class') || '';
        expect(cls).to.match(/edge--(primary|comparison|both)/);
      });

    sample();
    cy.wait(250); sample();
    cy.wait(250); sample();
  });
});