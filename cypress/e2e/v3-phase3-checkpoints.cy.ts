/**
 * Phase 3: Checkpoint Node Tests
 * 
 * Validates that checkpoint nodes are injected correctly at fork points
 * and respect the feature flag gating.
 */

describe('EduTree V3 - Phase 3: Checkpoint Nodes', () => {
  describe('Feature flag gating', () => {
    it('should NOT render checkpoints without ?checkpoints=1 flag', () => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath');
      cy.wait(500);

      // Verify no checkpoint nodes exist
      cy.get('[data-id^="checkpoint-"]').should('not.exist');
      
      cy.log('✅ No checkpoints rendered without flag');
    });

    it('should render checkpoints WITH ?checkpoints=1 flag', () => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath&checkpoints=1');
      cy.wait(500);

      // Verify checkpoint nodes are present
      cy.get('[data-id^="checkpoint-"]').should('exist');
      
      cy.log('✅ Checkpoints rendered with flag enabled');
    });
  });

  describe('Checkpoint node rendering', () => {
    beforeEach(() => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath&checkpoints=1');
      cy.wait(500);
    });

    it('should render at least one checkpoint when alternatives exist', () => {
      cy.get('[data-id^="checkpoint-"]').should('have.length.at.least', 1);
    });

    it('should display alternative count in checkpoint UI', () => {
      cy.get('[data-id^="checkpoint-"]').first().within(() => {
        // Check for alternative count text (e.g., "2 alternatives available")
        cy.contains(/\d+ alternative/i).should('be.visible');
      });
    });

    it('should be clickable and log interaction', () => {
      cy.window().then((win) => {
        cy.spy(win.console, 'log').as('consoleLog');
      });

      cy.get('[data-id^="checkpoint-"]').first().click();

      // Verify console log was called with checkpoint click info
      cy.get('@consoleLog').should('have.been.calledWith', 
        Cypress.sinon.match(/\[Checkpoint\] Clicked/)
      );
    });
  });

  describe('Grid alignment', () => {
    beforeEach(() => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath&checkpoints=1');
      cy.wait(500);
    });

    it('should maintain 8px grid alignment with checkpoints', () => {
      cy.get('[data-id^="checkpoint-"]').each(($checkpoint) => {
        const transform = $checkpoint.css('transform');
        
        // Extract x and y from transform matrix
        const match = transform.match(/matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/);
        
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          
          // Verify both x and y are multiples of 8
          expect(x % 8).to.equal(0, `X position ${x} is not 8px aligned`);
          expect(y % 8).to.equal(0, `Y position ${y} is not 8px aligned`);
        }
      });
      
      cy.log('✅ All checkpoints are 8px grid-aligned');
    });
  });

  describe('Edge connectivity', () => {
    beforeEach(() => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath&checkpoints=1');
      cy.wait(500);
    });

    it('should have spine edge connecting source to checkpoint', () => {
      // Count checkpoint nodes
      cy.get('[data-id^="checkpoint-"]').then(($checkpoints) => {
        const checkpointCount = $checkpoints.length;
        
        // Verify at least one edge exists per checkpoint
        // (Each checkpoint should have at least one incoming spine edge)
        cy.get('.react-flow__edge').should('have.length.at.least', checkpointCount);
      });
    });
  });

  describe('Dev validation', () => {
    beforeEach(() => {
      cy.visit('/edu-tree-v3-vertical?source=lifepath&checkpoints=1');
      cy.wait(500);
    });

    it('should pass overlap validation with checkpoints', () => {
      // Click "Validate Overlaps" button
      cy.contains('button', /validate overlaps/i).click();
      
      // Verify no overlaps detected
      cy.contains(/0 overlaps/i, { timeout: 5000 }).should('be.visible');
      
      cy.log('✅ No overlaps detected with checkpoints');
    });

    it('should expose checkpoint nodes in __dumpV3()', () => {
      cy.window().then((win) => {
        const dump = (win as any).__dumpV3?.();
        
        expect(dump).to.exist;
        expect(dump.nodes).to.exist;
        
        // Find at least one checkpoint node in the dump
        const checkpointNodes = dump.nodes.filter((n: any) => n.type === 'checkpoint');
        expect(checkpointNodes.length).to.be.at.least(1);
        
        // Verify checkpoint data structure
        const checkpoint = checkpointNodes[0];
        expect(checkpoint.data.alternativeCount).to.be.a('number');
        expect(checkpoint.data.sourceNodeId).to.be.a('string');
        
        cy.log(`✅ Found ${checkpointNodes.length} checkpoint nodes in __dumpV3()`);
      });
    });
  });
});
