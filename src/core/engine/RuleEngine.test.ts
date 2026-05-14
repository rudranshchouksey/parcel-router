import { describe, it, expect } from 'vitest';
import { RuleEngine } from './RuleEngine';
import { defaultRules } from '../rules/defaultRules';

const engine = new RuleEngine(defaultRules);

describe('RuleEngine — default routing rules', () => {
  describe('Mail Department', () => {
    it('routes parcels up to 1kg to Mail', () => {
      const result = engine.route({ weight: 0.5, value: 0 });
      expect(result.department).toBe('Mail');
    });

    it('routes exactly 1kg to Mail (boundary)', () => {
      const result = engine.route({ weight: 1, value: 0 });
      expect(result.department).toBe('Mail');
    });
  });

  describe('Regular Department', () => {
    it('routes parcels over 1kg up to 10kg to Regular', () => {
      const result = engine.route({ weight: 5, value: 0 });
      expect(result.department).toBe('Regular');
    });

    it('routes exactly 10kg to Regular (boundary)', () => {
      const result = engine.route({ weight: 10, value: 0 });
      expect(result.department).toBe('Regular');
    });
  });

  describe('Heavy Department', () => {
    it('routes parcels over 10kg to Heavy', () => {
      const result = engine.route({ weight: 15, value: 0 });
      expect(result.department).toBe('Heavy');
    });
  });

  describe('Insurance flag', () => {
    it('requires insurance for value > €1000', () => {
      const result = engine.route({ weight: 0.9, value: 1100 });
      expect(result.requiresInsurance).toBe(true);
      expect(result.flags).toContain('REQUIRES_INSURANCE');
    });

    it('does not require insurance for value exactly €1000', () => {
      const result = engine.route({ weight: 2, value: 1000 });
      expect(result.requiresInsurance).toBe(false);
    });

    it('preserves correct department even when insurance is required', () => {
      // Heavy + insurance
      const result = engine.route({ weight: 100, value: 2000 });
      expect(result.department).toBe('Heavy');
      expect(result.requiresInsurance).toBe(true);
    });

    it('Mail parcel with high value still gets insurance flag', () => {
      const result = engine.route({ weight: 0.9, value: 1100 });
      expect(result.department).toBe('Mail');
      expect(result.requiresInsurance).toBe(true);
    });
  });

  describe('Fallback', () => {
    it('routes to ManualReview when no rule matches', () => {
      const emptyEngine = new RuleEngine([]);
      const result = emptyEngine.route({ weight: 5, value: 0 });
      expect(result.department).toBe('ManualReview');
    });
  });

  describe('Real XML fixture parcels', () => {
    // These are taken directly from Container_68465468.xml
    const fixtures = [
      { name: 'Vinny Gankema',    weight: 0.02, value: 0,    dept: 'Mail',     insurance: false },
      { name: 'Soner Colen',      weight: 2.0,  value: 0,    dept: 'Regular',  insurance: false },
      { name: 'Ricardus Proper',  weight: 100,  value: 2000, dept: 'Heavy',    insurance: true  },
      { name: 'Alvaro ten Cate',  weight: 11,   value: 500,  dept: 'Heavy',    insurance: false },
      { name: 'Aisling Kruizenga',weight: 0.9,  value: 1100, dept: 'Mail',     insurance: true  },
      { name: 'Amber van der Schaar', weight: 1, value: 0,   dept: 'Mail',     insurance: false },
      { name: 'Ninon Spanjersberg', weight: 10, value: 1500, dept: 'Regular',  insurance: true  },
    ];

    fixtures.forEach(({ name, weight, value, dept, insurance }) => {
      it(`correctly routes ${name} (${weight}kg, €${value})`, () => {
        const result = engine.route({ weight, value });
        expect(result.department).toBe(dept);
        expect(result.requiresInsurance).toBe(insurance);
      });
    });
  });
});
