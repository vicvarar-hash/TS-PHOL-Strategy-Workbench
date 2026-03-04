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
  healthIndex?: number;
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
}

export interface ScalingMetric {
  numZones: number;
  runtime: number;
  numFacts: number;
  numFirings: number;
  proofDepth: number;
  runId?: string;
}

export interface ScalingExplanation {
  runtimeTrend: string;
  complexityTrend: string;
  impactNote: string;
}

export type GamePhase = 'awaiting_inference' | 'ai_evaluating' | 'reviewing_recommendations' | 'turn_result';
export type TabType = 'scenario' | 'hypothesis' | 'validator' | 'inference' | 'proof' | 'scaling';

export interface ScenarioData {
  zones: ZoneState[];
  rules: LogicRule[];
  seed?: string;
}
