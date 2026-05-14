import { Rule } from '../engine/types';

// ADDING A NEW RULE = adding one object to this array.
// Rules are evaluated in ascending priority order.
// First matching rule wins.

export const defaultRules: Rule[] = [
  {
    label: 'InsuranceRequired',
    priority: 1, // evaluated FIRST — cross-cutting concern
    condition: (p) => p.value > 1000,
    decision: (p) => ({
      department: p.weight <= 1 ? 'Mail'
                : p.weight <= 10 ? 'Regular'
                : 'Heavy',
      requiresInsurance: true,
      reason: `Parcel value €${p.value} exceeds €1,000 — Insurance approval required`,
      appliedRuleLabel: 'InsuranceRequired',
      flags: ['HIGH_VALUE', 'REQUIRES_INSURANCE'],
    }),
  },
  {
    label: 'MailDepartment',
    priority: 2,
    condition: (p) => p.weight <= 1,
    decision: () => ({
      department: 'Mail',
      requiresInsurance: false,
      reason: 'Weight ≤ 1 kg — routed to Mail Department',
      appliedRuleLabel: 'MailDepartment',
      flags: [],
    }),
  },
  {
    label: 'RegularDepartment',
    priority: 3,
    condition: (p) => p.weight <= 10,
    decision: () => ({
      department: 'Regular',
      requiresInsurance: false,
      reason: 'Weight > 1 kg and ≤ 10 kg — routed to Regular Department',
      appliedRuleLabel: 'RegularDepartment',
      flags: [],
    }),
  },
  {
    label: 'HeavyDepartment',
    priority: 4,
    condition: (p) => p.weight > 10,
    decision: () => ({
      department: 'Heavy',
      requiresInsurance: false,
      reason: 'Weight > 10 kg — routed to Heavy Department',
      appliedRuleLabel: 'HeavyDepartment',
      flags: ['OVER_WEIGHT'],
    }),
  },
];
