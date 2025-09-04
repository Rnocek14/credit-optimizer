// V2: Validation tests for the surgical fixes to Visual V2 system
const pathUrl = '/skilltree3?audit=1';

describe('Visual V2 — Post-Fix Validation', () => {
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

  it('V2: Tier classes present in DOM and scanner detects them', () => {
    // Check for tier classes in DOM
    cy.get('body').then($body => {
      const hasTierClasses = $body.find('.lp-edge-on-path, .lp-edge-related, .lp-edge-off-path, [data-tier]').length > 0;
      expect(hasTierClasses, 'tier classes in DOM').to.be.true;
    });

    runScan().then(report => {
      // V2: Scanner should detect non-zero tiers with enhanced detection
      expect(report.tiers.edgeOn, 'on-path edges detected').to.be.greaterThan(0);
      expect(report.tiers.edgeRelated, 'related edges detected').to.be.greaterThan(0);
      expect(report.tiers.edgeOff, 'off-path edges detected').to.be.greaterThan(0);
    });
  });

  it('V2: Routing improvements eliminate edge-through-node issues', () => {
    runScan().then(report => {
      const throughIssues = report.issues.filter((i: any) => i.type === 'EDGE_THROUGH_NODE');
      expect(throughIssues.length, 'edges through nodes eliminated').to.equal(0);
    });
  });

  it('V2: Transfer labels always rendered', () => {
    runScan().then(report => {
      // Check DOM for transfer labels
      cy.get('[data-testid="lp-edge-label"]').should('have.length.greaterThan', 0);
      
      // No missing label issues
      const missingLabels = report.issues.filter((i: any) => i.type === 'MISSING_LABEL');
      expect(missingLabels.length, 'no missing transfer labels').to.equal(0);
      
      // Positive label count
      expect(report.counts.labels, 'transfer labels present').to.be.greaterThan(0);
    });
  });

  it('V2: Quality gates met across all presets', () => {
    ['fastest', 'cheapest', 'creditMaximized', 'balanced'].forEach(preset => {
      cy.get(`[data-testid="lp-preset-${preset}"]`).click();
      cy.wait(400);

      runScan().then(report => {
        // Tier detection working
        expect(report.tiers.edgeOn + report.tiers.edgeRelated + report.tiers.edgeOff)
          .to.be.greaterThan(0, `${preset}: tier detection active`);

        // Quality constraints
        const overlaps = report.issues.filter((i: any) => i.type === 'NODE_OVERLAP');
        const crossings = report.issues.filter((i: any) => i.type === 'EDGE_CROSSING');
        const throughNodes = report.issues.filter((i: any) => i.type === 'EDGE_THROUGH_NODE');

        expect(overlaps.length, `${preset}: node overlaps ≤ 2`).to.be.at.most(2);
        expect(crossings.length, `${preset}: edge crossings ≤ 2`).to.be.at.most(2);
        expect(throughNodes.length, `${preset}: no edges through nodes`).to.equal(0);
      });
    });
  });

  it('V2: Visual Scanner independent and always available in dev', () => {
    // Scanner should be visible in DEV mode
    cy.contains('Visual Scanner').should('be.visible');
    cy.contains('Development Tool').should('be.visible');
    
    // Scanner should show tier summary
    cy.contains('Run Visual Scan').click();
    cy.contains('V2 Tiers').should('be.visible');
    cy.contains('On-Path:').should('be.visible');
    cy.contains('Related:').should('be.visible');
    cy.contains('Off-Path:').should('be.visible');
  });
});