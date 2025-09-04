const pathUrl = "/skilltree3";

const q = {
  node: '[data-testid="lp-node"]',
  edge: '[data-testid="lp-edge"]',
  step: '[data-testid="lp-step-badge"]',
  preset: (k: string) => `[data-testid="lp-preset-${k}"]`,
};

function getTransferLabelCountFromBody($body: JQuery<HTMLElement>): number {
  const txt = $body.text() || "";
  const matches = txt.match(/\b\d{1,3}% transfer\b/g) || [];
  return matches.length;
}

describe("Life Path — Runtime Visual Audit (Safe Render Mode)", () => {
  beforeEach(() => {
    // Mock authentication (if required)
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: '3c459625-e499-5ddb-b64d-a442dd21f474' }
      }));
    });

    cy.visit(pathUrl);
  });

  it("Preconditions: page renders nodes & edges with test IDs", () => {
    cy.get(q.node).should("exist").its("length").should("be.greaterThan", 0);
    cy.get(q.edge).should("exist").its("length").should("be.greaterThan", 0);
  });

  it("Stability: node/edge counts remain stable at t=0s, t=6s, t=12s", () => {
    // t=0
    cy.get(q.node).then(($n0) => {
      const nodes0 = $n0.length;
      cy.get(q.edge).then(($e0) => {
        const edges0 = $e0.length;

        // t=6s
        cy.wait(6000);
        cy.get(q.node).then(($n6) => {
          const nodes6 = $n6.length;
          cy.get(q.edge).then(($e6) => {
            const edges6 = $e6.length;

            // t=12s
            cy.wait(6000);
            cy.get(q.node).then(($n12) => {
              const nodes12 = $n12.length;
              cy.get(q.edge).then(($e12) => {
                const edges12 = $e12.length;

                expect(nodes0, "nodes t0 vs t6").to.equal(nodes6);
                expect(nodes6, "nodes t6 vs t12").to.equal(nodes12);

                expect(edges0, "edges t0 vs t6").to.equal(edges6);
                expect(edges6, "edges t6 vs t12").to.equal(edges12);
              });
            });
          });
        });
      });
    });
  });

  it("Presets: each preset yields an active path with ≥ 3 steps; node/edge counts do not drop", () => {
    const presets = ["fastest", "cheapest", "creditMaximized", "balanced"];

    // Baseline counts
    cy.get(q.node).its("length").as("baseNodes");
    cy.get(q.edge).its("length").as("baseEdges");

    presets.forEach((p) => {
      cy.get(q.preset(p)).should("exist").click();

      // give the UI a moment to update
      cy.wait(400);

      // Step badges approximate visible main path length
      cy.get(q.step)
        .its("length")
        .should("be.greaterThan", 2);

      // Counts should not collapse
      cy.get("@baseNodes").then((baseNodes: any) => {
        cy.get(q.node).its("length").should("be.greaterThan", baseNodes - 1);
      });
      cy.get("@baseEdges").then((baseEdges: any) => {
        cy.get(q.edge).its("length").should("be.greaterThan", baseEdges - 1);
      });
    });
  });

  it("Transfer labels: at least one '% transfer' label appears somewhere in the DOM", () => {
    cy.get("body").then(($body) => {
      const count = getTransferLabelCountFromBody($body);
      expect(count, "transfer label count").to.be.greaterThan(0);
    });
  });
});