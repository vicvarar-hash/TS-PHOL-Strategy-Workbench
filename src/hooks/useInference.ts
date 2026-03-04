/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { ZoneState, LogicRule, GroundedFact, ValidationResult, ScalingMetric, TurnReport } from '../types';
import { TSPHOL_Engine, ZONE_NAMES, DEFAULT_RULES } from '../engine/tsphol';
import { HypothesisGenerator } from '../engine/hypothesisGenerator';
import { ScalingMetrics } from '../engine/scalingMetrics';

export type DomainPreset = 'abstract' | 'catan' | 'openra';

export const DOMAIN_MAPPING: Record<DomainPreset, { zone: string; zones: string; allied: string; enemy: string; supply: string; value: string }> = {
  abstract: { zone: 'Zone', zones: 'Zones', allied: 'Allied', enemy: 'Enemy', supply: 'Supply', value: 'Value' },
  catan: { zone: 'Hex', zones: 'Hexes', allied: 'Settlements', enemy: 'Robbers', supply: 'Resources', value: 'VP' },
  openra: { zone: 'Sector', zones: 'Sectors', allied: 'GDI', enemy: 'NOD', supply: 'Tiberium', value: 'StratVal' }
};

export const DOMAIN_RULES: Record<DomainPreset, LogicRule[]> = {
  abstract: DEFAULT_RULES,
  catan: [
    { id: 'R1', head: 'RobberThreat(z)', body: ['EnemyPresence(z)', 'LowDefense(z)'], probability: 0.9, stratum: 1, description: "A hex is threatened by robbers if they are present and our settlements are weak." },
    { id: 'R2', head: 'ExpansionTarget(z)', body: ['StrategicValue(z)', 'SupplyRich(z)'], probability: 0.85, stratum: 1, description: "A hex is a good target for expansion if it yields good resources and VP." },
    { id: 'R3', head: 'Defend(z)', body: ['RobberThreat(z)', 'ExpansionTarget(z)'], probability: 0.95, stratum: 2, description: "Build a knight or defend if an expansion target is threatened." },
    { id: 'R4', head: 'Attack(z)', body: ['EnemyPresence(z)', 'p_success_high(z)'], probability: 0.8, stratum: 2, description: "Move the robber to disrupt enemy hexes with high probability." },
    { id: 'R5', head: 'Execute(BuildSettlement, z)', body: ['Defend(z)', 'SupplyAvailable(z)'], probability: 0.99, stratum: 3, description: "Execute a settlement build or upgrade if resources allow." },
    { id: 'R6', head: 'Execute(PlayKnight, z)', body: ['Attack(z)', 'NoFog(z)'], probability: 0.9, stratum: 3, description: "Execute a knight action if visibility allows." }
  ],
  openra: [
    { id: 'R1', head: 'Vulnerable(z)', body: ['EnemyPresence(z)', 'LowDefense(z)'], probability: 0.9, stratum: 1, description: "A sector is vulnerable if hostiles are present and MCV defenses are low." },
    { id: 'R2', head: 'TiberiumRich(z)', body: ['StrategicValue(z)', 'SupplyRich(z)'], probability: 0.85, stratum: 1, description: "Sector has dense Tiberium fields and strategic value." },
    { id: 'R3', head: 'Defend(z)', body: ['Vulnerable(z)', 'TiberiumRich(z)'], probability: 0.95, stratum: 2, description: "Defend vulnerable Tiberium fields." },
    { id: 'R4', head: 'Attack(z)', body: ['EnemyPresence(z)', 'p_success_high(z)'], probability: 0.8, stratum: 2, description: "Attack coordinates where ML predicts high success against hostiles." },
    { id: 'R5', head: 'Execute(DeployMCV, z)', body: ['Defend(z)', 'SupplyAvailable(z)'], probability: 0.99, stratum: 3, description: "Deploy an MCV or fortifications." },
    { id: 'R6', head: 'Execute(Airstrike, z)', body: ['Attack(z)', 'NoFog(z)'], probability: 0.9, stratum: 3, description: "Execute Airstrike if no fog of war covers the target." }
  ]
};

// Simple seeded random for reproducibility
const mulberry32 = (a: number) => {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

export function useInference() {
  const [numZones, setNumZones] = useState(8);
  const [zones, setZones] = useState<ZoneState[]>([]);
  const [rules, setRules] = useState<LogicRule[]>(DEFAULT_RULES);
  const [hypotheses, setHypotheses] = useState<LogicRule[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [] });
  const [inferredFacts, setInferredFacts] = useState<GroundedFact[]>([]);
  const [scalingMetrics, setScalingMetrics] = useState<ScalingMetric[]>([]);
  const [isInferring, setIsInferring] = useState(false);
  const [currentStep, setCurrentStep] = useState('ml');
  const [pAttackThreshold, setPAttackThreshold] = useState(0.5);
  const [seed, setSeed] = useState<string>(Math.random().toString(36).substring(7));
  const [turn, setTurn] = useState(1);
  const [lastTurnReport, setLastTurnReport] = useState<TurnReport | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isGeneratingHypothesis, setIsGeneratingHypothesis] = useState(false);

  const [domain, setDomain] = useState<DomainPreset>('abstract');


  const hypothesisGenerator = new HypothesisGenerator();

  const initZones = useCallback((n: number, customSeed?: string) => {
    const activeSeed = customSeed || seed;
    const rngSeed = parseInt(activeSeed, 36) || 12345;
    const rng = mulberry32(rngSeed);

    const newZones: ZoneState[] = Array.from({ length: n }, (_, i) => {
      const ours = Math.floor(rng() * 20);
      const enemy = Math.floor(rng() * 15);
      const supply = Math.floor(rng() * 100);
      const value = Math.floor(rng() * 100);

      return {
        id: `Z${i + 1}`,
        name: ZONE_NAMES[i % ZONE_NAMES.length],
        ours,
        enemy,
        supply,
        value,
        fog: rng() > 0.7,
        p_attack: rng(),
        p_success: rng()
      };
    });
    setZones(newZones);
    setIsStale(true);
    return newZones;
  }, [seed]);

  const proposeHypothesis = useCallback(async (useLLM: boolean = false) => {
    if (useLLM) {
      setIsGeneratingHypothesis(true);
      try {
        const h = await hypothesisGenerator.generateFromLLM(zones, rules);
        setHypotheses(prev => [...prev, h]);
      } finally {
        setIsGeneratingHypothesis(false);
      }
    } else {
      const h = hypothesisGenerator.generateHypothesis(rules);
      setHypotheses(prev => [...prev, h]);
    }
  }, [zones, rules]);

  const acceptHypothesis = useCallback((h: LogicRule) => {
    setRules(prev => [...prev, h]);
    setHypotheses(prev => prev.filter(item => item.id !== h.id));
    setIsStale(true);
  }, []);

  const rejectHypothesis = useCallback((h: LogicRule) => {
    setHypotheses(prev => prev.filter(item => item.id !== h.id));
  }, []);

  const runBenchmark = useCallback(async (customMaxZones?: number) => {
    const scaler = new ScalingMetrics(rules);
    const limit = customMaxZones || 64;
    const currentRunId = `Run ${new Set(scalingMetrics.map(m => m.runId)).size + 1}`;

    // Generate sizes: 4, 8, 16, ..., up to limit
    const sizes = [4];
    let s = 8;
    while (s <= limit) {
      sizes.push(s);
      s *= 2;
    }
    // Add the exact limit if not already present
    if (sizes[sizes.length - 1] !== limit && limit > 4) {
      sizes.push(limit);
    }

    const newMetrics: ScalingMetric[] = [];
    for (const size of sizes) {
      const m = await scaler.runBenchmark(size);
      newMetrics.push({ ...m, runId: currentRunId });
    }
    setScalingMetrics(prev => [...prev, ...newMetrics]);
  }, [rules, scalingMetrics]);

  const advanceTurn = useCallback((intelligenceEnabled: boolean = true) => {
    const rngSeed = (parseInt(seed, 36) || 12345) + turn + 999;
    const rng = mulberry32(rngSeed);
    const report: TurnReport = {
      turn: turn,
      changes: [],
      summary: intelligenceEnabled
        ? `Strategic Turn ${turn} complete. Intelligence updates processed.`
        : `Strategic Turn ${turn} complete. Intelligence gathering disabled.`
    };

    let nextZones = [...zones];

    if (intelligenceEnabled) {
      nextZones = zones.map(z => {
        const roll = rng();
        let newZ = { ...z };

        if (roll < 0.15) {
          const amount = Math.floor(rng() * 5) + 1;
          newZ.enemy += amount;
          report.changes.push({
            zoneId: z.id,
            zoneName: z.name,
            type: 'reinforcement',
            description: `Enemy reinforcements (+${amount}) detected.`,
            impact: "Increased risk level."
          });
        } else if (roll < 0.3) {
          const amount = Math.floor(rng() * 3) + 1;
          newZ.ours = Math.max(0, newZ.ours - amount);
          report.changes.push({
            zoneId: z.id,
            zoneName: z.name,
            type: 'attrition',
            description: `Allied attrition (-${amount}) reported.`,
            impact: "Reduced defensive capability."
          });
        } else if (roll < 0.4) {
          newZ.fog = !newZ.fog;
          report.changes.push({
            zoneId: z.id,
            zoneName: z.name,
            type: 'intel',
            description: newZ.fog ? "Satellite link lost. Fog of war active." : "Intel clear. Fog of war lifted.",
            impact: "Intelligence reliability shifted."
          });
        }

        const oldPAttack = newZ.p_attack;
        const oldPSuccess = newZ.p_success;
        newZ.p_attack = Math.max(0, Math.min(1, newZ.p_attack + (rng() - 0.5) * 0.1));
        newZ.p_success = Math.max(0, Math.min(1, newZ.p_success + (rng() - 0.5) * 0.1));

        const deltaAttack = newZ.p_attack - oldPAttack;
        const deltaSuccess = newZ.p_success - oldPSuccess;

        if (Math.abs(deltaAttack) > 0.02 || Math.abs(deltaSuccess) > 0.02) {
          report.changes.push({
            zoneId: z.id,
            zoneName: z.name,
            type: 'intel',
            description: `ML Signals updated: p_attack ${deltaAttack > 0 ? '+' : ''}${deltaAttack.toFixed(2)}, p_success ${deltaSuccess > 0 ? '+' : ''}${deltaSuccess.toFixed(2)}`,
            impact: "Neural network perception drift."
          });
        }

        return newZ;
      });
    }

    setZones(nextZones);
    setInferredFacts([]); // Clear AI recommendations on next turn

    setTurn(prev => prev + 1);
    setLastTurnReport(report);
    setIsStale(true);
    return report;
  }, [zones, turn, seed, rules, pAttackThreshold]);

  const applyRecommendation = useCallback((action: string, zoneId: string) => {
    setZones(prev => {
      const newZones = prev.map(z => {
        if (z.id !== zoneId) return z;
        const newZ = { ...z };
        if (action === 'Attack') {
          newZ.enemy = Math.max(0, Math.round(newZ.enemy * 0.6) - 5);
          newZ.ours = Math.max(0, newZ.ours - 2);
          newZ.p_success = Math.min(1, newZ.p_success + 0.1);
        } else if (action === 'Defend') {
          newZ.ours += 5;
          newZ.enemy = Math.max(0, newZ.enemy - 2);
          newZ.p_attack = Math.max(0, newZ.p_attack - 0.1);
        } else if (action === 'Reinforce') {
          newZ.ours += 10;
          newZ.supply = Math.max(0, newZ.supply - 15);
        } else if (action === 'Hold') {
          newZ.supply = Math.min(100, newZ.supply + 10);
          newZ.ours = Math.min(100, newZ.ours + 1);
        }
        return newZ;
      });
      return newZones;
    });
    setIsStale(true);
  }, []);

  const updateZoneML = useCallback((zoneId: string, p_attack: number, p_success: number) => {
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, p_attack, p_success } : z));
    setIsStale(true);
  }, []);

  const resetSession = useCallback(() => {
    setTurn(1);
    setLastTurnReport(null);
    setInferredFacts([]);
    setHypotheses([]);
    setValidation({ valid: true, errors: [] });
    setCurrentStep('ml');
    setSeed(Math.random().toString(36).substring(7));
    setIsStale(true);
  }, []);

  useEffect(() => {
    initZones(numZones);
  }, [numZones, initZones]);

  useEffect(() => {
    setRules(DOMAIN_RULES[domain]);
  }, [domain]);

  useEffect(() => {
    const engine = new TSPHOL_Engine(zones, rules);
    const val = engine.validateRules();
    setValidation(val);
  }, [rules, zones]);

  const runInference = async (silent: boolean = false) => {
    if (!silent) setIsInferring(true);
    if (!silent) setCurrentStep('ml');

    await new Promise(r => setTimeout(r, 400));
    if (!silent) setCurrentStep('hypothesis');

    const engine = new TSPHOL_Engine(zones, rules);
    const val = engine.validateRules();
    setValidation(val);

    if (!val.valid) {
      if (!silent) setIsInferring(false);
      return null;
    }

    if (!silent) await new Promise(r => setTimeout(r, 400));
    if (!silent) setCurrentStep('validator');

    if (!silent) await new Promise(r => setTimeout(r, 400));
    if (!silent) setCurrentStep('inference');

    const start = performance.now();
    const { facts, firings } = engine.runInference(pAttackThreshold);
    const end = performance.now();

    if (!silent) await new Promise(r => setTimeout(r, 400));
    if (!silent) setCurrentStep('decision');

    setInferredFacts(facts);
    setIsStale(false);



    const decisions = facts.filter(f => f.predicate === 'Execute');
    const bestDecision = decisions.sort((a, b) => b.probability - a.probability)[0];

    if (!silent) await new Promise(r => setTimeout(r, 400));
    if (!silent) setCurrentStep('proof');

    if (!silent) {
      setIsInferring(false);

      const getDepth = (f: GroundedFact): number => 1 + (f.childFacts.length > 0 ? Math.max(...f.childFacts.map(getDepth)) : 0);
      const maxDepth = facts.length > 0 ? Math.max(...facts.map(getDepth)) : 0;

      setScalingMetrics(prev => {
        const existing = prev.find(m => m.numZones === numZones);
        if (existing) return prev;
        return [...prev, { numZones, runtime: end - start, numFacts: facts.length, numFirings: firings, proofDepth: maxDepth }].sort((a, b) => a.numZones - b.numZones);
      });
    }

    return { facts, bestDecision };
  };
  return {
    numZones, setNumZones,
    zones, setZones,
    domain, setDomain,
    rules, setRules,
    hypotheses, setHypotheses,
    isInferring, setIsInferring,
    isGeneratingHypothesis,
    isStale, setIsStale,
    proposeHypothesis, acceptHypothesis, rejectHypothesis,
    validation, setValidation,
    inferredFacts,
    scalingMetrics, setScalingMetrics,
    runBenchmark,

    currentStep, setCurrentStep,
    pAttackThreshold, setPAttackThreshold,
    seed, setSeed,
    turn, advanceTurn, resetSession, lastTurnReport,
    initZones,
    runInference, applyRecommendation, updateZoneML,
  };
}
