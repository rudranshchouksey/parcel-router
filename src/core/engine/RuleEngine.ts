import type { Parcel, RouteDecision, Rule } from "./types";

export class RuleEngine {
  private readonly rules: Rule[];

  constructor(rules: Rule[]) {
    this.validateRules(rules);
    // Sort once at construction — not on every route() call
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  route(parcel: Parcel): RouteDecision {
    for (const rule of this.rules) {
      let matches = false;

      try {
        matches = rule.condition(parcel);
      } catch (err) {
        // A rule condition that throws is a code bug, not a parcel problem.
        // Log it, skip the rule, continue evaluating remaining rules.
        // This prevents one bad rule from blocking all routing.
        console.error(
          `[RuleEngine] Rule "${rule.label}" condition threw an error. Skipping.`,
          err
        );
        continue;
      }

      if (matches) {
        return rule.decision(parcel);
      }
    }

    // Safe fallback — the engine never throws at request time
    return {
      department: "ManualReview",
      requiresInsurance: false,
      reason: "No routing rule matched — flagged for manual review",
      appliedRuleLabel: "Fallback",
      flags: [],
    };
  }

  getRules(): Rule[] {
    return [...this.rules]; // defensive copy — callers cannot mutate internal state
  }

  // ── Startup validation ────────────────────────────────────────────────────
  // Runs once at construction. Validates rule structure before any requests.
  // A misconfigured rule set crashes the process with a clear message,
  // not silently at request time.

  private validateRules(rules: Rule[]): void {
    if (!Array.isArray(rules)) {
      throw new Error("[RuleEngine] rules must be an array");
    }

    const labels = new Set<string>();

    rules.forEach((rule, index) => {
      const prefix = `[RuleEngine] Rule at index ${index}`;

      if (!rule.label || typeof rule.label !== "string") {
        throw new Error(`${prefix}: missing or invalid "label" field`);
      }

      if (typeof rule.priority !== "number" || isNaN(rule.priority)) {
        throw new Error(`${prefix} ("${rule.label}"): invalid "priority" — must be a number`);
      }

      if (typeof rule.condition !== "function") {
        throw new Error(`${prefix} ("${rule.label}"): "condition" must be a function`);
      }

      if (typeof rule.decision !== "function") {
        throw new Error(`${prefix} ("${rule.label}"): "decision" must be a function`);
      }

      if (labels.has(rule.label)) {
        throw new Error(`${prefix}: duplicate rule label "${rule.label}" — labels must be unique`);
      }

      labels.add(rule.label);
    });
  }
}