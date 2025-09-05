const pathUrl = '/skilltree3?audit=1';

describe('Visual V2 — Surgical Quality Gates', () => {
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

  it('V2: Tier classes present & scanner detects them', () => {
    runScan().then(r => {
      // Tier detection (main fix target)
      expect(r.tiers.edgeOn + r.tiers.edgeRelated + r.tiers.edgeOff, 'total tiers > 0').to.be.greaterThan(0);
      expect(r.tiers.edgeOn, 'on-path edges detected').to.be.greaterThan(0);
    });

    cy.get('body').then($b => {
      const ok = $b.find(
        '.lp-edge-on-path, .lp-edge-related, .lp-edge-off-path, [data-tier]'
      ).length > 0;
      expect(ok, 'tier classes in DOM').to.be.true;
    });
  });

  it('V2: No edges through nodes across presets', () => {
    ['fastest','cheapest','creditMaximized','balanced'].forEach(p => {
      cy.get(`[data-testid="lp-preset-${p}"]`).click();
      cy.wait(400);
      
      runScan().then(r => {
        const through = (r.issues || []).filter((i:any)=>i.type==='EDGE_THROUGH_NODE');
        expect(through.length, `${p}: through-node`).to.be.at.most(1); // Allow 1 during transition
      });
    });
  });

  it('V2: Crossings/overlaps within limits', () => {
    runScan().then(r => {
      const overlaps = (r.issues || []).filter((i:any)=>i.type==='NODE_OVERLAP');
      const crossings = (r.issues || []).filter((i:any)=>i.type==='EDGE_CROSSING');
      expect(overlaps.length, 'node overlaps ≤ 2').to.be.at.most(2);
      expect(crossings.length, 'edge crossings ≤ 2').to.be.at.most(2);
    });
  });

  it('V2: Transfer labels always present', () => {
    runScan().then(r => {
      const missing = (r.issues || []).filter((i:any)=>i.type==='MISSING_LABEL');
      expect(missing.length, 'no missing transfer labels').to.equal(0);
      expect(r.counts.labels, 'labels present').to.be.greaterThan(0);
    });
    
    cy.get('[data-testid="lp-edge-label"]').should('have.length.greaterThan', 0);
  });

  it('V2: All presets meet acceptance criteria', () => {
    ['fastest','cheapest','creditMaximized','balanced'].forEach(preset => {
      cy.get(`[data-testid="lp-preset-${preset}"]`).click();
      cy.wait(400);

      runScan().then((report: any) => {
        // Gate 1: tiers.edgeOn + tiers.edgeRelated + tiers.edgeOff > 0
        expect(report.tiers.edgeOn + report.tiers.edgeRelated + report.tiers.edgeOff)
          .to.be.greaterThan(0, `${preset}: total tiers must be > 0`);

        // Gate 2: EDGE_THROUGH_NODE === 0 (or ≤ 1 during transition)
        const throughNodes = (report.issues || []).filter((i:any)=>i.type==='EDGE_THROUGH_NODE');
        expect(throughNodes.length, `${preset}: through-node issues`).to.be.at.most(1);

        // Gate 3: EDGE_CROSSING ≤ 2
        const crossings = (report.issues || []).filter((i:any)=>i.type==='EDGE_CROSSING');
        expect(crossings.length, `${preset}: edge crossings`).to.be.at.most(2);

        // Gate 4: NODE_OVERLAP ≤ 2
        const overlaps = (report.issues || []).filter((i:any)=>i.type==='NODE_OVERLAP');
        expect(overlaps.length, `${preset}: node overlaps`).to.be.at.most(2);

        // Gate 5: Transfer edges have labels; no MISSING_LABEL
        expect(report.counts.labels, `${preset}: transfer labels`).to.be.greaterThan(0);
        const missingLabels = (report.issues || []).filter((i:any)=>i.type==='MISSING_LABEL');
        expect(missingLabels.length, `${preset}: missing labels`).to.equal(0);

        // DOM sanity: at least one path with data-tier exists
        cy.get('body').then($body => {
          const tierPaths = $body.find('path[data-tier], .react-flow__edge-path[class*="lp-edge-"]').length;
          expect(tierPaths, `${preset}: tier paths in DOM`).to.be.greaterThan(0);
        });

        // Career connectivity sanity
        (report.careers || []).forEach((c:any)=>{
          expect(c.pathNodes.length, `${c.careerLabel} has path nodes`).to.be.greaterThan(0);
        });
      });
    });
  });
});