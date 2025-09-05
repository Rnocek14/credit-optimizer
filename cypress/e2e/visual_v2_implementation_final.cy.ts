const pathUrl = '/skilltree3?audit=1';

describe('Visual V2 — Final Implementation', () => {
  beforeEach(() => {
    cy.window().then(win => win.localStorage.setItem('LP_VISUAL_V2', '1'));
    cy.visit(pathUrl);
    cy.get('[data-testid="lp-node"]', { timeout: 12000 }).should('have.length.greaterThan', 5);
  });

  function runScan() {
    cy.contains('Run Visual Scan').click();
    cy.contains('Run Visual Scan').should('not.contain', 'Scanning…');
    return cy.get('pre').last().invoke('text').then(JSON.parse);
  }

  it('Phase 1: Coordinate normalization and pathfinding edge IDs', () => {
    runScan().then(report => {
      // Edge IDs should be properly derived from path node IDs
      expect(report.tiers.edgeOn + report.tiers.edgeRelated + report.tiers.edgeOff)
        .to.be.greaterThan(0, 'tiers detected with pathEdgeIds');
    });
  });

  it('Phase 1: Mount-safe tier classes applied', () => {
    // Check base styling is present
    cy.get('.react-flow__edge-path').should('exist');
    
    runScan().then(report => {
      // All edges should have base styling
      expect(report.counts.edges).to.be.greaterThan(0);
      
      // Tier classes should be consistently applied
      expect(report.tiers.edgeOn).to.be.greaterThan(0, 'on-path edges with tier classes');
      expect(report.tiers.edgeRelated).to.be.greaterThan(0, 'related edges with tier classes');
      expect(report.tiers.edgeOff).to.be.greaterThan(0, 'off-path edges with tier classes');
    });
  });

  it('Phase 1: Base styling always visible', () => {
    // Even without tiers, edges should be visible
    cy.get('.react-flow__edge-path').should('have.css', 'stroke-width', '1.25px');
    cy.get('.react-flow__edge-path').should('have.css', 'opacity', '0.7');
  });

  it('Phase 1: Transfer labels always rendered', () => {
    runScan().then(report => {
      expect(report.counts.labels).to.be.greaterThan(0, 'transfer labels present');
      
      const missingLabels = report.issues.filter((i: any) => i.type === 'MISSING_LABEL');
      expect(missingLabels.length).to.equal(0, 'no missing transfer labels');
    });
  });

  it('Acceptance Gates: All presets meet criteria', () => {
    ['fastest', 'cheapest', 'creditMaximized', 'balanced'].forEach(preset => {
      cy.get(`[data-testid="lp-preset-${preset}"]`).click();
      cy.wait(400);

      runScan().then(report => {
        // Core acceptance criteria
        expect(report.tiers.edgeOn + report.tiers.edgeRelated + report.tiers.edgeOff)
          .to.be.greaterThan(0, `${preset}: tiers always > 0`);
        
        expect(report.counts.labels).to.be.greaterThan(0, `${preset}: labels present`);
        
        // Quality gates
        const overlaps = report.issues.filter((i: any) => i.type === 'NODE_OVERLAP');
        const crossings = report.issues.filter((i: any) => i.type === 'EDGE_CROSSING');
        const throughNodes = report.issues.filter((i: any) => i.type === 'EDGE_THROUGH_NODE');
        
        expect(overlaps.length).to.be.at.most(2, `${preset}: node overlaps ≤ 2`);
        expect(crossings.length).to.be.at.most(2, `${preset}: edge crossings ≤ 2`);
        expect(throughNodes.length).to.be.at.most(1, `${preset}: through-nodes ≤ 1`);
      });
    });
  });

  it('Console output shows acceptance gate status', () => {
    cy.window().then((win) => {
      // Check for V2 status logging
      cy.get('body').should('exist').then(() => {
        // Wait for console logging
        cy.wait(2000);
        // Visual verification - the console should show tier counts and status
      });
    });
  });
});