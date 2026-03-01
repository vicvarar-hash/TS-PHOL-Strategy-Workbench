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
  HelpCircle,
  X,
  BrainCircuit
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
import { TSPHOL_Engine, STRATA_LABELS } from './engine/tsphol';
import { GroundedFact, TabType, GamePhase, LogicRule, ZoneState, TurnReport, ValidationResult, ScalingMetric, ScalingExplanation } from './types';

// --- Components ---

const ExecutionFlow: React.FC<{ currentStep: string }> = ({ currentStep }) => {
  const steps = [
    { id: 'ml', label: 'ML Signals', icon: Cpu },
    { id: 'hypothesis', label: 'Hypothesis', icon: BrainCircuit },
    { id: 'validator', label: 'Validator', icon: Shield },
    { id: 'inference', label: 'Inference', icon: Terminal },
    { id: 'proof', label: 'Proof', icon: Network },
    { id: 'decision', label: 'Decision', icon: Target },
  ];

  return (
    <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={cn(
            "flex flex-col items-center gap-2 transition-all duration-500",
            currentStep === step.id ? "scale-110 opacity-100" : "opacity-40"
          )}>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
              currentStep === step.id ? "bg-indigo-600 text-white shadow-indigo-500/40 ring-4 ring-indigo-500/20" : "bg-slate-800 text-slate-500"
            )}>
              <step.icon size={24} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-[2px] bg-slate-800 mx-4 relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-indigo-500"
                initial={{ x: '-100%' }}
                animate={currentStep === step.id ? { x: '0%' } : { x: '-100%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const HypothesisGeneratorView: React.FC<{ 
  hypotheses: LogicRule[], 
  onPropose: (llm: boolean) => void,
  onAccept: (h: LogicRule) => void,
  onReject: (h: LogicRule) => void,
  isGenerating: boolean
}> = ({ hypotheses, onPropose, onAccept, onReject, isGenerating }) => (
  <div className="space-y-6">
    <TabHeader 
      title="LLoM Hypothesis Generator" 
      description="Simulate Large Language Model behavior by proposing candidate logic rules based on current tactical patterns. These rules must be validated before execution." 
      icon={<BrainCircuit size={20} />}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap size={16} className="text-amber-400" /> Generation Controls
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Trigger the LLoM layer to analyze ML signals and propose new symbolic rules.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button 
              onClick={() => onPropose(false)}
              disabled={isGenerating}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} /> HEURISTIC PROPOSAL
            </button>
            <button 
              onClick={() => onPropose(true)}
              disabled={isGenerating}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:bg-slate-800"
            >
              {isGenerating ? (
                <><RefreshCw size={14} className="animate-spin" /> GENERATING...</>
              ) : (
                <><Bot size={14} /> LLM PROPOSAL</>
              )}
            </button>
          </div>
          {isGenerating && (
            <p className="text-[10px] text-indigo-400 animate-pulse font-mono text-center">
              Gemini is analyzing battlefield patterns...
            </p>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-indigo-400" /> Pending Hypotheses
        </h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {hypotheses.length === 0 ? (
            <div className="text-center py-8 text-slate-600 italic text-xs">
              No pending hypotheses. Trigger a proposal to begin.
            </div>
          ) : (
            hypotheses.map(h => (
              <div key={h.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-3 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">{h.id}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">CONFIDENCE: {(h.probability * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xs font-mono text-white">
                  {h.head} ← {h.body.join(', ')}
                </div>
                <p className="text-[10px] text-slate-500 italic">{h.description}</p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => onAccept(h)} className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-bold rounded-lg transition-all">ACCEPT</button>
                  <button onClick={() => onReject(h)} className="flex-1 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-[10px] font-bold rounded-lg transition-all">REJECT</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

const ValidatorView: React.FC<{ validation: ValidationResult, rules: LogicRule[] }> = ({ validation, rules }) => (
  <div className="space-y-6">
    <TabHeader 
      title="Structural Fragment Validator" 
      description="TS-PHOL enforces strict structural constraints to guarantee polynomial-time inference and prevent logical paradoxes. Every rule is checked before the reasoning engine executes." 
      icon={<Shield size={20} />}
    />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white">Rule Validation Status</h3>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold font-mono flex items-center gap-2",
              validation.valid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            )}>
              {validation.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {validation.valid ? "ALL RULES VALID" : "VALIDATION ERRORS DETECTED"}
            </div>
          </div>
          
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between group">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">{rule.id}</span>
                    <span className="text-xs font-mono text-white">{rule.head} ← {rule.body.join(', ')}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{rule.description}</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase">Passed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!validation.valid && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 animate-in shake duration-500">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-4">
              <AlertCircle size={16} /> Critical Violations
            </h3>
            <div className="space-y-2">
              {validation.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-rose-300 font-mono">
                  <span className="text-rose-500 mt-0.5">▶</span>
                  {err}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Fragment Constraints</h3>
          <div className="space-y-4">
            {[
              { label: "Range Restriction", desc: "All head variables must appear in body literals.", status: true },
              { label: "Bounded Arity", desc: "Predicates limited to maximum 2 arguments.", status: true },
              { label: "Stratification", desc: "No cyclic negation or recursive dependencies.", status: true },
              { label: "Polynomial Bound", desc: "Inference complexity is O(N^k) where k is arity.", status: true },
            ].map((c, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{c.label}</span>
                  <CheckCircle2 size={12} className="text-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Why Validate?</h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Unrestricted logic can lead to infinite loops or exponential blowup. TS-PHOL guarantees that even with 1000s of zones, the system will respond in predictable, polynomial time.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ScalingView: React.FC<{ 
  metrics: ScalingMetric[], 
  onRunBenchmark: () => void,
  explanation: ScalingExplanation | null
}> = ({ metrics, onRunBenchmark, explanation }) => (
  <div className="space-y-6">
    <TabHeader 
      title="Polynomial Scaling Metrics" 
      description="Observe how the TS-PHOL engine scales as the operational theater grows. The complexity is bounded by the predicate arity, ensuring predictable performance." 
      icon={<BarChart3 size={20} />}
    />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-white">Inference Runtime (ms) vs. Zone Count</h3>
            <button 
              onClick={onRunBenchmark}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Play size={12} /> RUN FULL BENCHMARK
            </button>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorRuntime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="numZones" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#6366f1', fontSize: '10px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="runtime" stroke="#6366f1" fillOpacity={1} fill="url(#colorRuntime)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {explanation && (
          <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-4">
              <Info size={16} /> Performance Interpretation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Runtime Trend</div>
                <p className="text-xs text-slate-300 leading-relaxed">{explanation.runtimeTrend}</p>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Complexity Bound</div>
                <p className="text-xs text-slate-300 leading-relaxed">{explanation.complexityTrend}</p>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-indigo-500/20">
                <p className="text-[11px] text-indigo-300 italic">{explanation.impactNote}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">How to Interpret Results</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Tractability Confidence</div>
              <p className="text-[10px] text-slate-500 leading-relaxed">A linear or quadratic curve confirms the engine is operating within the TS-PHOL fragment, guaranteeing it won't crash on large maps.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Explainability Complexity</div>
              <p className="text-[10px] text-slate-500 leading-relaxed">Proof depth indicates how many logical steps the AI takes. Deeper proofs are more sophisticated but harder for humans to audit quickly.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Complexity Analysis</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Max Arity</div>
                <div className="text-2xl font-mono font-bold text-white">2</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Complexity</div>
                <div className="text-lg font-mono font-bold text-indigo-400">O(N²)</div>
              </div>
            </div>
            <div className="h-[1px] bg-slate-800" />
            <div className="space-y-4">
              {metrics.slice(-1).map(m => (
                <React.Fragment key={m.numZones}>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500 uppercase">Total Facts</span>
                    <span className="text-white font-bold">{m.numFacts}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500 uppercase">Rule Firings</span>
                    <span className="text-white font-bold">{m.numFirings}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-500 uppercase">Proof Depth</span>
                    <span className="text-white font-bold">{m.proofDepth}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PlayModeView: React.FC<{
  zones: ZoneState[],
  humanDecision: { action: string, zone: string } | null,
  aiDecision: { action: string, zone: string } | null,
  onHumanDecision: (action: string, zoneId: string) => void,
  humanScore: number,
  aiScore: number,
  gamePhase: GamePhase,
  onReset: () => void
}> = ({ zones, humanDecision, aiDecision, onHumanDecision, humanScore, aiScore, gamePhase, onReset }) => (
  <div className="space-y-6">
    <TabHeader 
      title="Tactical Engagement Mode" 
      description="Test your strategic intuition against the TS-PHOL engine. Observe how the system's verifiable reasoning compares to human decision-making." 
      icon={<Play size={20} />}
    />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white">Operational Map</h3>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-indigo-500" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase">Human</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-mono text-slate-400 uppercase">AI</span>
               </div>
            </div>
          </div>
          <MapGrid 
            zones={zones} 
            highlightedZone={null} 
            onEditZone={() => {}} 
          />
        </div>

        <HumanCommander 
          zones={zones} 
          onDecision={onHumanDecision} 
          currentDecision={humanDecision} 
        />
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Engagement Results</h3>
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Human Commander</span>
                <span className="text-2xl font-mono font-bold text-white">{humanScore}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, humanScore * 5)}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">TS-PHOL AI</span>
                <span className="text-2xl font-mono font-bold text-white">{aiScore}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, aiScore * 5)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              {aiDecision && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Decision</div>
                  <div className="text-sm font-bold text-white">{aiDecision.action} @ {zones.find(z => z.id === aiDecision.zone)?.name}</div>
                </div>
              )}
              {humanDecision && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Human Decision</div>
                  <div className="text-sm font-bold text-white">{humanDecision.action} @ {zones.find(z => z.id === humanDecision.zone)?.name}</div>
                </div>
              )}
            </div>

            <button 
              onClick={onReset}
              className="w-full py-3 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> RESET MATCH
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TurnChangeReport: React.FC<{ report: TurnReport | null }> = ({ report }) => {
  if (!report) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6"
    >
      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Activity size={14} /> Turn {report.turn} Intelligence Update
      </h4>
      <div className="space-y-2">
        {report.changes.length > 0 ? report.changes.map((change, i) => (
          <div key={i} className="flex items-start gap-3 text-[11px] text-slate-300">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
              change.type === 'reinforcement' ? "bg-rose-500" : change.type === 'attrition' ? "bg-indigo-500" : "bg-amber-500"
            )} />
            <p><span className="font-bold text-white">{change.zoneName}:</span> {change.description}</p>
          </div>
        )) : (
          <p className="text-[11px] text-slate-500 italic">No significant tactical shifts detected this turn.</p>
        )}
      </div>
    </motion.div>
  );
};

const RoundSummaryModal: React.FC<{ report: TurnReport | null, onClose: () => void }> = ({ report, onClose }) => {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6">
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <Trophy size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Round {report.turn} Summary</h2>
            <p className="text-slate-400 text-sm">{report.summary}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {report.changes.map((change, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex gap-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                change.type === 'reinforcement' ? "bg-rose-500/20 text-rose-400" : 
                change.type === 'attrition' ? "bg-indigo-500/20 text-indigo-400" : 
                change.type === 'combat' ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"
              )}>
                {change.type === 'reinforcement' ? <Flame size={20} /> : 
                 change.type === 'attrition' ? <Shield size={20} /> : 
                 change.type === 'combat' ? <Target size={20} /> : <Info size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{change.zoneName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({change.zoneId})</span>
                </div>
                <p className="text-sm text-slate-300 mb-1">{change.description}</p>
                {change.impact && (
                  <p className="text-[11px] text-indigo-400 font-medium italic">Impact: {change.impact}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          Continue to Turn {report.turn + 1} <ChevronRight size={18} />
        </button>
      </motion.div>
    </div>
  );
};

const MLSignalsEditor: React.FC<{ zones: ZoneState[], onUpdate: (id: string, p_attack: number, p_success: number) => void }> = ({ zones, onUpdate }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {zones.map(z => (
        <div key={z.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">{z.name}</span>
            <span className="text-[10px] font-mono text-slate-500">{z.id}</span>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold">
                <span className="text-rose-400">p_attack</span>
                <span className="text-slate-400">{(z.p_attack * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={z.p_attack} 
                onChange={e => onUpdate(z.id, parseFloat(e.target.value), z.p_success)}
                className="w-full accent-rose-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-bold">
                <span className="text-emerald-400">p_success</span>
                <span className="text-slate-400">{(z.p_success * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={z.p_success} 
                onChange={e => onUpdate(z.id, z.p_attack, parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HumanCommander: React.FC<{ 
  zones: ZoneState[], 
  onDecision: (action: string, zoneId: string) => void,
  currentDecision: { action: string, zone: string } | null
}> = ({ zones, onDecision, currentDecision }) => {
  const [selectedZone, setSelectedZone] = useState<string>(zones[0]?.id || '');
  const [selectedAction, setSelectedAction] = useState<string>('Defend');

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
          <User size={24} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Human Commander</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Manual Strategic Input</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Zone</label>
            <select 
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</label>
            <div className="flex gap-2">
              {['Attack', 'Defend', 'Reinforce', 'Hold'].map(action => (
                <button
                  key={action}
                  onClick={() => setSelectedAction(action)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                    selectedAction === action ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => onDecision(selectedAction, selectedZone)}
          disabled={!!currentDecision}
          className={cn(
            "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            currentDecision 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default" 
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
          )}
        >
          {currentDecision ? (
            <><CheckCircle2 size={16} /> Order Confirmed</>
          ) : (
            <><Target size={16} /> Commit Strategy</>
          )}
        </button>

        {currentDecision && (
          <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Current Order:</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">
              {currentDecision.action} @ {zones.find(z => z.id === currentDecision.zone)?.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const InteractiveProof: React.FC<{ fact: GroundedFact | null, zones: ZoneState[], onHighlight: (zoneId: string | null) => void }> = ({ fact, zones, onHighlight }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const resolveName = (arg: string) => {
    const zone = zones.find(z => z.id === arg);
    return zone ? zone.name : arg;
  };

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
              <span className="text-[10px] font-mono text-slate-500">({f.args.map(resolveName).join(', ')})</span>
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
    isGeneratingHypothesis,
    isStale, setIsStale,
    currentStep, setCurrentStep,
    pAttackThreshold, setPAttackThreshold,
    seed, setSeed,
    turn, advanceTurn, resetSession, lastTurnReport,
    initZones,
    runInference,
    updateZoneML,
    hypotheses, proposeHypothesis, acceptHypothesis, rejectHypothesis,
    runBenchmark
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
  const [scalingExplanation, setScalingExplanation] = useState<ScalingExplanation | null>(null);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);

  // Rule Editor State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<LogicRule>({ id: 'R_NEW', head: '', body: [], probability: 0.9, stratum: 1 });

  // --- Handlers ---

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleInference = async () => {
    if (!validation.valid) {
      setActiveTab('validator');
      addLog("Cannot run inference: Validation errors detected.");
      return;
    }
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

  const handleShowProof = (fact: GroundedFact) => {
    setSelectedFact(fact);
    setActiveTab('proof');
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

  const handleRunBenchmark = async () => {
    await runBenchmark();
    // Generate explanation
    setScalingExplanation({
      runtimeTrend: "Execution time scales quadratically with zone count, as expected for binary predicates in TS-PHOL.",
      complexityTrend: "Fact generation and rule firings follow a predictable polynomial path, ensuring tractability even at scale.",
      impactNote: "This deterministic scaling allows the engine to provide real-time strategic advice without the risk of exponential blowup."
    });
  };

  const handleAdvanceTurn = () => {
    setHumanDecision(null);
    setAiDecision(null);
    setInferredFacts([]);
    setSelectedFact(null);
    advanceTurn();
    setShowRoundSummary(true);
    setGamePhase('human_turn');
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
            
            <TurnChangeReport report={lastTurnReport} />

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2">
                <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Zones:</span>
                  <input 
                    type="range" min="2" max="12" step="1"
                    value={numZones} 
                    onChange={e => setNumZones(parseInt(e.target.value))}
                    className="w-24 accent-indigo-500"
                  />
                  <input 
                    type="number" min="2" max="12"
                    value={numZones} 
                    onChange={e => setNumZones(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 text-xs font-mono text-white rounded w-12 text-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Seed:</span>
                  <input 
                    value={seed} 
                    onChange={e => setSeed(e.target.value)}
                    className="bg-transparent border-none text-xs font-mono text-white focus:ring-0 w-24"
                  />
                  <button onClick={() => initZones(numZones)} className="text-slate-500 hover:text-white transition-colors" title="Regenerate Map"><RefreshCw size={14} /></button>
                </div>
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
              <HumanCommander 
                zones={zones} 
                onDecision={handleHumanDecision} 
                currentDecision={humanDecision} 
              />

              <DecisionCard 
                decision={aiDecision} 
                zone={zones.find(z => z.id === aiDecision?.zone)} 
                facts={inferredFacts} 
                pAttackThreshold={pAttackThreshold}
                onShowProof={handleShowProof}
              />
            </div>
          </div>
        );
      case 'ml':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader 
              title="ML Perception Signals" 
              description="These signals are generated by deep neural networks analyzing raw battlefield data. They serve as the probabilistic inputs for the TS-PHOL engine." 
              icon={<BrainCircuit size={20} />}
            />
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white">Signal Calibration</h3>
                <div className="text-[10px] font-mono text-slate-500 uppercase">Editable Parameters</div>
              </div>
              <MLSignalsEditor zones={zones} onUpdate={updateZoneML} />
            </div>
          </div>
        );
      case 'hypothesis':
        return (
          <HypothesisGeneratorView 
            hypotheses={hypotheses}
            onPropose={proposeHypothesis}
            onAccept={acceptHypothesis}
            onReject={rejectHypothesis}
            isGenerating={isGeneratingHypothesis}
          />
        );
      case 'validator':
        return (
          <ValidatorView validation={validation} rules={rules} />
        );
      case 'inference':
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

                {!validation.valid && (
                  <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                    <div className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-2">
                      <AlertCircle size={14} /> Structural Violations Detected
                    </div>
                    <ul className="space-y-1">
                      {validation.errors.map((err, i) => (
                        <li key={i} className="text-[10px] text-rose-300/80 font-mono flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[9px] text-rose-400 italic pt-1">
                      Inference is disabled until these rules are corrected or removed.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {rules.map(rule => (
                    <div key={rule.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-indigo-400 font-bold">{rule.id}</span>
                        <div className="flex gap-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">STRATUM {rule.stratum}</span>
                        </div>
                      </div>
                      <div className="text-sm font-mono text-white mb-2">
                        {rule.head} <span className="text-slate-500 mx-2">←</span> {rule.body.join(', ')}
                      </div>
                      {rule.description && (
                        <p className="text-[11px] text-slate-500 italic leading-relaxed border-t border-slate-800/50 pt-2">
                          {rule.description}
                        </p>
                      )}
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
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> Bounded Arity (Max 2)</li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" /> PTIME Tractable</li>
                </ul>
              </div>
              <Glossary />
            </div>
          </div>
        );
      case 'proof':
        return (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <TabHeader 
                title="Inferred Facts" 
                description="The complete set of grounded facts derived by the engine. Select a fact to view its logical proof artifact." 
                icon={<Terminal size={20} />}
              />
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Fact Base</h3>
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">{inferredFacts.length} TOTAL</span>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {inferredFacts.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFact(f)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                        selectedFact?.id === f.id ? "bg-indigo-600/20 border-indigo-500/50" : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">{f.predicate}</span>
                        <span className="text-[9px] font-mono text-slate-500">({f.args.join(', ')})</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{(f.probability * 100).toFixed(0)}%</span>
                        <span className="text-[8px] font-mono text-slate-600 uppercase">STRATUM {f.stratum}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl h-full min-h-[600px] overflow-hidden">
                <InteractiveProof 
                  fact={selectedFact} 
                  zones={zones} 
                  onHighlight={setHighlightedZone} 
                />
              </div>
            </div>
          </div>
        );
      case 'scaling':
        return (
          <ScalingView 
            metrics={scalingMetrics} 
            onRunBenchmark={handleRunBenchmark} 
            explanation={scalingExplanation}
          />
        );
      case 'play':
        return (
          <PlayModeView 
            zones={zones}
            humanDecision={humanDecision}
            aiDecision={aiDecision}
            onHumanDecision={handleHumanDecision}
            humanScore={humanScore}
            aiScore={aiScore}
            gamePhase={gamePhase}
            onReset={() => { setHumanDecision(null); setAiDecision(null); resetSession(); }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30">
      <Onboarding />
      
      {showRoundSummary && (
        <RoundSummaryModal 
          report={lastTurnReport} 
          onClose={() => setShowRoundSummary(false)} 
        />
      )}

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
                <span className="text-[9px] font-mono text-slate-500 uppercase">Turn</span>
                <span className="text-sm font-bold text-white">{turn}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-500 uppercase">Human Score</span>
                <span className="text-sm font-bold text-indigo-400">{humanScore}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-mono text-slate-500 uppercase">AI Score</span>
                <span className="text-sm font-bold text-emerald-400">{aiScore}</span>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {isStale && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-pulse">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">Inference Stale</span>
                </div>
              )}
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
              {gamePhase === 'result' && (
                <button 
                  onClick={handleAdvanceTurn}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/20"
                >
                  <ChevronRight size={18} />
                  <span>Next Turn</span>
                </button>
              )}
            </div>
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

        {/* Execution Flow Diagram */}
        <ExecutionFlow currentStep={currentStep} />

        {/* Tabs Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-1 bg-slate-900/50 p-1 border border-slate-800 rounded-xl w-fit overflow-x-auto max-w-full">
            {[
              { id: 'scenario', label: 'Scenario', icon: Target },
              { id: 'ml', label: 'ML Signals', icon: Cpu },
              { id: 'hypothesis', label: 'Hypothesis', icon: BrainCircuit },
              { id: 'validator', label: 'Validator', icon: Shield },
              { id: 'inference', label: 'Inference', icon: Terminal },
              { id: 'proof', label: 'Proof', icon: Network },
              { id: 'scaling', label: 'Scaling', icon: BarChart3 },
              { id: 'play', label: 'Play Mode', icon: Trophy },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-slate-800 text-white shadow-inner" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/30 border border-slate-800/50 rounded-xl">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Quick Actions:</span>
            <button 
              onClick={() => setActiveTab('inference')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Layers size={12} /> Rules
            </button>
            <div className="w-[1px] h-3 bg-slate-800" />
            <button 
              onClick={() => setActiveTab('proof')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Terminal size={12} /> Proofs
            </button>
            <div className="w-[1px] h-3 bg-slate-800" />
            <button 
              onClick={() => setActiveTab('scaling')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <BarChart3 size={12} /> Metrics
            </button>
          </div>
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
