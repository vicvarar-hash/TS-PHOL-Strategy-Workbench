/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScalingMetric, ZoneState, LogicRule } from '../types';
import { TSPHOL_Engine } from './tsphol';

export class ScalingMetrics {
  private rules: LogicRule[];

  constructor(rules: LogicRule[]) {
    this.rules = rules;
  }

  public async runBenchmark(numZones: number): Promise<ScalingMetric> {
    const zones = this.generateZones(numZones);
    const engine = new TSPHOL_Engine(zones, this.rules);
    
    const start = performance.now();
    const { facts, firings } = engine.runInference(0.5);
    const end = performance.now();

    const maxDepth = this.getMaxDepth(facts);

    return {
      numZones,
      runtime: parseFloat((end - start).toFixed(2)),
      numFacts: facts.length,
      numFirings: firings,
      proofDepth: maxDepth
    };
  }

  private getMaxDepth(facts: any[]): number {
    let max = 0;
    const getDepth = (f: any, d: number) => {
      max = Math.max(max, d);
      f.childFacts.forEach((cf: any) => getDepth(cf, d + 1));
    };
    facts.forEach(f => getDepth(f, 0));
    return max;
  }

  private generateZones(count: number): ZoneState[] {
    const zones: ZoneState[] = [];
    for (let i = 0; i < count; i++) {
      zones.push({
        id: `Z${i+1}`,
        name: `Sector ${i+1}`,
        ours: Math.floor(Math.random() * 10),
        enemy: Math.floor(Math.random() * 10),
        supply: Math.floor(Math.random() * 100),
        value: Math.floor(Math.random() * 100),
        fog: Math.random() > 0.8,
        p_attack: Math.random(),
        p_success: Math.random()
      });
    }
    return zones;
  }
}
