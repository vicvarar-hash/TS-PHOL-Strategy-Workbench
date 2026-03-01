/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { ZoneState, LogicRule, GroundedFact, ValidationResult, ScalingMetric, TurnReport } from '../types';
import { TSPHOL_Engine, ZONE_NAMES, DEFAULT_RULES } from '../engine/tsphol';
import { HypothesisGenerator } from '../engine/hypothesisGenerator';
import { ScalingMetrics } from '../engine/scalingMetrics';

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

  const hypothesisGenerator = new HypothesisGenerator();

  const initZones = useCallback((n: number, customSeed?: string) => {
    const activeSeed = customSeed || seed;
    const rngSeed = (parseInt(activeSeed, 36) || 12345) + turn; 
    const rng = mulberry32(rngSeed);

    const newZones: ZoneState[] = Array.from({ length: n }, (_, i) => ({
      id: `Z${i + 1}`,
      name: ZONE_NAMES[i % ZONE_NAMES.length],
      ours: Math.floor(rng() * 20),
      enemy: Math.floor(rng() * 15),
      supply: Math.floor(rng() * 100),
      value: Math.floor(rng() * 100),
      fog: rng() > 0.7,
      p_attack: rng(),
      p_success: rng(),
    }));
    setZones(newZones);
    return newZones;
  }, [seed, turn]);

  const proposeHypothesis = useCallback(async (useLLM: boolean = false) => {
    if (useLLM) {
      const h = await hypothesisGenerator.generateFromLLM(zones, rules);
      setHypotheses(prev => [...prev, h]);
    } else {
      const h = hypothesisGenerator.generateHypothesis(rules);
      setHypotheses(prev => [...prev, h]);
    }
  }, [zones, rules]);

  const acceptHypothesis = useCallback((h: LogicRule) => {
    setRules(prev => [...prev, h]);
    setHypotheses(prev => prev.filter(item => item.id !== h.id));
  }, []);

  const rejectHypothesis = useCallback((h: LogicRule) => {
    setHypotheses(prev => prev.filter(item => item.id !== h.id));
  }, []);

  const runBenchmark = useCallback(async () => {
    const metrics: ScalingMetric[] = [];
    const scaler = new ScalingMetrics(rules);
    const sizes = [4, 8, 16, 32, 64];
    
    for (const size of sizes) {
      const m = await scaler.runBenchmark(size);
      metrics.push(m);
    }
    setScalingMetrics(metrics);
  }, [rules]);

  const advanceTurn = useCallback((humanAction?: { action: string, zone: string }, aiAction?: { action: string, zone: string }) => {
    const rng = mulberry32(Date.now());
    const report: TurnReport = { 
      turn: turn, 
      changes: [],
      summary: `End of Strategic Turn ${turn}. Tactical movements processed.`
    };
    
    if (humanAction && aiAction) {
      if (humanAction.zone === aiAction.zone) {
        report.changes.push({
          zoneId: humanAction.zone,
          zoneName: zones.find(z => z.id === humanAction.zone)?.name || humanAction.zone,
          type: 'combat',
          description: `Direct engagement at ${humanAction.zone}.`,
          impact: "High attrition for both sides."
        });
        report.victor = 'draw';
      } else {
        report.summary += ` Human focused on ${humanAction.zone}, AI focused on ${aiAction.zone}.`;
      }
    }

    const nextZones = zones.map(z => {
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
      
      newZ.p_attack = Math.max(0, Math.min(1, newZ.p_attack + (rng() - 0.5) * 0.1));
      newZ.p_success = Math.max(0, Math.min(1, newZ.p_success + (rng() - 0.5) * 0.1));
      
      return newZ;
    });

    setZones(nextZones);
    setTurn(prev => prev + 1);
    setLastTurnReport(report);
  }, [zones, turn]);

  const updateZoneML = useCallback((zoneId: string, p_attack: number, p_success: number) => {
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, p_attack, p_success } : z));
  }, []);

  const resetSession = useCallback(() => {
    setTurn(1);
    setLastTurnReport(null);
    initZones(numZones);
  }, [numZones, initZones]);

  useEffect(() => {
    initZones(numZones);
  }, [numZones, initZones]);

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
    rules, setRules,
    hypotheses, setHypotheses,
    proposeHypothesis, acceptHypothesis, rejectHypothesis,
    validation, setValidation,
    inferredFacts, setInferredFacts,
    scalingMetrics, setScalingMetrics,
    runBenchmark,
    isInferring, setIsInferring,
    currentStep, setCurrentStep,
    pAttackThreshold, setPAttackThreshold,
    seed, setSeed,
    turn, advanceTurn, resetSession, lastTurnReport,
    initZones,
    runInference,
    updateZoneML
  };
}

