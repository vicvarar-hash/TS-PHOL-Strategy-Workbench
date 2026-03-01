/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogicRule, ValidationResult } from '../types';

export class StructuralValidator {
  private rules: LogicRule[];

  constructor(rules: LogicRule[]) {
    this.rules = rules;
  }

  public validateRule(rule: LogicRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Range Restriction
    // All variables in the head must appear in at least one positive literal in the body.
    const headVars = this.getVars(rule.head);
    const bodyVars = new Set<string>();
    rule.body.forEach(atom => {
      this.getVars(atom).forEach(v => bodyVars.add(v));
    });

    headVars.forEach(v => {
      if (!bodyVars.has(v)) {
        errors.push(`Variable '${v}' in head is not range-restricted (must appear in body).`);
      }
    });

    // 2. Bounded Predicate Arity
    // Max 2 arguments per predicate (as requested: "max 2 arguments").
    const headArgs = this.getArgs(rule.head);
    if (headArgs.length > 2) {
      errors.push(`Head predicate arity (${headArgs.length}) exceeds bound (2).`);
    }

    rule.body.forEach(atom => {
      const args = this.getArgs(atom);
      if (args.length > 2) {
        errors.push(`Body predicate '${atom.split('(')[0]}' arity (${args.length}) exceeds bound (2).`);
      }
    });

    // 3. No Cyclic Negation / Stratification
    // (Simplified check: body predicates must belong to a lower stratum)
    rule.body.forEach(atom => {
      const pred = atom.split('(')[0];
      // Find if this predicate is defined by any rule
      const definingRules = this.rules.filter(r => r.head.startsWith(pred));
      definingRules.forEach(dr => {
        if (dr.stratum >= rule.stratum) {
          errors.push(`Stratification violation: '${pred}' is defined in stratum ${dr.stratum}, but used in rule at stratum ${rule.stratum}.`);
        }
      });
    });

    // 4. No Unbounded Recursion
    // In TS-PHOL, we enforce strict stratification which prevents recursion.
    rule.body.forEach(atom => {
      const pred = atom.split('(')[0];
      if (rule.head.startsWith(pred)) {
        errors.push(`Self-recursion detected in rule ${rule.id}. TS-PHOL requires strict stratification.`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  public validateAll(): ValidationResult {
    const allErrors: string[] = [];
    this.rules.forEach(rule => {
      const { errors } = this.validateRule(rule);
      allErrors.push(...errors.map(e => `Rule ${rule.id}: ${e}`));
    });
    return { valid: allErrors.length === 0, errors: allErrors };
  }

  private getVars(atom: string): string[] {
    const match = atom.match(/\((.*)\)/);
    if (!match) return [];
    // Variables are lowercase single letters in our convention
    return match[1].split(',').map(s => s.trim()).filter(s => s === s.toLowerCase() && s.length === 1);
  }

  private getArgs(atom: string): string[] {
    const match = atom.match(/\((.*)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
  }
}
