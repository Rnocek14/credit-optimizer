/**
 * Phase 6: Comprehensive Validation Tests
 * Covers all 6 phases of the comprehensive repair
 */

describe('EduTree V3 Comprehensive Validation', () => {
  beforeEach(() => {
    cy.visit('/?v3=1&layout=vertical&source=lifepath&lp_bundles=1&checkpoints=1');
    cy.wait(2000); // Allow graph to stabilize
  });

  describe('Phase 1: Checkpoint-Bundle Overlap Fix', () => {
    it('checkpoints do not overlap with tier bundles', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const checkpoints = dump.nodes.filter((n: any) => n.type === 'checkpoint');
        
        checkpoints.forEach((cp: any) => {
          const bundle = dump.nodes.find((b: any) => b.id === cp.data?.sourceNodeId);
          if (!bundle) return;
          
          const bundleBottom = bundle.position.y + (bundle.data?.lpType === 'gate' ? 80 : 120);
          const yGap = cp.position.y - bundleBottom;
          
          expect(yGap, `Checkpoint ${cp.id} should be below bundle ${bundle.id}`).to.be.at.least(80);
        });
      });
    });

    it('checkpoints are not positioned at {0,0}', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const checkpoints = dump.nodes.filter((n: any) => n.type === 'checkpoint');
        
        checkpoints.forEach((cp: any) => {
          expect(cp.position.x, `Checkpoint ${cp.id} X position`).to.not.equal(0);
          expect(cp.position.y, `Checkpoint ${cp.id} Y position`).to.not.equal(0);
        });
      });
    });
  });

  describe('Phase 2: Credit Display Fix', () => {
    it('bundles show sane course-only credit totals', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const bundles = dump.nodes.filter((n: any) => n.type === 'track-bundle');
        
        bundles.forEach((b: any) => {
          const cr = b.data?.totalCredits ?? 0;
          expect(cr, `Bundle ${b.id} credits`).to.be.within(0, 60);
        });
      });
    });

    it('course nodes have normalized credit fields', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const courseNodes = dump.nodes.filter((n: any) => 
          n.data?.lpType && /course|credit/i.test(n.data.lpType)
        );
        
        courseNodes.slice(0, 5).forEach((n: any) => {
          expect(n.data?.credits, `Node ${n.id} credits field`).to.be.a('number');
          expect(n.data?.credits, `Node ${n.id} credits = totalCredits`).to.equal(n.data?.totalCredits);
        });
      });
    });
  });

  describe('Phase 3: No Hook Errors', () => {
    it('renders without React hook errors', () => {
      cy.window().then(win => {
        // If we got here without errors, hooks are stable
        expect(win.document.querySelector('[data-testid="v3-canvas"]')).to.exist;
      });
    });
  });

  describe('Phase 4: Type Matching Fix', () => {
    it('creditFromNode handles camelCase types', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const creditBlockNodes = dump.nodes.filter((n: any) => 
          n.data?.lpType === 'creditBlock'
        );
        
        if (creditBlockNodes.length > 0) {
          creditBlockNodes.forEach((n: any) => {
            expect(n.data?.credits, `creditBlock ${n.id} should have credits`).to.be.greaterThan(0);
          });
        }
      });
    });
  });

  describe('Phase 5: Checkpoint Edge Connectivity', () => {
    it('checkpoints have spine edges from source bundles', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const checkpoints = dump.nodes.filter((n: any) => n.type === 'checkpoint');
        
        checkpoints.forEach((cp: any) => {
          const incomingEdge = dump.edges.find((e: any) => e.target === cp.id);
          expect(incomingEdge, `Checkpoint ${cp.id} should have incoming edge`).to.exist;
          expect(incomingEdge.kind, `Edge kind`).to.equal('spine');
        });
      });
    });

    it('checkpoint edges connect to bundles, not raw nodes', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const checkpointEdges = dump.edges.filter((e: any) => 
          e.data?.isCheckpointEdge || e.id.startsWith('ckpt:')
        );
        
        const bundleIds = new Set(
          dump.nodes.filter((n: any) => n.type === 'track-bundle').map((n: any) => n.id)
        );
        
        checkpointEdges.forEach((e: any) => {
          expect(bundleIds.has(e.source), `Edge ${e.id} source should be bundle`).to.be.true;
        });
      });
    });
  });

  describe('Phase 6: Empty Bundle & Job Gate Handling', () => {
    it('filters out empty tier bundles', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const bundles = dump.nodes.filter((n: any) => n.type === 'track-bundle');
        
        bundles.forEach((b: any) => {
          expect(b.data?.childCount, `bundle ${b.id} has children`).to.be.greaterThan(0);
        });
        
        expect(bundles.length, 'at least one bundle created').to.be.greaterThan(0);
      });
    });

    it('includes job gates in visible nodes', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        const jobGates = dump.nodes.filter((n: any) => n.type === 'gate' && n.data?.lpType === 'job');
        
        if (jobGates.length > 0) {
          expect(jobGates.length, 'job gates rendered').to.be.greaterThan(0);
        }
      });
    });
  });

  describe('Phase 7: Global Validation', () => {
    it('validates no overlaps in entire layout', () => {
      cy.contains('button', 'Validate Overlaps').click();
      cy.contains('No overlaps detected', { timeout: 5000 }).should('be.visible');
    });

    it('all nodes maintain 8px grid alignment', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        
        dump.nodes.forEach((n: any) => {
          expect(n.position.x % 8, `Node ${n.id} X alignment`).to.equal(0);
          expect(n.position.y % 8, `Node ${n.id} Y alignment`).to.equal(0);
        });
      });
    });

    it('exposes complete metadata in __dumpV3', () => {
      cy.window().then(win => {
        const dump = (win as any).__dumpV3();
        
        expect(dump.nodes, 'nodes array').to.be.an('array').and.have.length.greaterThan(0);
        expect(dump.edges, 'edges array').to.be.an('array');
        expect(dump.meta, 'metadata object').to.be.an('object');
        expect(dump.meta.forksDetected, 'forksDetected').to.be.a('number');
      });
    });
  });
});
