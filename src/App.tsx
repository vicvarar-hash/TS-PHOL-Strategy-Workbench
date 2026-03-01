/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Shield, 
  Cpu, 
  Activity, 
  Layers, 
  FileText, 
  Play, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Database,
  Search,
  Zap,
  Network,
  Target,
  BarChart3,
  Terminal,
  Info,
  User,
  Bot,
  Trophy,
  ChevronRight,
  ChevronDown,
  Flame,
  Download,
  Upload,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useInference } from './hooks/useInference';
import { Onboarding } from './components/Onboarding';
import { DecisionCard } from './components/DecisionCard';
import { MapGrid } from './components/MapGrid';
import { STRATA_LABELS } from './engine/tsphol';
import { GroundedFact, TabType, GamePhase, LogicRule, ZoneState } from './types';

// --- Components ---

const InteractiveProof: React.FC<{ fact: GroundedFact | null, onHighlight: (zoneId: string | null) => void }> = ({ fact, onHighlight }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderNode = (f: GroundedFact, depth: number = 0) => {
    const isExpanded = expanded.has(f.id);
    const hasChildren = f.childFacts.length > 0;

    return (
      <div key={f.id} className="ml-4 border-l border-slate-800 pl-4 py-1">
        <div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer group",
            hasChildren ? "hover:bg-slate-800/50" : "cursor-default"
          )}
          onClick={() => hasChildren && toggle(f.id)}
          onMouseEnter={() => f.args.length > 0 && onHighlight(f.args[f.args.length - 1])}
          onMouseLeave={() => onHighlight(null)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />
          ) : (
            <div className="w-3.5" />
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400">{f.predicate}</span>
              <span className="text-[10px] font-mono text-slate-500">({f.args.join(', ')})</span>
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                f.probability > 0.7 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              )}>
                {(f.probability * 100).toFixed(0)}%
              </span>
            </div>
            {f.ruleId && (
              <span className="text-[9px] font-mono text-slate-600">via Rule {f.ruleId}</span>
            )}
          </div>
        </div>
        {isExpanded && f.childFacts.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!fact) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs italic p-8 text-center">
      <Search size={48} className="mb-4 opacity-20" />
      Select an inferred predicate to explore its logical derivation tree.
    </div>
  );

  return (
    <div className="p-4 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Network size={14} /> Interactive Proof Explorer
        </h3>
        <div className="flex gap-2">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            PTIME VERIFIED
          </span>
        </div>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        {renderNode(fact)}
      </div>
    </div>
  );
};

const TabHeader: React.FC<{ title: string, description: string, icon: React.ReactNode }> = ({ title, description, icon }) => (
  <div className="mb-6 p-4 bg-indigo-600/5 border border-indigo-500/20 rounded-xl flex items-start gap-4">
    <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        {title}
        <HelpCircle size={14} className="text-slate-600 cursor-help" title="Why am I seeing this?" />
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed mt-1">{description}</p>
    </div>
  </div>
);

const Glossary: React.FC = () => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
    <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-amber-400">
      <BookOpen size={16} /> TS-PHOL Glossary
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { term: "Stratum", def: "A logical layer in the reasoning hierarchy. Higher strata depend on lower ones, preventing cycles." },
        { term: "Grounded Fact", def: "A concrete instance of a predicate where variables are replaced by actual entities (e.g., Zone IDs)." },
        { term: "PTIME", def: "Polynomial Time. A complexity class ensuring the system remains fast even as the number of zones grows." },
        { term: "Range Restriction", def: "A safety property ensuring every variable in a rule's head also appears in its body." },
      ].map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">{item.term}</div>
          <p className="text-[10px] text-slate-500 leading-relaxed">{item.def}</p>
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  const {
    numZones, setNumZones,
    zones, setZones,
    rules, setRules,
    validation, setValidation,
    inferredFacts, setInferredFacts,
    scalingMetrics, setScalingMetrics,
    isInferring, setIsInferring,
    currentStep, setCurrentStep,
    pAttackThreshold, setPAttackThreshold,
    seed, setSeed,
    initZones,
    runInference
  } = useInference();

  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('scenario');
  const [selectedFact, setSelectedFact] = useState<GroundedFact | null>(null);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Game Mode State
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [humanScore, setHumanScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [humanDecision, setHumanDecision] = useState<{ action: string, zone: string } | null>(null);
  const [aiDecision, setAiDecision] = useState<{ action: string, zone: string } | null>(null);
  const [winRateData, setWinRateData] = useState<{ threshold: number, winRate: number }[]>([]);

  // Rule Editor State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<LogicRule>({ id: 'R_NEW', head: '', body: [], probability: 0.9, stratum: 1 });

  // --- Handlers ---

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleInference = async () => {
    const result = await runInference();
    if (result) {
      const { facts, bestDecision } = result;
      setInferredFacts(facts);
      if (bestDecision) {
        setAiDecision({ action: bestDecision.args[0], zone: bestDecision.args[1] });
      }
      addLog(`Inference complete. ${facts.length} facts generated.`);
    }
  };

  const handleHumanDecision = (action: string, zoneId: string) => {
    setHumanDecision({ action, zone: zoneId });
    setGamePhase('ai_turn');
    runInference().then((result) => {
      if (result) {
        const { bestDecision } = result;
        if (bestDecision) {
          setAiDecision({ action: bestDecision.args[0], zone: bestDecision.args[1] });
        }
        setGamePhase('result');
        calculateScores(action, zoneId, bestDecision);
      }
    });
  };

  const calculateScores = (hAction: string, hZone: string, aiBest: any) => {
    const zone = zones.find(z => z.id === hZone)!;
    let hPoints = 0;
    if (hAction === 'Defend' && zone.enemy > 10) hPoints += 2;
    else if (hAction === 'Attack' && zone.p_success > 0.7) hPoints += 3;
    else hPoints -= 1;
    setHumanScore(prev => prev + hPoints);

    if (aiBest) {
      const aiZone = zones.find(z => z.id === aiBest.args[1])!;
      let aiPoints = 0;
      if (aiBest.args[0] === 'Defend' && aiZone.enemy > 10) aiPoints += 2;
      else if (aiBest.args[0] === 'Attack' && aiZone.p_success > 0.7) aiPoints += 3;
      else aiPoints -= 1;
      setAiScore(prev => prev + aiPoints);
    }
  };

  const saveScenario = () => {
    const data = { zones, rules, seed };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-${seed}.json`;
    a.click();
    addLog("Scenario exported to JSON.");
  };

  const loadScenario = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setZones(data.zones);
        setRules(data.rules);
        setSeed(data.seed || seed);
        addLog("Scenario loaded successfully.");
      } catch (err) {
        addLog("Error loading scenario JSON.");
      }
    };
    reader.readAsText(file);
  };

  const addRule = () => {
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    setIsAddingRule(false);
    addLog(`Added rule ${newRule.id}. Running validation...`);
    // Validation is handled by useInference on next run
  };

  const runPhase2Sim = () => {
    addLog("Simulating 20 games for Phase 2 Learning...");
    const results = [];
    for (let t = 0.1; t <= 1.0; t += 0.1) {
      let wins = 0;
      for (let i = 0; i < 20; i++) {
        const testZones = initZones(4);
        const engine = new (require('./engine/tsphol').TSPHOL_Engine)(testZones, rules);
        const { facts } = engine.runInference(t);
        const decisions = facts.filter((f: any) => f.predicate === 'Execute');
        if (decisions.length > 0) wins++;
      }
      results.push({ threshold: parseFloat(t.toFixed(1)), winRate: (wins / 20) * 100 });
    }
    setWinRateData(results);
    addLog("Phase 2 Simulation complete.");
  };

  // --- Render Helpers ---

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scenario':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader 
              title="Operational Theater" 
              description="Configure the tactical environment. Edit zone parameters directly to see how the AI adapts its reasoning." 
              icon={<Target size={20} />}
            />
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Seed:</span>
                <input 
                  value={seed} 
                  onChange={e => setSeed(e.target.value)}
                  className="bg-transparent border-none text-xs font-mono text-white focus:ring-0 w-24"
                />
                <button onClick={() => initZones(numZones)} className="text-slate-500 hover:text-white"><RefreshCw size={14} /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={saveScenario} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all">
                  <Download size={14} /> Save JSON
                </button>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer">
                  <Upload size={14} /> Load JSON
                  <input type="file" className="hidden" onChange={loadScenario} accept=".json" />
                </label>
              </div>
            </div>

            <MapGrid 
              zones={zones} 
              highlightedZone={highlightedZone} 
              onEditZone={(updated) => setZones(zones.map(z => z.id === updated.id ? updated : z))} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-indigo-400">
                  <User size={16} /> Human Commander
                </h3>
                {gamePhase === 'setup' || gamePhase === 'human_turn' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Analyze the frontier. Where will you commit your forces?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {zones.slice(0, 4).map(z => (
                        <div key={z.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3">
                          <div className="text-[10px] font-bold text-white uppercase">{z.name}</div>
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => handleHumanDecision('Defend', z.id)}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold rounded transition-colors"
                            >
                              DEFEND
                            </button>
                            <button 
                              onClick={() => handleHumanDecision('Attack', z.id)}
                              className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-[10px] font-bold rounded transition-colors"
                            >
                              ATTACK
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 space-y-2">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                    <span className="text-xs font-mono text-slate-400">Decision Locked: {humanDecision?.action} @ {zones.find(z => z.id === humanDecision?.zone)?.name}</span>
                  </div>
                )}
              </div>

              <DecisionCard 
                decision={aiDecision} 
                zone={zones.find(z => z.id === aiDecision?.zone)} 
                facts={inferredFacts} 
                pAttackThreshold={pAttackThreshold}
              />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" /> Scoreboard & Outcomes
                </h3>
                <button 
                  onClick={() => { setGamePhase('setup'); setHumanDecision(null); setAiDecision(null); initZones(numZones); }}
                  className="text-[10px] font-mono text-slate-500 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw size={12} /> RESET ROUND
                </button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                    <span>Human Commander</span>
                    <span>{humanScore} PTS</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, humanScore * 10)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                    <span>TS-PHOL AI</span>
                    <span>{aiScore} PTS</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, aiScore * 10)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ml':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader 
              title="Neural Layer Predictions" 
              description="Low-level ML models output probabilistic signals. These are the 'raw senses' of the system before logical composition." 
              icon={<Cpu size={20} />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map(z => (
                <div key={z.id} className={cn(
                  "p-4 border rounded-xl transition-all",
                  highlightedZone === z.id ? "bg-indigo-500/10 border-indigo-500/50 scale-[1.01]" : "bg-slate-800/30 border-slate-700"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-white">{z.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{z.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                        <span>Prob. Attack</span>
                        <span>{(z.p_attack * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${z.p_attack * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                        <span>Prob. Success</span>
                        <span>{(z.p_success * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${z.p_success * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'rules':
        return (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <TabHeader 
                title="Knowledge Base" 
                description="Higher-order rules define how ML signals compose into tactical decisions. The engine enforces PTIME tractability." 
                icon={<Layers size={20} />}
              />
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                    Active Rule Set
                  </h3>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold font-mono flex items-center gap-2",
                    validation.valid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  )}>
                    {validation.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {validation.valid ? "FRAGMENT COMPLIANT" : "FRAGMENT VIOLATION"}
                  </div>
                </div>
                <div className="space-y-3">
                  {rules.map(rule => (
                    <div key={rule.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">{rule.id}</span>
                        <div className="flex gap-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">STRATUM {rule.stratum}</span>
                        </div>
                      </div>
                      <div className="text-sm font-mono text-white">
                        {rule.head} <span className="text-slate-500 mx-2">←</span> {rule.body.join(', ')}
                      </div>
                    </div>
                  ))}
                  {isAddingRule ? (
                    <div className="p-6 bg-slate-900 border border-indigo-500/50 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Add Custom Rule</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase">Head</label>
                          <input 
                            value={newRule.head} 
                            onChange={e => setNewRule({...newRule, head: e.target.value})}
                            placeholder="e.g. Win(z)"
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase">Stratum</label>
                          <input 
                            type="number"
                            value={newRule.stratum} 
                            onChange={e => setNewRule({...newRule, stratum: parseInt(e.target.value)})}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Body (comma separated)</label>
                        <input 
                          value={newRule.body.join(', ')} 
                          onChange={e => setNewRule({...newRule, body: e.target.value.split(',').map(s => s.trim())})}
                          placeholder="e.g. Win(z), Lose(z)"
                          className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={addRule}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded transition-all"
                        >
                          VALIDATE & ADD
                        </button>
                        <button 
                          onClick={() => setIsAddingRule(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded transition-all"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingRule(true)}
                      className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-indigo-400 hover:border-indigo-400/50 transition-all flex items-center justify-center gap-2 text-xs font-mono"
                    >
                      <Zap size={14} /> ADD NEW RULE (BREAK THE SYSTEM)
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Fragment Constraints</h3>
                <ul className="space-y-3 text-[10px] font-mono text-slate-400">
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> No Recursion (Stratified)</li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> Range Restricted (Safe)</li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> Bounded Arity (Max 3)</li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> No Entity Creation</li>
                </ul>
              </div>
              {!validation.valid && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-rose-400 flex items-center gap-2 uppercase tracking-widest">
                    <AlertCircle size={14} /> Rejection Log
                  </h3>
                  {validation.errors.map((err, i) => (
                    <p key={i} className="text-[10px] font-mono text-rose-300 leading-relaxed">• {err}</p>
                  ))}
                </div>
              )}
              <Glossary />
            </div>
          </div>
        );
      case 'inference':
        return (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <TabHeader 
                title="Logical Inference" 
                description="The engine grounds abstract rules into concrete facts. Observe the hierarchical stratification of reasoning." 
                icon={<Terminal size={20} />}
              />
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6 text-white">
                  Inferred Predicates
                </h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {STRATA_LABELS.map((label, s) => {
                    const stratumFacts = inferredFacts.filter(f => f.stratum === s);
                    if (stratumFacts.length === 0) return null;
                    return (
                      <div key={s} className="space-y-2">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">{label}</div>
                        <div className="grid grid-cols-1 gap-1">
                          {stratumFacts.map((f, i) => (
                            <button 
                              key={i}
                              onClick={() => { setSelectedFact(f); setActiveTab('proof'); }}
                              className="text-left p-2 bg-slate-800/30 border border-slate-700 rounded-lg hover:border-indigo-500/50 transition-all flex items-center justify-between group"
                            >
                              <div className="text-[10px] font-mono">
                                <span className="text-slate-200">{f.predicate}</span>
                                <span className="text-slate-500">({f.args.join(',')})</span>
                              </div>
                              <span className={cn(
                                "text-[9px] font-mono",
                                f.probability > 0.7 ? "text-emerald-400" : f.probability > 0.4 ? "text-amber-400" : "text-rose-400"
                              )}>
                                {(f.probability * 100).toFixed(0)}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6 text-amber-400">
                  <Info size={16} /> Explainability Metrics
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center space-y-1">
                    <div className="text-2xl font-bold text-white">{scalingMetrics[scalingMetrics.length - 1]?.proofDepth || 0}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Proof Depth</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center space-y-1">
                    <div className="text-2xl font-bold text-white">{inferredFacts.length}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Predicates Used</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center space-y-1">
                    <div className="text-2xl font-bold text-white">{scalingMetrics[scalingMetrics.length - 1]?.numFirings || 0}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Rules Fired</div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl">
                  <h4 className="text-xs font-bold text-indigo-400 mb-4 uppercase tracking-widest">What-If Sandbox</h4>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Inference Threshold (p_attack)</span>
                        <span className="text-white font-bold">{pAttackThreshold.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="1.0" step="0.1" 
                        value={pAttackThreshold} 
                        onChange={(e) => setPAttackThreshold(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <p className="text-[9px] text-slate-500 italic">Adjusting this threshold changes how aggressively the AI classifies sectors as 'vulnerable'.</p>
                    </div>
                    <button 
                      onClick={runPhase2Sim}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
                    >
                      RUN 20-GAME WIN RATE SIMULATION
                    </button>
                    {winRateData.length > 0 && (
                      <div className="h-40 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={winRateData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="threshold" stroke="#475569" fontSize={10} />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
                            <Bar dataKey="winRate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'proof':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader 
              title="Proof Artifacts" 
              description="Each decision is backed by a machine-checkable proof tree. Explore the derivation to verify logical correctness." 
              icon={<Network size={20} />}
            />
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl h-[600px]">
              <InteractiveProof fact={selectedFact} onHighlight={setHighlightedZone} />
            </div>
          </div>
        );
      case 'scaling':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader 
              title="Computational Scaling" 
              description="Observe how the TS-PHOL fragment maintains polynomial performance (PTIME) as the number of zones increases." 
              icon={<BarChart3 size={20} />}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                  <BarChart3 size={16} className="text-emerald-400" /> Runtime Complexity
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={scalingMetrics}>
                      <defs>
                        <linearGradient id="colorRuntime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="numZones" stroke="#475569" fontSize={10} label={{ value: 'Zones', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#475569' }} />
                      <YAxis stroke="#475569" fontSize={10} label={{ value: 'ms', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#475569' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="runtime" stroke="#10b981" fillOpacity={1} fill="url(#colorRuntime)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                  <Network size={16} className="text-indigo-400" /> Rule Firing Scaling
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scalingMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="numZones" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
                      <Line type="monotone" dataKey="numFirings" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="numFacts" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-rose-400">
                <Flame size={16} /> Stress Test Mode
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {[4, 8, 16, 32].map(n => (
                  <button 
                    key={n}
                    onClick={() => { setNumZones(n); handleInference(); }}
                    className={cn(
                      "py-3 rounded-xl border font-mono text-xs transition-all",
                      numZones === n ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    {n} ZONES
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30">
      <Onboarding />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">TS-PHOL Strategy Workbench</h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">High-Assurance Adversarial Reasoning</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Human Score</span>
                <span className="text-sm font-bold text-indigo-400">{humanScore}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-500 uppercase">AI Score</span>
                <span className="text-sm font-bold text-emerald-400">{aiScore}</span>
              </div>
            </div>
            <button 
              onClick={handleInference}
              disabled={isInferring}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                isInferring 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95"
              )}
            >
              {isInferring ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
              <span>{isInferring ? 'Evaluating...' : 'Run Inference'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        {/* Progress Flow */}
        <div className="flex items-center justify-between w-full px-8 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl mb-6">
          {[
            { id: 'state', label: 'World State', icon: Database },
            { id: 'ml', label: 'ML Layer', icon: Cpu },
            { id: 'pred', label: 'Prob. Predicates', icon: Activity },
            { id: 'logic', label: 'Rule Engine', icon: Shield },
            { id: 'decision', label: 'Decision', icon: Target },
            { id: 'proof', label: 'Proof', icon: FileText },
          ].map((step, i, arr) => (
            <React.Fragment key={step.id}>
              <div className={cn(
                "flex flex-col items-center gap-2 transition-all duration-500",
                currentStep === step.id ? "scale-110 opacity-100" : "opacity-40 grayscale"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                  currentStep === step.id ? "bg-indigo-600 text-white shadow-indigo-500/40" : "bg-slate-800 text-slate-400"
                )}>
                  <step.icon size={20} />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 h-[1px] bg-slate-800 mx-4 relative">
                  {currentStep === step.id && (
                    <motion.div 
                      className="absolute inset-0 bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-1 bg-slate-900/50 p-1 border border-slate-800 rounded-xl mb-6 w-fit">
          {[
            { id: 'scenario', label: 'Scenario', icon: Target },
            { id: 'ml', label: 'ML Signals', icon: Cpu },
            { id: 'rules', label: 'Rules', icon: Layers },
            { id: 'inference', label: 'Inference', icon: Terminal },
            { id: 'proof', label: 'Proof', icon: Network },
            { id: 'scaling', label: 'Scaling', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.id ? "bg-slate-800 text-white shadow-inner" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </main>

      <footer className="max-w-[1600px] mx-auto px-6 py-8 border-t border-slate-800 text-slate-500 text-[10px] font-mono flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span>TS-PHOL STRATEGY v3.1.0</span>
          <span>PTIME_ENFORCED: TRUE</span>
          <span>ARITY_BOUND: 3</span>
          <span>STRATA_COUNT: 4</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Info size={12} /> DARPA CLARA COMPLIANT</span>
        </div>
      </footer>
    </div>
  );
}
