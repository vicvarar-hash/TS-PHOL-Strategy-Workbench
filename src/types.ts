/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ZoneState {
  id: string;
  name: string;
  ours: number;
  enemy: number;
  supply: number;
  value: number;
  fog: boolean;
  p_attack: number; // ML Output 1
  p_success: number; // ML Output 2
}

export interface LogicRule {
  id: string;
  head: string;
  body: string[];
  probability: number;
  stratum: number; // 1: Risk, 2: Candidate, 3: Decision
  description?: string;
}

export interface GroundedFact {
  predicate: string;
  args: string[];
  probability: number;
  stratum: number;
  ruleId?: string;
  childFacts: GroundedFact[];
  id: string; // Unique ID for UI tracking
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TurnReport {
  turn: number;
  changes: {
    zoneId: string;
    zoneName: string;
    type: 'reinforcement' | 'attrition' | 'intel' | 'combat';
    description: string;
    impact?: string;
  }[];
  summary: string;
  victor?: 'human' | 'ai' | 'draw';
}

export interface ScalingMetric {
  numZones: number;
  runtime: number;
  numFacts: number;
  numFirings: number;
  proofDepth: number;
}

export type GamePhase = 'setup' | 'human_turn' | 'ai_turn' | 'result';
export type TabType = 'scenario' | 'ml' | 'hypothesis' | 'validator' | 'inference' | 'proof' | 'scaling' | 'play';

export interface ScenarioData {
  zones: ZoneState[];
  rules: LogicRule[];
  seed?: string;
}
