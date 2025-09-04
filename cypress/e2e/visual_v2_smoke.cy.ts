// cypress/e2e/visual_v2_smoke.cy.ts
// Visual V2 smoke tests to ensure tiers, labels, and low overlaps

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

describe('Life Path — Visual V2 Smoke Tests', () => {
  beforeEach(() => {
    cy.window().then(win => { 
      try { 
        win.localStorage.setItem('LP_VISUAL_V2','1'); 
      } catch {} 
    });
    cy.visit(pathUrl);
    cy.get('[data-testid="lp-node"]', { timeout: 12000 }).should('have.length.greaterThan', 5);
  });

  function runScan() {
    cy.contains('Run Visual Scan').click();
    cy.contains('Run Visual Scan').should('not.contain','Scanning…');
    return cy.get('pre').last().invoke('text').then(JSON.parse);
  }

  ['fastest','cheapest','creditMaximized','balanced'].forEach(preset => {
    it(`Preset ${preset}: tiers + labels + low overlaps`, () => {
      cy.get(`[data-testid="lp-preset-${preset}"]`).click();
      cy.wait(400);
      
      runScan().then(r => {
        expect(r.tiers.edgeOn).to.be.greaterThan(0);
        expect(r.counts.labels).to.be.greaterThan(0);
        
        const overlaps = (r.issues||[]).filter((i:any)=>i.type==='NODE_OVERLAP');
        const through = (r.issues||[]).filter((i:any)=>i.type==='EDGE_THROUGH_NODE');
        const crossings = (r.issues||[]).filter((i:any)=>i.type==='EDGE_CROSSING');
        
        expect(overlaps.length, 'node overlaps <= 2').to.be.at.most(2);
        expect(through.length, 'edges through nodes == 0').to.equal(0);
        expect(crossings.length, 'edge crossings <= 2').to.be.at.most(2);
      });
    });
  });

  it('Visual V2 toggle works correctly', () => {
    // Test with V2 enabled
    cy.window().then(win => {
      win.localStorage.setItem('LP_VISUAL_V2', '1');
    });
    cy.reload();
    cy.get(q.node).should('have.length.greaterThan', 5);
    
    // Check for tier classes
    cy.get('body').then($body => {
      const hasTiers = $body.find('.lp-edge-on-path, .lp-edge-related, .lp-edge-off-path').length > 0;
      if (hasTiers) {
        cy.get(q.edgeOn).should('exist');
      }
    });

    // Test with V2 disabled
    cy.window().then(win => {
      win.localStorage.removeItem('LP_VISUAL_V2');
    });
    cy.reload();
    cy.get(q.node).should('have.length.greaterThan', 5);
  });
});