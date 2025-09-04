// cypress/e2e/skilltree3_visual_scan.cy.ts
// Fails build if overlaps/crossings exceed thresholds.

const pathUrl = '/skilltree3?audit=1';

const q = {
  node: '[data-testid="lp-node"]',
  edgeLabel: '[data-testid="lp-edge-label"]',
  edgeOn: '.lp-edge-on-path',
  edgeRelated: '.lp-edge-related',
  edgeOff: '.lp-edge-off-path',
  step: '[data-testid="lp-step-badge"]',
  preset: (k: string) => `[data-testid="lp-preset-${k}"]`,
};

describe('Life Path — Visual Scan Quality Gates', () => {
  beforeEach(() => {
    cy.window().then(win => { try { win.localStorage.setItem('LP_VISUAL_V2','1'); } catch {} });
    cy.visit(pathUrl);
    cy.get('[data-testid="lp-node"]', { timeout: 12000 }).should('have.length.greaterThan', 5);
  });

  function runPanelScan() {
    // assumes the Visual Scanner button exists in the Audit Panel
    cy.contains('Run Visual Scan').click();
    cy.contains('Run Visual Scan').should('not.contain', 'Scanning…'); // wait to finish
    return cy.contains('counts', { timeout: 8000 }); // JSON visible
  }

  ['fastest','cheapest','creditMaximized','balanced'].forEach(preset => {
    it(`Preset ${preset}: tiers + labels + low overlaps`, () => {
      cy.get(`[data-testid="lp-preset-${preset}"]`).click();
      cy.wait(400);

      runPanelScan();

      cy.get('pre').last().invoke('text').then(JSON.parse).then((report: any) => {
        // Tier detection (main fix target)
        expect(report.tiers.edgeOn, 'on-path edges detected').to.be.greaterThan(0);
        expect(report.tiers.edgeRelated, 'related edges detected').to.be.greaterThan(0);
        expect(report.tiers.edgeOff, 'off-path edges detected').to.be.greaterThan(0);
        expect(report.counts.labels, 'transfer labels present').to.be.greaterThan(0);

        // Quality gates
        const overlaps = (report.issues || []).filter((i:any)=>i.type==='NODE_OVERLAP');
        const crossings = (report.issues || []).filter((i:any)=>i.type==='EDGE_CROSSING');
        const through = (report.issues || []).filter((i:any)=>i.type==='EDGE_THROUGH_NODE');

        expect(overlaps.length, 'node overlaps <= 2').to.be.at.most(2);
        expect(crossings.length, 'edge crossings <= 2').to.be.at.most(2);
        expect(through.length, 'edges through nodes == 0').to.equal(0);

        // career connectivity sanity
        (report.careers || []).forEach((c:any)=>{
          expect(c.pathNodes.length, `${c.careerLabel} has path nodes`).to.be.greaterThan(0);
        });
      });
    });
  });
});