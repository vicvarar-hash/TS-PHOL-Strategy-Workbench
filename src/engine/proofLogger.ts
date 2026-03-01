/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroundedFact } from '../types';

export class ProofLogger {
  public static getDerivationTrace(fact: GroundedFact): string[] {
    const trace: string[] = [];
    this.buildTrace(fact, trace, 0);
    return trace;
  }

  private static buildTrace(fact: GroundedFact, trace: string[], depth: number) {
    const indent = '  '.repeat(depth);
    const ruleInfo = fact.ruleId ? ` [Rule: ${fact.ruleId}]` : ' [Base Fact]';
    trace.push(`${indent}${fact.predicate}(${fact.args.join(', ')}) - Prob: ${(fact.probability * 100).toFixed(1)}%${ruleInfo}`);
    
    fact.childFacts.forEach(child => {
      this.buildTrace(child, trace, depth + 1);
    });
  }

  public static flattenProof(fact: GroundedFact): GroundedFact[] {
    const result: GroundedFact[] = [fact];
    fact.childFacts.forEach(child => {
      result.push(...this.flattenProof(child));
    });
    return result;
  }
}
