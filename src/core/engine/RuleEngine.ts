import { Parcel, RouteDecision, Rule } from './types';

export class RuleEngine {
  private rules: Rule[];

  constructor(rules: Rule[]) {
    // Sort by priority at construction time — not at evaluation time
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  route(parcel: Parcel): RouteDecision {
    const matchedRule = this.rules.find((rule) => rule.condition(parcel));

    if (!matchedRule) {
      // No rule matched — safe fallback, never throws
      return {
        department: 'ManualReview',
        requiresInsurance: false,
        reason: 'No routing rule matched — flagged for manual review',
        appliedRuleLabel: 'Fallback',
        flags: [],
      };
    }

    return matchedRule.decision(parcel);
  }

  // Useful for tests and the README "extension" example
  getRules(): Rule[] {
    return this.rules;
  }
}
