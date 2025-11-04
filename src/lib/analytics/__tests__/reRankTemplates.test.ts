import { describe, it, expect } from "vitest";
import { reRankTemplates } from "../reRankTemplates";
import type { SmartWeights } from "../explorationApi";

const weights: SmartWeights = {
  bias: 0,
  w_cost: -0.2,
  w_weeks: -0.1,
  w_cri: 0.25,
  w_transfer_ok: 0.3,
  w_provider_ace: 0.12,
  w_provider_clep: 0.06,
  w_provider_nccrs: 0.04,
  w_provider_other: 0,
  w_exploratory_bonus: 0.05,
};

function tmpl(id: string, opts: Partial<any> = {}) {
  return {
    template: { 
      id, 
      providerType: "ACE", 
      explorationMeta: { isExploratory: true }, 
      ...opts.template 
    },
    validation: {
      score: 100, // base validator score
      impact: { 
        costDelta: 0, 
        weeksDelta: 0, 
        criDelta: 10, 
        ...(opts.impact || {}) 
      },
      transferStatus: { 
        accepted: true, 
        ...(opts.transfer || {}) 
      },
    },
  };
}

describe("reRankTemplates", () => {
  it("boosts templates with better CRI and transfer acceptance", () => {
    const items = [
      tmpl("lowCRI", { impact: { criDelta: -10 } }),
      tmpl("hiCRI", { impact: { criDelta: 25 } }),
    ];
    const ranked = reRankTemplates(items, weights);
    expect(ranked[0].template.id).toBe("hiCRI");
    expect(ranked[0].smartScore).toBeGreaterThan(ranked[1].smartScore);
  });

  it("penalizes cost/weeks increases", () => {
    const items = [
      tmpl("cheapFast", { impact: { costDelta: -200, weeksDelta: -2 } }),
      tmpl("costlySlow", { impact: { costDelta: 500, weeksDelta: 6 } }),
    ];
    const ranked = reRankTemplates(items, weights);
    expect(ranked[0].template.id).toBe("cheapFast");
  });

  it("applies provider bumps and exploratory bonus", () => {
    const ace = tmpl("ace", { template: { providerType: "ACE" } });
    const other = tmpl("other", { template: { providerType: "other" } });
    const ranked = reRankTemplates([other, ace], weights);
    expect(ranked[0].template.providerType.toLowerCase()).toBe("ace");
  });

  it("handles missing impact fields gracefully", () => {
    const minimal = {
      template: { id: "minimal", providerType: "CLEP" },
      validation: { score: 50 },
    };
    const ranked = reRankTemplates([minimal], weights);
    expect(ranked[0]).toHaveProperty("smartScore");
    expect(ranked[0].smartScore).toBeGreaterThan(0);
  });

  it("sorts by smartScore descending", () => {
    const items = [
      tmpl("mid", { impact: { criDelta: 10 } }),
      tmpl("high", { impact: { criDelta: 50 } }),
      tmpl("low", { impact: { criDelta: -20 } }),
    ];
    const ranked = reRankTemplates(items, weights);
    expect(ranked[0].template.id).toBe("high");
    expect(ranked[1].template.id).toBe("mid");
    expect(ranked[2].template.id).toBe("low");
  });

  it("applies exploratory bonus when isExploratory is true", () => {
    const nonExploratory = tmpl("standard", { 
      template: { explorationMeta: { isExploratory: false } } 
    });
    const exploratory = tmpl("explore", { 
      template: { explorationMeta: { isExploratory: true } } 
    });
    const ranked = reRankTemplates([nonExploratory, exploratory], weights);
    expect(ranked[0].template.id).toBe("explore");
  });
});
