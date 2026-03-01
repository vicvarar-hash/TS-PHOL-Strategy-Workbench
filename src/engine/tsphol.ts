/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ZoneState, LogicRule, GroundedFact, ValidationResult } from '../types';
import { StructuralValidator } from './validator';

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
  private validator: StructuralValidator;

  constructor(zones: ZoneState[], rules: LogicRule[]) {
    this.zones = zones;
    this.rules = rules;
    this.validator = new StructuralValidator(rules);
  }

  public validateRules(): ValidationResult {
    return this.validator.validateAll();
  }

  private getArgs(atom: string): string[] {
    const match = atom.match(/\((.*)\)/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
  }

  public runInference(pAttackThreshold: number = 0.5): { facts: GroundedFact[], firings: number } {
    this.groundedFacts = [];
    this.firingsCount = 0;

    // 1. Validate rules first - only run inference with valid rules
    const validation = this.validateRules();
    const validRules = this.rules.filter(r => {
      const res = this.validator.validateRule(r);
      return res.valid;
    });

    // Stratum 0: Base Facts (Grounding ML signals and state)
    this.zones.forEach(z => {
      const addFact = (pred: string, args: string[], prob: number) => {
        this.groundedFacts.push({ 
          id: `${pred}_${args.join('_')}`, 
          predicate: pred, 
          args: args, 
          probability: prob, 
          stratum: 0, 
          childFacts: [] 
        });
      };

      addFact('EnemyPresence', [z.id], z.enemy > 0 ? 1 : 0);
      addFact('LowDefense', [z.id], z.ours < 5 ? 1 : 0);
      addFact('StrategicValue', [z.id], z.value / 100);
      addFact('SupplyRich', [z.id], z.supply > 50 ? 1 : 0);
      addFact('SupplyAvailable', [z.id], z.supply > 10 ? 1 : 0);
      addFact('NoFog', [z.id], z.fog ? 0 : 1);
      addFact('p_success_high', [z.id], z.p_success);
      addFact('p_attack_high', [z.id], z.p_attack > pAttackThreshold ? z.p_attack : 0);
    });

    // Stratum 1 to 3: Recursive (but stratified) Inference
    for (let s = 1; s <= 3; s++) {
      const stratumRules = validRules.filter(r => r.stratum === s);
      stratumRules.forEach(rule => {
        // For each rule, we find all possible groundings of variables
        // In this PoC, we assume 'z' is the only variable and it ranges over zones.
        this.zones.forEach(z => {
          const bodyMatches: GroundedFact[] = [];
          const bodySatisfied = rule.body.every(atom => {
            const pred = atom.split('(')[0];
            const args = this.getArgs(atom);
            
            // Find a fact that matches this predicate and arguments
            // (Simple variable matching: 'z' matches current zone id)
            const fact = this.groundedFacts.find(f => {
              if (f.predicate !== pred) return false;
              return args.every((arg, i) => arg === 'z' ? f.args[i] === z.id : f.args[i] === arg);
            });

            if (fact) {
              bodyMatches.push(fact);
              return true;
            }
            return false;
          });

          if (bodySatisfied) {
            this.firingsCount++;
            const combinedProb = bodyMatches.reduce((acc, f) => acc * f.probability, 1) * rule.probability;
            const headPred = rule.head.split('(')[0];
            const headArgs = this.getArgs(rule.head).map(a => a === 'z' ? z.id : a);

            const factId = `${headPred}_${headArgs.join('_')}`;
            
            // Check if fact already exists (avoid duplicates in same stratum)
            if (!this.groundedFacts.some(f => f.id === factId)) {
              this.groundedFacts.push({
                id: factId,
                predicate: headPred,
                args: headArgs,
                probability: combinedProb,
                stratum: s,
                ruleId: rule.id,
                childFacts: bodyMatches
              });
            }
          }
        });
      });
    }

    return { facts: this.groundedFacts, firings: this.firingsCount };
  }
}

