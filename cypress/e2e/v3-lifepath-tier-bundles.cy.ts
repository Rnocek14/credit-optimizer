describe('EduTree V3 LifePath Tier Bundles', () => {
  beforeEach(() => {
    cy.visit('/?v3=1&layout=vertical&source=lifepath&lp_bundles=1');
    cy.wait(2000);
  });

  it('positions many tier bundle nodes correctly', () => {
    cy.window().then(win => {
      const dump = (win as any).__dumpV3();
      expect(dump).to.exist;
      
      const bundles = dump.nodes.filter((n: any) => n.type === 'track-bundle' && n.data?.lpType === 'tier-bundle');
      expect(bundles.length).to.be.greaterThan(2);
      
      // All bundles should have non-zero positions
      bundles.forEach((bundle: any) => {
        expect(bundle.position.x).to.be.greaterThan(0);
        expect(bundle.position.y).to.be.greaterThan(0);
      });
    });
  });

  it('positions two job gates symmetrically at final tier', () => {
    cy.window().then(win => {
      const dump = (win as any).__dumpV3();
      const gates = dump.nodes.filter((n: any) => n.type === 'gate' && n.data?.lpType === 'job');
      
      expect(gates.length).to.equal(2);
      
      const centerX = 680;
      const spacing = 320;
      const expectedX1 = centerX - spacing / 2;  // 520
      const expectedX2 = centerX + spacing / 2;  // 840
      
      // Allow 8px grid tolerance
      expect(gates[0].position.x).to.be.closeTo(expectedX1, 8);
      expect(gates[1].position.x).to.be.closeTo(expectedX2, 8);
      expect(gates[0].position.y).to.equal(gates[1].position.y);
    });
  });

  it('positions checkpoints below their source nodes', () => {
    cy.window().then(win => {
      const dump = (win as any).__dumpV3();
      const checkpoints = dump.nodes.filter((n: any) => n.type === 'checkpoint');
      
      if (checkpoints.length > 0) {
        checkpoints.forEach((cp: any) => {
          const sourceId = cp.data?.sourceNodeId;
          const source = dump.nodes.find((n: any) => n.id === sourceId);
          
          if (source) {
            // Checkpoint should be below source (higher Y value)
            expect(cp.position.y).to.be.greaterThan(source.position.y);
            // Should be horizontally aligned with source
            expect(cp.position.x).to.equal(source.position.x);
          }
        });
      }
    });
  });

  it('validates no overlaps in tier layout', () => {
    cy.contains('Validate Overlaps').click();
    cy.contains('No overlaps', { timeout: 2000 }).should('be.visible');
  });

  it('displays tier metadata in bundle nodes', () => {
    cy.get('[data-id]').should('exist');
    cy.contains(/Tier \d/).should('exist');
    cy.contains(/\d+ courses • \d+ credits/).should('exist');
  });

  it('renders chevron icon on collapsed bundles', () => {
    cy.get('button[title="Expand"]').first().within(() => {
      cy.get('svg').should('exist'); // ChevronDown icon
    });
  });
});
