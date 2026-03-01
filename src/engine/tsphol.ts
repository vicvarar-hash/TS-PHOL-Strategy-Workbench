/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ZoneState, LogicRule, GroundedFact, ValidationResult } from '../types';

export const ZONE_NAMES = [
  "Frontier Ridge", "Iron Valley", "Delta Supply Route", "Echo Stronghold",
  "Obsidian Pass", "Cinder Peaks", "Azure Basin", "Titan's Gate",
  "Whispering Woods", "Shattered Coast", "Neon District", "Marble Plaza",
  "Rust Belt", "Crystal Lake", "Shadow Grove", "Sunken Ruins",
  "Veridian Fields", "Cobalt Canyon", "Amber Desert", "Ivory Tower",
  "Crimson Crater", "Silver Spire", "Golden Gorge", "Beryl Bay",
  "Onyx Outpost", "Pearl Port", "Jade Jungle", "Ruby Ridge",
  "Sapphire Shore", "Topaz Terrace", "Quartz Quarry", "Zircon Zenith"
];

export const STRATA_LABELS = [
  "Base Facts (Stratum 0)",
  "Risk Predicates (Stratum 1)",
  "Candidate Actions (Stratum 2)",
  "Final Decision (Stratum 3)"
];

export const DEFAULT_RULES: LogicRule[] = [
  { 
    id: 'R1', head: 'Vulnerable(z)', body: ['EnemyPresence(z)', 'LowDefense(z)'], probability: 0.9, stratum: 1,
    description: "A zone is vulnerable if there is enemy presence and allied defense is insufficient."
  },
  { 
    id: 'R2', head: 'HighValue(z)', body: ['StrategicValue(z)', 'SupplyRich(z)'], probability: 0.85, stratum: 1,
    description: "A zone is high value if it has high strategic importance and abundant supplies."
  },
  { 
    id: 'R3', head: 'Defend(z)', body: ['Vulnerable(z)', 'HighValue(z)'], probability: 0.95, stratum: 2,
    description: "Recommend defense if a zone is both vulnerable and high value."
  },
  { 
    id: 'R4', head: 'Attack(z)', body: ['EnemyPresence(z)', 'p_success_high(z)'], probability: 0.8, stratum: 2,
    description: "Recommend attack if enemy is present and ML models predict a high probability of success."
  },
  { 
    id: 'R5', head: 'Execute(Defend, z)', body: ['Defend(z)', 'SupplyAvailable(z)'], probability: 0.99, stratum: 3,
    description: "Execute defense orders if recommended and local supply lines are operational."
  },
  { 
    id: 'R6', head: 'Execute(Attack, z)', body: ['Attack(z)', 'NoFog(z)'], probability: 0.9, stratum: 3,
    description: "Execute attack orders if recommended and there is no fog of war obscuring the target."
  },
];

export class TSPHOL_Engine {
  private zones: ZoneState[];
  private rules: LogicRule[];
  private groundedFacts: GroundedFact[] = [];
  private firingsCount: number = 0;

  constructor(zones: ZoneState[], rules: LogicRule[]) {
    this.zones = zones;
    this.rules = rules;
  }

  public validateRules(): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      // 1. Range Restriction
      const headVars = this.getVars(rule.head);
      const bodyVars = new Set<string>();
      rule.body.forEach(b => this.getVars(b).forEach(v => bodyVars.add(v)));
      
      headVars.forEach(v => {
        if (!bodyVars.has(v)) {
          errors.push(`Rule ${rule.id}: Variable '${v}' in head is not range-restricted.`);
        }
      });

      // 2. Bounded Arity
      const headArity = this.getArgs(rule.head).length;
      if (headArity > 3) {
        errors.push(`Rule ${rule.id}: Arity (${headArity}) exceeds bound (3).`);
      }

      // 3. No Cycles / Stratification
      rule.body.forEach(bodyAtom => {
        const bodyPredicate = bodyAtom.split('(')[0];
        const dependencyRule = this.rules.find(r => r.head.startsWith(bodyPredicate));
        if (dependencyRule && dependencyRule.stratum >= rule.stratum) {
          errors.push(`Rule ${rule.id}: Stratification violation (depends on stratum ${dependencyRule.stratum} >= ${rule.stratum}).`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  private getVars(atom: string): string[] {
    const match = atom.match(/\((.*)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim()).filter(s => s === s.toLowerCase() && s.length === 1);
  }

  private getArgs(atom: string): string[] {
    const match = atom.match(/\((.*)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
  }

  public runInference(pAttackThreshold: number = 0.5): { facts: GroundedFact[], firings: number } {
    this.groundedFacts = [];
    this.firingsCount = 0;

    // Stratum 0: Base Facts
    this.zones.forEach(z => {
      const baseArgs = [z.id];
      const addFact = (pred: string, prob: number) => {
        this.groundedFacts.push({ 
          id: `${pred}_${z.id}`, 
          predicate: pred, 
          args: baseArgs, 
          probability: prob, 
          stratum: 0, 
          childFacts: [] 
        });
      };

      addFact('EnemyPresence', z.enemy > 0 ? 1 : 0);
      addFact('LowDefense', z.ours < 5 ? 1 : 0);
      addFact('StrategicValue', z.value / 100);
      addFact('SupplyRich', z.supply > 50 ? 1 : 0);
      addFact('SupplyAvailable', z.supply > 10 ? 1 : 0);
      addFact('NoFog', z.fog ? 0 : 1);
      addFact('p_success_high', z.p_success);
      addFact('p_attack_high', z.p_attack > pAttackThreshold ? z.p_attack : 0);
    });

    // Stratum 1 to 3
    for (let s = 1; s <= 3; s++) {
      const stratumRules = this.rules.filter(r => r.stratum === s);
      stratumRules.forEach(rule => {
        this.zones.forEach(z => {
          const bodySatisfied = rule.body.every(atom => {
            const pred = atom.split('(')[0];
            return this.groundedFacts.some(f => f.predicate === pred && f.args.includes(z.id));
          });

          if (bodySatisfied) {
            this.firingsCount++;
            const childFacts = rule.body.map(atom => {
              const pred = atom.split('(')[0];
              return this.groundedFacts.find(f => f.predicate === pred && f.args.includes(z.id))!;
            });

            const combinedProb = childFacts.reduce((acc, f) => acc * f.probability, 1) * rule.probability;
            const headPred = rule.head.split('(')[0];
            const headArgs = this.getArgs(rule.head).map(a => a === 'z' ? z.id : a);

            this.groundedFacts.push({
              id: `${headPred}_${headArgs.join('_')}`,
              predicate: headPred,
              args: headArgs,
              probability: combinedProb,
              stratum: s,
              ruleId: rule.id,
              childFacts
            });
          }
        });
      });
    }

    return { facts: this.groundedFacts, firings: this.firingsCount };
  }
}
