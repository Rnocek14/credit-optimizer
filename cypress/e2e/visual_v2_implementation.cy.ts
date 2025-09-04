const pathUrl = '/skilltree3?audit=1';

describe('Visual V2 — tiers + routing + labels', () => {
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

  it('tiers non-zero & no through-node', () => {
    runScan().then(r => {
      expect(r.tiers.edgeOn).to.be.greaterThan(0);
      expect(r.tiers.edgeRelated).to.be.greaterThan(0);
      expect(r.tiers.edgeOff).to.be.greaterThan(0);

      const through = (r.issues||[]).filter((i:any)=>i.type==='EDGE_THROUGH_NODE');
      const overlaps = (r.issues||[]).filter((i:any)=>i.type==='NODE_OVERLAP');
      const crossings = (r.issues||[]).filter((i:any)=>i.type==='EDGE_CROSSING');

      expect(through.length, 'edges through nodes == 0').to.equal(0);
      expect(overlaps.length, 'node overlaps <= 2').to.be.at.most(2);
      expect(crossings.length, 'edge crossings <= 2').to.be.at.most(2);
    });
  });

  it('transfer edges have labels', () => {
    runScan().then(r => {
      const missing = (r.issues||[]).filter((i:any)=>i.type==='MISSING_LABEL');
      expect(missing.length, 'no missing transfer labels').to.equal(0);
    });
  });
});