// src/core/rules/index.ts

import { defaultRules } from './defaultRules';
import type { Rule } from '../engine/types';

/**
 * The active rule registry used by the RuleEngine.
 *
 * To swap rule sets (e.g. per environment or tenant),
 * replace this export — no changes needed in the engine itself.
 */
export const activeRules: Rule[] = defaultRules;