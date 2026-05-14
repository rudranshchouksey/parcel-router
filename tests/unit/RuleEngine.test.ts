// tests/unit/RuleEngine.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "@/core/engine/RuleEngine";
import { defaultRules } from "@/core/rules/defaultRules";
import type { Rule } from "@/core/engine/types";

// ─── Shared engine instance ───────────────────────────────────────────────────

let engine: RuleEngine;

beforeEach(() => {
  engine = new RuleEngine(defaultRules);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RuleEngine — Mail Department", () => {
  it("routes 0.5kg parcel to Mail", () => {
    expect(engine.route({ weight: 0.5, value: 0 }).department).toBe("Mail");
  });

  it("routes exactly 1kg to Mail (upper boundary)", () => {
    expect(engine.route({ weight: 1, value: 0 }).department).toBe("Mail");
  });

  it("routes 0.02kg to Mail (real fixture: Vinny Gankema)", () => {
    expect(engine.route({ weight: 0.02, value: 0 }).department).toBe("Mail");
  });

  it("routes 0.7kg to Mail (real fixture: Montana Martinus)", () => {
    expect(engine.route({ weight: 0.7, value: 0 }).department).toBe("Mail");
  });
});

describe("RuleEngine — Regular Department", () => {
  it("routes 1.01kg to Regular (just above Mail boundary)", () => {
    expect(engine.route({ weight: 1.01, value: 0 }).department).toBe("Regular");
  });

  it("routes 5kg to Regular", () => {
    expect(engine.route({ weight: 5, value: 0 }).department).toBe("Regular");
  });

  it("routes exactly 10kg to Regular (upper boundary)", () => {
    expect(engine.route({ weight: 10, value: 0 }).department).toBe("Regular");
  });

  it("routes 2kg to Regular (real fixture: Soner Colen)", () => {
    expect(engine.route({ weight: 2, value: 0 }).department).toBe("Regular");
  });

  it("routes 4.5kg to Regular (real fixture: Bernadet Spijker)", () => {
    expect(engine.route({ weight: 4.5, value: 0 }).department).toBe("Regular");
  });
});

describe("RuleEngine — Heavy Department", () => {
  it("routes 10.01kg to Heavy (just above Regular boundary)", () => {
    expect(engine.route({ weight: 10.01, value: 0 }).department).toBe("Heavy");
  });

  it("routes 15kg to Heavy", () => {
    expect(engine.route({ weight: 15, value: 0 }).department).toBe("Heavy");
  });

  it("routes 100kg to Heavy (real fixture: Ricardus Proper)", () => {
    expect(engine.route({ weight: 100, value: 0 }).department).toBe("Heavy");
  });

  it("routes 120kg to Heavy (real fixture: Collin Slaman)", () => {
    expect(engine.route({ weight: 120, value: 0 }).department).toBe("Heavy");
  });
});

describe("RuleEngine — Insurance flag", () => {
  it("requires insurance when value > €1000", () => {
    const result = engine.route({ weight: 2, value: 1001 });
    expect(result.requiresInsurance).toBe(true);
    expect(result.flags).toContain("REQUIRES_INSURANCE");
    expect(result.flags).toContain("HIGH_VALUE");
  });

  it("does NOT require insurance when value = €1000 (boundary)", () => {
    const result = engine.route({ weight: 2, value: 1000 });
    expect(result.requiresInsurance).toBe(false);
  });

  it("does NOT require insurance when value < €1000", () => {
    const result = engine.route({ weight: 5, value: 999 });
    expect(result.requiresInsurance).toBe(false);
  });

  it("Mail parcel with value > €1000 still routes to Mail with insurance", () => {
    // real fixture: Aisling Kruizenga — 0.9kg, €1100
    const result = engine.route({ weight: 0.9, value: 1100 });
    expect(result.department).toBe("Mail");
    expect(result.requiresInsurance).toBe(true);
  });

  it("Regular parcel with value > €1000 still routes to Regular with insurance", () => {
    // real fixture: Ninon Spanjersberg — 10kg, €1500
    const result = engine.route({ weight: 10, value: 1500 });
    expect(result.department).toBe("Regular");
    expect(result.requiresInsurance).toBe(true);
  });

  it("Heavy parcel with value > €1000 still routes to Heavy with insurance", () => {
    // real fixture: Ricardus Proper — 100kg, €2000
    const result = engine.route({ weight: 100, value: 2000 });
    expect(result.department).toBe("Heavy");
    expect(result.requiresInsurance).toBe(true);
  });
});

describe("RuleEngine — RouteDecision shape", () => {
  it("always returns a reason string", () => {
    const result = engine.route({ weight: 5, value: 0 });
    expect(result.reason).toBeTruthy();
    expect(typeof result.reason).toBe("string");
  });

  it("always returns an appliedRuleLabel", () => {
    const result = engine.route({ weight: 5, value: 0 });
    expect(result.appliedRuleLabel).toBeTruthy();
  });

  it("always returns a flags array", () => {
    const result = engine.route({ weight: 5, value: 0 });
    expect(Array.isArray(result.flags)).toBe(true);
  });
});

describe("RuleEngine — Fallback", () => {
  it("returns ManualReview when no rules are registered", () => {
    const emptyEngine = new RuleEngine([]);
    const result = emptyEngine.route({ weight: 5, value: 0 });
    expect(result.department).toBe("ManualReview");
    expect(result.appliedRuleLabel).toBe("Fallback");
  });
});

describe("RuleEngine — Priority ordering", () => {
  it("evaluates InsuranceRequired rule before weight rules", () => {
    // Insurance rule has priority 1 — must fire first
    const result = engine.route({ weight: 0.5, value: 1500 });
    expect(result.appliedRuleLabel).toBe("InsuranceRequired");
    expect(result.requiresInsurance).toBe(true);
  });

  it("respects custom priority when rules are passed out of order", () => {
    const reversed = [...defaultRules].reverse();
    const reversedEngine = new RuleEngine(reversed);
    // Even with reversed input, priority sorting means same result
    const result = reversedEngine.route({ weight: 0.5, value: 1500 });
    expect(result.requiresInsurance).toBe(true);
  });
});

describe("RuleEngine — Extensibility", () => {
  it("routes to a new department when a custom rule is added", () => {
    const fragileRule: Rule = {
      label: "FragileDepartment",
      priority: 0, // highest priority
      condition: (p) => !!(p.attributes?.fragile),
      decision: () => ({
        department: "Fragile" as any,
        requiresInsurance: false,
        reason: "Parcel marked as fragile — routed to Fragile Department",
        appliedRuleLabel: "FragileDepartment",
        flags: [],
      }),
    };

    const extendedEngine = new RuleEngine([...defaultRules, fragileRule]);
    const result = extendedEngine.route({
      weight: 5,
      value: 0,
      attributes: { fragile: true },
    });

    expect(result.department).toBe("Fragile");
    expect(result.appliedRuleLabel).toBe("FragileDepartment");
  });
});