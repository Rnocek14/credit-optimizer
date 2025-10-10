describe('EduTree V3 - Alternative Selection Flow', () => {
  beforeEach(() => {
    cy.visit('/?v3=1&layout=vertical&checkpoints=1&source=lifepath');
    cy.get('.react-flow__renderer', { timeout: 15000 }).should('be.visible');
    cy.wait(1000); // Let graph stabilize
  });

  it('renders checkpoint nodes when flag enabled', () => {
    cy.get('[data-node-type="checkpoint"]').should('have.length.at.least', 1);
    cy.log('✅ Checkpoint nodes rendered');
  });

  it('opens drawer when checkpoint clicked', () => {
    cy.get('[data-node-type="checkpoint"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Choose Your Path').should('be.visible');
    cy.log('✅ Drawer opens on checkpoint click');
  });

  it('displays ranked alternatives with metadata', () => {
    cy.get('[data-node-type="checkpoint"]').first().click();
    
    cy.get('[data-testid="alternative-card"]').should('have.length.at.least', 1);
    
    // Check for alternative metadata
    cy.get('[data-testid="alternative-card"]').first().within(() => {
      cy.contains(/credits/i).should('be.visible');
      cy.contains(/hours/i).should('be.visible');
    });
    
    cy.log('✅ Alternatives display with metadata');
  });

  it('closes drawer on ESC key', () => {
    cy.get('[data-node-type="checkpoint"]').first().click();
    cy.get('[role="dialog"]').should('be.visible');
    
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
    
    cy.log('✅ ESC key closes drawer');
  });

  it('applies alternative and dims non-selected paths', () => {
    // Capture initial state
    cy.window().then((win) => {
      const dump = (win as any).__dumpV3?.();
      const initialNodeCount = dump?.nodes?.length;
      
      // Open drawer
      cy.get('[data-node-type="checkpoint"]').first().click();
      
      // Select first alternative
      cy.get('[data-testid="alternative-card"]').first().within(() => {
        cy.contains('button', 'Select').click();
      });
      
      // Verify drawer closed
      cy.get('[role="dialog"]').should('not.exist');
      
      // Verify toast shown
      cy.contains('Alternative path applied').should('be.visible');
      
      // Verify node count stable (no layout jump)
      cy.window().then((win2) => {
        const afterDump = (win2 as any).__dumpV3?.();
        expect(afterDump?.nodes?.length).to.equal(initialNodeCount);
      });
      
      // Verify dimming applied
      cy.get('.v3-path-dimmed', { timeout: 2000 }).should('exist');
      cy.get('.v3-path-primary').should('exist');
      
      cy.log('✅ Alternative applied, dimming works, no layout jump');
    });
  });

  it('disables locked alternatives with prerequisite warnings', () => {
    cy.get('[data-node-type="checkpoint"]').first().click();
    
    // Look for locked alternative (if exists)
    cy.get('[data-testid="alternative-card"]').then($cards => {
      const $locked = $cards.filter(':contains("Locked")');
      
      if ($locked.length > 0) {
        cy.wrap($locked.first()).within(() => {
          cy.contains('Locked').should('be.visible');
          cy.contains(/prerequisite/i).should('be.visible');
          cy.contains('button', 'Select').should('be.disabled');
        });
        
        cy.log('✅ Locked alternatives display correctly');
      } else {
        cy.log('ℹ️ No locked alternatives in current data');
      }
    });
  });

  it('supports keyboard navigation', () => {
    cy.get('[data-node-type="checkpoint"]').first().focus().type('{enter}');
    cy.get('[role="dialog"]').should('be.visible');
    
    // Tab to first button
    cy.focused().tab();
    
    // Should be able to activate with Enter
    cy.focused().type('{enter}');
    
    cy.log('✅ Keyboard navigation works');
  });

  it('maintains stable IDs and positions through selection', () => {
    cy.window().then((win) => {
      const before = (win as any).__dumpV3?.();
      const bundlePositionsBefore = before.nodes
        .filter((n: any) => n.type === 'track-bundle')
        .map((n: any) => ({ id: n.id, x: n.position.x, y: n.position.y }));
      
      // Select alternative
      cy.get('[data-node-type="checkpoint"]').first().click();
      cy.get('[data-testid="alternative-card"]').first().within(() => {
        cy.contains('button', 'Select').click();
      });
      
      // Verify positions unchanged
      cy.window().then((win2) => {
        const after = (win2 as any).__dumpV3?.();
        const bundlePositionsAfter = after.nodes
          .filter((n: any) => n.type === 'track-bundle')
          .map((n: any) => ({ id: n.id, x: n.position.x, y: n.position.y }));
        
        expect(bundlePositionsAfter).to.deep.equal(bundlePositionsBefore);
      });
      
      cy.log('✅ Layout remains stable through selection');
    });
  });
});
