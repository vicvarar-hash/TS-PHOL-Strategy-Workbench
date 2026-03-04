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
  BrainCircuit,
  Square,
  TerminalSquare
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
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { Onboarding } from './components/Onboarding';
import { DecisionCard } from './components/DecisionCard';
import { MapGrid } from './components/MapGrid';
import { TSPHOL_Engine, STRATA_LABELS } from './engine/tsphol';
import { useInference, DOMAIN_MAPPING, DomainPreset } from './hooks/useInference';
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
  isGenerating: boolean,
  humanIntent: string,
  onIntentChange: (val: string) => void,
  onProposeIntent: () => void,
  isConvertingIntent: boolean,
  isRetrievingContext: boolean,
  ragChunks: { source: string, text: string }[]
}> = ({ hypotheses, onPropose, onAccept, onReject, isGenerating, humanIntent, onIntentChange, onProposeIntent, isConvertingIntent, isRetrievingContext, ragChunks }) => (
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
          Trigger the LLoM layer to analyze ML signals or enter your strategic intent to propose new symbolic rules.
        </p>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategic Intent (Natural Language)</label>
            <textarea
              value={humanIntent}
              onChange={(e) => onIntentChange(e.target.value)}
              placeholder="e.g., If a zone is vulnerable and nearby enemy is strong, prioritize defense."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none"
            />
          </div>
          <button
            onClick={() => onProposeIntent()}
            disabled={isGenerating || isConvertingIntent || !humanIntent.trim()}
            className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[10px] font-bold rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isConvertingIntent ? (
              <><RefreshCw size={14} className="animate-spin" /> CONVERTING...</>
            ) : (
              <><BrainCircuit size={14} /> CONVERT INTENT TO RULE</>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/50">
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
              Gemini is processing battlefield context...
            </p>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-400" /> RAG Knowledge Base Context
        </h3>
        <div className="h-[300px] bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto custom-scrollbar font-mono text-xs relative">
          {ragChunks.length === 0 && !isRetrievingContext && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 italic">
              Waiting for intent queries to retrieve external context...
            </div>
          )}
          <div className="space-y-3">
            {ragChunks.map((chunk, i) => (
              <div key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-500 bg-slate-900 border border-slate-700/50 p-3 rounded flex flex-col gap-1">
                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> {chunk.source}</span>
                <span className="text-slate-300 leading-relaxed">"{chunk.text}"</span>
              </div>
            ))}
            {isRetrievingContext && (
              <div className="text-emerald-400 animate-pulse flex items-center gap-2 text-[10px]">
                <RefreshCw className="animate-spin" size={12} /> querying vector database for tactical manuals...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
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


const ScalingView: React.FC<{
  metrics: ScalingMetric[],
  onRunBenchmark: () => void,
  explanation: ScalingExplanation | null,
  maxZones: number,
  setMaxZones: (val: number) => void,
  maxArity: number,
  setMaxArity: (val: number) => void,
  onExplain: () => void,
  isExplaining: boolean,
  onResetBenchmark: () => void
}> = ({ metrics, onRunBenchmark, explanation, maxZones, setMaxZones, maxArity, setMaxArity, onExplain, isExplaining, onResetBenchmark }) => (
  <div className="space-y-6">
    <TabHeader
      title="Polynomial Scaling Metrics"
      description="Observe how the TS-PHOL engine scales as the operational theater grows. The complexity is bounded by the predicate arity, ensuring predictable performance."
      icon={<BarChart3 size={20} />}
    />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Inference Runtime (ms) vs. Zone Count</h3>
              <p className="text-[10px] text-slate-500 mt-1">Benchmarking O(N^k) polynomial complexity</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Max Zones</span>
                <input
                  type="number"
                  value={maxZones}
                  onChange={(e) => setMaxZones(parseInt(e.target.value))}
                  className="w-12 bg-transparent border-none text-xs font-mono text-white focus:ring-0 text-center"
                />
              </div>
              <button
                onClick={onRunBenchmark}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Play size={12} /> RUN BENCHMARK
              </button>
              <button
                onClick={onResetBenchmark}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-xl transition-all flex items-center gap-2"
                title="Clear Plot History"
              >
                <RefreshCw size={12} /> RESET
              </button>
            </div>
          </div>

          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {metrics.length === 0 ? (
                <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 border border-slate-800/50 rounded-xl border-dashed">
                  <BarChart3 size={48} className="mb-4 text-slate-700" />
                  <p className="text-sm font-medium">No benchmark data available.</p>
                  <p className="text-xs text-slate-600 mt-1">Click "Run Benchmark" to execute the polynomial scaling tests.</p>
                </div>
              ) : (
                <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="numZones"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    allowDuplicatedCategory={false}
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Zone Count (N)', position: 'insideBottom', offset: -15, fontSize: 10, fill: '#475569' }}
                  />
                  <YAxis
                    dataKey="runtime"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Ms', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#475569' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                  />
                  {Array.from(new Set(metrics.map(m => m.runId))).map((runId, idx) => {
                    const runData = metrics.filter(m => m.runId === runId);
                    // Generate colors so previous runs fade or use distinct hues
                    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                    const color = colors[idx % colors.length];
                    const isLatest = idx === new Set(metrics.map(m => m.runId)).size - 1;
                    return (
                      <Line
                        key={runId}
                        data={runData}
                        type="monotone"
                        dataKey="runtime"
                        name={runId || 'Run'}
                        stroke={color}
                        strokeWidth={isLatest ? 3 : 1.5}
                        strokeOpacity={isLatest ? 1 : 0.6}
                        dot={{ r: isLatest ? 4 : 2, fill: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
              <Info size={16} /> Performance Interpretation
            </h3>
            <button
              onClick={onExplain}
              disabled={isExplaining || metrics.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isExplaining ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />}
              EXPLAIN SCALING WITH AI
            </button>
          </div>

          {explanation ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Runtime Trend</div>
                <div className="text-xs text-slate-300 leading-relaxed max-w-none prose prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5"><ReactMarkdown>{explanation.runtimeTrend}</ReactMarkdown></div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Complexity Bound</div>
                <div className="text-xs text-slate-300 leading-relaxed max-w-none prose prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5"><ReactMarkdown>{explanation.complexityTrend}</ReactMarkdown></div>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-indigo-500/20">
                <div className="text-[11px] text-indigo-300 italic font-serif leading-relaxed max-w-none prose prose-invert prose-p:my-1">
                  <ReactMarkdown>{explanation.impactNote}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-slate-500 italic">Run a benchmark and click "Explain" for an automated performance audit.</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 font-mono">Benchmark Controls</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Max Arity (k)</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold">O(N^{maxArity})</span>
              </div>
              <input
                type="range" min="1" max="4" step="1"
                value={maxArity}
                onChange={(e) => setMaxArity(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[9px] text-slate-600 italic">Upper bound on predicate arguments. Higher arity improves expressiveness but slows scaling.</p>
            </div>
            <div className="h-[1px] bg-slate-800" />
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Tractability Confidence</div>
              <p className="text-[10px] text-slate-500 leading-relaxed">A linear or quadratic curve confirms the engine is operating within the TS-PHOL fragment.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 font-mono">Complexity Analysis</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Current Arity</div>
                <div className="text-2xl font-mono font-bold text-white">{maxArity}</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Complexity</div>
                <div className="text-lg font-mono font-bold text-indigo-400">O(N{maxArity === 1 ? '' : maxArity === 2 ? '²' : maxArity === 3 ? '³' : '^' + maxArity})</div>
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

const ExplainButton: React.FC<{ context: string, data: any, className?: string }> = ({ context, data, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const handleExplain = async () => {
    setIsGenerating(true);
    setIsOpen(true);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setExplanation("Error: GEMINI_API_KEY not found in environment.");
      setIsGenerating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      let prompt = "";

      if (context === 'ruleset') {
        prompt = `
          You are a tactical reasoning engine compiling a "Commander's Guide to Active Operational Rules".
          Active Rules: ${JSON.stringify(data.rules.map((r: any) => ({ rule: r.head + ' <- ' + r.body.join(','), description: r.description })))}
          Summarize what the AI is collectively looking for and how it determines its final actions in 3 readable paragraphs. Do not mention individual rule IDs, synthesize the strategy.
        `;
      } else if (context === 'validator') {
        prompt = `
          You are an expert logician analyzing TS-PHOL rule stratification and structural constraints.
          Errors: ${JSON.stringify(data.errors)}
          Rules: ${JSON.stringify(data.rules)}
          Explain to the user exactly *why* their Datalog-style rules failed validation (e.g. cycle detected, strata error) in plain English and give concrete advice on how to fix it in 2 paragraphs.
        `;
      } else if (context === 'facts') {
        prompt = `
          You are an intelligence officer. Review all these facts just inferred by the logic engine.
          Facts: ${JSON.stringify(data.facts.map((f: any) => f.predicate + '(' + f.args.join(',') + ') = ' + (f.probability * 100).toFixed(0) + '%'))}
          Write a comprehensive 3 paragraph battlefield situation report summarizing the entire state of the map based solely on these derived facts. Highlight key clusters of Vulnerable/Reinforce/Execute facts.
        `;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      setExplanation(response.text || "Failed to generate explanation.");
    } catch (err) {
      setExplanation("API Error: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-start w-full">
      <button
        onClick={handleExplain}
        disabled={isGenerating}
        className={cn("px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all disabled:opacity-50", className)}
      >
        {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />}
        {context === 'ruleset' ? 'Explain Strategy' : context === 'validator' ? 'Explain Error' : 'Explain Battlefield'}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 w-full p-4 bg-slate-950 border border-slate-800 rounded-xl"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <BrainCircuit size={12} className="text-indigo-400" /> AI Diagnostic
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X size={12} /></button>
          </div>
          {isGenerating ? (
            <p className="text-xs text-slate-500 animate-pulse">Analyzing context via LLM...</p>
          ) : (
            <div className="text-[11px] text-slate-300 leading-relaxed md-content max-w-none prose prose-invert prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 pb-6 pr-4">
              <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

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


const InteractiveProof: React.FC<{
  fact: GroundedFact | null,
  zones: ZoneState[],
  onHighlight: (zoneId: string | null) => void,
  onSelectFact: (f: GroundedFact) => void,
  selectedFactId?: string
}> = ({ fact, zones, onHighlight, onSelectFact, selectedFactId }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const expandAll = () => {
    if (!fact) return;
    const allIds = new Set<string>();
    const gather = (f: GroundedFact) => {
      allIds.add(f.id);
      f.childFacts.forEach(gather);
    };
    gather(fact);
    setExpanded(allIds);
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };


  useEffect(() => {
    setExplanation(null);
    setExplainError(null);
  }, [fact?.id]);

  const explainFact = async () => {
    if (!fact) return;
    setIsExplaining(true);
    setExplanation(null);
    setExplainError(null);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setExplainError("GEMINI_API_KEY not found in environment. Please add it to your .env file.");
      setIsExplaining(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a military tactics AI teacher explaining a decision from a probabilistic logic engine to a human commander.
        
        The fact being derived is: ${fact.predicate}(${fact.args.map(a => zones.find(z => z.id === a)?.name || a).join(', ')})
        Confidence: ${(fact.probability * 100).toFixed(0)}%
        Generated via Rule ID: ${fact.ruleId || 'Axiom'}
        
        Sub-conditions (child facts) that led to this:
        ${fact.childFacts.length > 0 ? fact.childFacts.map(cf => `- ${cf.predicate}(${cf.args.join(', ')}): ${(cf.probability * 100).toFixed(0)}%`).join('\n') : 'None (Base Fact)'}
        
        Explain in under 3 concise sentences: 1) Why this recommendation was made intuitively, 2) How the confidence scores combine, and 3) What battlefield changes might invalidate this. Be strict on length.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      setExplanation(response.text || "Explanation could not be generated.");
    } catch (err) {
      console.error("Gemini explainer failed:", err);
      setExplainError("Failed to communicate with the Gemini API to generate an explanation.");
    } finally {
      setIsExplaining(false);
    }
  };

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
    const isSelected = f.id === selectedFactId;

    return (
      <div key={f.id} className="ml-4 border-l border-slate-800 pl-4 py-1">
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer group",
            isSelected ? "bg-indigo-500/20 ring-1 ring-indigo-500/50" : "hover:bg-slate-800/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectFact(f);
            if (hasChildren) toggle(f.id);
          }}
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
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 mr-4">
            <button onClick={expandAll} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 rounded transition-colors uppercase">
              Expand All
            </button>
            <button onClick={collapseAll} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 rounded transition-colors uppercase">
              Collapse All
            </button>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            PTIME VERIFIED
          </span>
        </div>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
        {renderNode(fact)}
      </div>

      <div className="bg-slate-950 border border-indigo-500/20 rounded-xl p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="flex items-center justify-between mb-3 relative z-10">
          <h4 className="text-[10px] font-bold text-white uppercase flex items-center gap-1.5">
            <BrainCircuit size={14} className="text-indigo-400" /> AI Teachable Moment
          </h4>
          <button
            onClick={explainFact}
            disabled={isExplaining}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold rounded flex items-center gap-1 uppercase transition-colors disabled:opacity-50"
          >
            {isExplaining ? <RefreshCw size={10} className="animate-spin" /> : <Bot size={10} />}
            {isExplaining ? 'Thinking...' : 'Explain with Gemini'}
          </button>
        </div>

        <div className="relative z-10">
          {explanation ? (
            <p className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-indigo-500 pl-3">
              {explanation}
            </p>
          ) : explainError ? (
            <div className="text-[10px] text-rose-400 flex items-start gap-1.5 p-2 bg-rose-500/10 rounded border border-rose-500/20">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <p>{explainError}</p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">
              Click the explain button to get a natural-language breakdown of this derivation.
            </p>
          )}
        </div>
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
        <span title="Why am I seeing this?"><HelpCircle size={14} className="text-slate-600 cursor-help" /></span>
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed mt-1">{description}</p>
    </div>
  </div>
);

const ToolExecutionConsole: React.FC<{ currentStep: string }> = ({ currentStep }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 font-mono text-xs mb-6 relative overflow-hidden shadow-2xl">
    <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
    <div className="flex items-center gap-2 mb-4 text-amber-500 border-b border-slate-800 pb-2">
      <TerminalSquare className="animate-pulse" size={16} />
      <span className="font-bold tracking-widest uppercase text-[10px]">Sub-Agent Active: ML-Drift Predictor</span>
    </div>
    <div className="space-y-2 text-slate-300">
      <div className="flex gap-2"><span className="text-slate-500">$</span> <span>Initializing Python environment...</span></div>
      {(currentStep === 'ml' || currentStep === 'hypothesis' || currentStep === 'validator' || currentStep === 'inference' || currentStep === 'decision') && (
        <div className="flex gap-2 animate-in fade-in duration-300"><span className="text-slate-500">$</span> <span className="text-emerald-400">Loading historical zone metrics... [OK]</span></div>
      )}
      {(currentStep === 'hypothesis' || currentStep === 'validator' || currentStep === 'inference' || currentStep === 'decision') && (
        <div className="flex gap-2 animate-in fade-in duration-300"><span className="text-slate-500">$</span> <span className="text-indigo-400">evaluating model.predict(neural_drift) ...</span></div>
      )}
      {(currentStep === 'inference' || currentStep === 'decision' || currentStep === 'proof') && (
        <div className="flex gap-2 animate-in fade-in duration-300"><span className="text-slate-500">$</span> <span className="text-amber-400">Outputting probabilistic bounds to AR Engine -&gt;</span></div>
      )}
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
  } = useInference();

  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('scenario');
  const [isIntelligenceEnabled, setIsIntelligenceEnabled] = useState(true);
  const [selectedFact, setSelectedFact] = useState<GroundedFact | null>(null);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [humanIntent, setHumanIntent] = useState('');

  // Game Mode State
  const [gamePhase, setGamePhase] = useState<GamePhase>('awaiting_inference');
  const [appliedFactIds, setAppliedFactIds] = useState<string[]>([]);
  const [scalingExplanation, setScalingExplanation] = useState<ScalingExplanation | null>(null);
  const [isExplainingScaling, setIsExplainingScaling] = useState(false);
  const [maxZonesBenchmark, setMaxZonesBenchmark] = useState(24);
  const [maxArityBenchmark, setMaxArityBenchmark] = useState(2);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [cumulativeStats, setCumulativeStats] = useState({ applied: 0, generated: 0 });

  // Rule Editor State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRule, setNewRule] = useState<LogicRule>({ id: 'R_NEW', head: '', body: [], probability: 0.9, stratum: 1 });
  const [isConvertingIntent, setIsConvertingIntent] = useState(false);
  const [isRetrievingContext, setIsRetrievingContext] = useState(false);
  const [ragChunks, setRagChunks] = useState<{ source: string, text: string }[]>([]);
  const [arEngine, setArEngine] = useState<'problog' | 'asp'>('problog');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<LogicRule | null>(null);

  // Initialize maxArityBenchmark based on current rules
  useEffect(() => {
    if (rules.length === 0) return;
    let maxFound = 1;

    rules.forEach(r => {
      const allAtoms = [r.head, ...r.body];
      allAtoms.forEach(atom => {
        const match = atom.match(/\((.*)\)/);
        if (match && match[1]) {
          const args = match[1].split(',').map(s => s.trim());
          if (args.length > maxFound) {
            maxFound = args.length;
          }
        }
      });
    });
    setMaxArityBenchmark(Math.min(4, Math.max(1, maxFound)));
  }, []);

  const mapping = DOMAIN_MAPPING[domain];

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
    setGamePhase('ai_evaluating');
    const result = await runInference();
    if (result) {
      const { facts } = result;
      // Note: inferredFacts is already managed by the hook, but we might want local state if needed
      // Actually the hook exports inferredFacts, so we just use that in the UI.
      setGamePhase('reviewing_recommendations');
      setIsStale(false);
      addLog(`Inference complete. ${facts.length} facts generated.`);
    } else {
      setGamePhase('awaiting_inference');
    }
  };

  const handleShowProof = (fact: GroundedFact) => {
    setSelectedFact(fact);
    setActiveTab('proof');
  };

  const handleApplyRecommendation = (action: string, zoneId: string, factId: string) => {
    if (appliedFactIds.includes(factId)) return;
    applyRecommendation(action, zoneId, factId);
    setAppliedFactIds(prev => [...prev, factId]);
    addLog(`Applied recommendation: ${action} in ${zoneId}.`);
  };

  const handleReset = () => {
    setAppliedFactIds([]);
    setSelectedFact(null);
    setHighlightedZone(null);
    setGamePhase('awaiting_inference');
    setCumulativeStats({ applied: 0, generated: 0 });
    resetSession();
    addLog("Session reset. Map regenerated.");
  };

  const handleAdvanceTurn = () => {
    if (appliedFactIds.length === 0) {
      addLog("Advancing turn without applying recommended actions.");
    }

    setCumulativeStats(prev => ({
      applied: prev.applied + appliedFactIds.length,
      generated: prev.generated + inferredFacts.length
    }));

    advanceTurn(isIntelligenceEnabled);

    // Reset for next turn
    setAppliedFactIds([]);
    setSelectedFact(null);
    setHighlightedZone(null);
    setGamePhase('awaiting_inference');
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
        const scenario = JSON.parse(event.target?.result as string);
        setSeed(scenario.seed);
        setNumZones(scenario.zones.length);
        setZones(scenario.zones);
        addLog(`Loaded scenario "${file.name}" successfully.`);
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
    addLog(`Added custom rule: ${newRule.head} <- ${newRule.body.join(', ')}`);
    setNewRule({ id: `R_CUSTOM_${Date.now().toString().slice(-4)}`, head: '', body: [], probability: 0.9, stratum: 1 });
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    addLog(`Deleted rule ${id}`);
  };

  const startEditRule = (rule: LogicRule) => {
    setEditingRuleId(rule.id);
    setEditingRule({ ...rule });
  };

  const saveEditRule = () => {
    if (!editingRule) return;
    setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
    setEditingRuleId(null);
    setEditingRule(null);
    addLog(`Updated rule ${editingRule.id}`);
  };

  const cancelEditRule = () => {
    setEditingRuleId(null);
    setEditingRule(null);
  };


  const handleProposeIntent = async () => {
    if (!humanIntent.trim()) return;
    setIsConvertingIntent(true);
    addLog("Analyzing strategic intent...");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      addLog("Error: GEMINI_API_KEY not found.");
      setIsConvertingIntent(false);
      return;
    }

    // Simulate RAG Retrieval
    setRagChunks([]);
    setIsRetrievingContext(true);
    await new Promise(r => setTimeout(r, 600));
    setRagChunks([{ source: "OpenRA Tactical Manual v1.2", text: "When hostile forces are proximal and zone is vulnerable, prioritize defense to prevent sector loss." }]);
    await new Promise(r => setTimeout(r, 600));
    setRagChunks(prev => [...prev, { source: "Historical ML Datasets (Run 42)", text: "Neural drift indicated p_attack > 0.8 usually precedes an invasion event." }]);
    await new Promise(r => setTimeout(r, 800));
    setIsRetrievingContext(false);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a symbolic logic expert. Convert this military strategy intention into one or more Datalog-style rules.
        Intent: "${humanIntent}"
        
        Variables: X, Y, Z
        Predicates: 
        - Vulnerable(X)
        - Strong(X)
        - Defend(X)
        - Attack(X)
        - Allied(X)
        - Hostile(X)
        - Proximal(X, Y)
        - Reinforced(X)
        
        Available RAG Context:
        ${ragChunks.map(c => `[${c.source}]: ${c.text}`).join('\n')}

        Example: "If a zone is vulnerable and has a proximal hostile that is strong, we should defend it"
        Output: [
          { 
            "head": "Defend(X)", 
            "body": ["Vulnerable(X)", "Proximal(X, Y)", "Hostile(Y)", "Strong(Y)"], 
            "description": "Prioritize defense for vulnerable zones near strong hostiles.",
            "confidence": 0.85 
          }
        ]
        
        Rules:
        1. Range restriction: All head variables MUST be in the body.
        2. Arity: Max 2.
        3. Output ONLY a valid JSON ARRAY of objects. Each object must have 'head', 'body' (array of strings), 'description', and 'confidence' (number between 0 and 1).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const text = response.text || "[]";
      // Extract the JSON array
      const startIdx = text.indexOf('[');
      const endIdx = text.lastIndexOf(']');

      if (startIdx === -1 || endIdx === -1) {
        throw new Error("LLM did not return a valid JSON array.");
      }

      const cleanJson = text.substring(startIdx, endIdx + 1);
      const parsedData = JSON.parse(cleanJson);

      const parsedArray = Array.isArray(parsedData) ? parsedData : [parsedData];

      const newRules: LogicRule[] = parsedArray.map((ruleData: any, index: number) => {
        const rule: LogicRule = {
          id: `R_INTENT_${Date.now().toString().slice(-4)}_${index}`,
          head: ruleData.head,
          body: ruleData.body,
          probability: ruleData.confidence ?? 0.8,
          stratum: 2,
          description: ruleData.description
        };

        // Check arity constraint
        const maxArityInRule = Math.max(
          ...[rule.head, ...rule.body].map(atom => atom.match(/\((.*)\)/)?.[1]?.split(',')?.length || 0)
        );

        if (maxArityInRule > maxArityBenchmark) {
          addLog(`Warning: Generated rule arity (${maxArityInRule}) exceeds Max Arity (${maxArityBenchmark}). The engine will still process it.`);
        }

        return rule;
      });

      setHypotheses(prev => [...newRules, ...prev]);
      setHumanIntent('');
      addLog(`LLM successfully translated intent to ${newRules.length} candidate logic rule(s).`);
    } catch (err) {
      addLog("Intent translation failed: " + (err as Error).message);
    } finally {
      setIsConvertingIntent(false);
    }
  };

  const handleRunBenchmark = async () => {
    addLog(`Running scaling benchmark up to ${maxZonesBenchmark} zones...`);
    await runBenchmark(maxZonesBenchmark);
    addLog("Benchmark complete.");
  };

  const handleExplainScaling = async () => {
    if (scalingMetrics.length === 0) return;
    setIsExplainingScaling(true);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      addLog("Error: GEMINI_API_KEY not found.");
      setIsExplainingScaling(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a performance architect analyzing a probabilistic logic engine.
        Benchmark Data(Runtime vs Zone Count):
        ${JSON.stringify(scalingMetrics)}
        
        System Parameters:
        - Max Arity(k): ${maxArityBenchmark}
      - Expected Complexity: O(N ^ ${maxArityBenchmark})
        
        Analyze the scaling trend. 
        1. Does it strictly follow the polynomial bound ?
        2. What is the projected runtime for 1000 zones ?
          3. Explain the meaning of "Proof Depth" in terms of strategic sophistication.
        
        Write a 3 - paragraph executive summary for the commander.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const text = response.text || "Failed to generate report.";
      const paragraphs = text.split('\n\n').filter(p => p.trim());

      setScalingExplanation({
        runtimeTrend: paragraphs[0] || "Trend analysis unavailable.",
        complexityTrend: paragraphs[1] || "Complexity analysis unavailable.",
        impactNote: paragraphs[2] || "Impact assessment unavailable."
      });
      addLog("AI Scaling Audit complete.");
    } catch (err) {
      addLog("Scaling analysis failed: " + (err as Error).message);
    } finally {
      setIsExplainingScaling(false);
    }
  };

  // --- Render Helpers ---

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scenario':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader
              title="Operational Theater"
              description="Analyze tactical recommendations and apply strategic actions. The TS-PHOL engine provides verifiable guidance for battlefield management."
              icon={<Target size={20} />}
            />

            <div className="flex justify-end mb-2 -mt-10 relative z-10 px-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-white transition-colors">Intelligence Updates</span>
                <div
                  className={cn("w-8 h-4 rounded-full transition-colors relative", isIntelligenceEnabled ? "bg-indigo-500" : "bg-slate-800")}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsIntelligenceEnabled(!isIntelligenceEnabled);
                  }}
                >
                  <div className={cn("absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm", isIntelligenceEnabled ? "left-4.5" : "left-0.5")} />
                </div>
              </label>
            </div>



            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                    gamePhase === 'awaiting_inference' ? "bg-amber-500 shadow-amber-500/50" :
                      gamePhase === 'ai_evaluating' ? "bg-indigo-500 shadow-indigo-500/50 animate-pulse" :
                        gamePhase === 'reviewing_recommendations' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-500"
                  )} />
                  <span className="text-[11px] font-bold text-white uppercase tracking-[0.15em]">
                    {gamePhase === 'awaiting_inference' ? 'Awaiting Intelligence Run' :
                      gamePhase === 'ai_evaluating' ? 'AI Evaluating Strategy' :
                        gamePhase === 'reviewing_recommendations' ? 'Reviewing Recommendations' : 'Turn Result Analyzed'}
                  </span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800" />
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase">Turn</span>
                    <span className="text-xs font-bold text-white">{turn}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {gamePhase === 'awaiting_inference' && (
                  <>
                    <button
                      onClick={handleInference}
                      disabled={isInferring}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg text-white shadow-indigo-500/20 active:scale-95",
                        isInferring ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
                      )}
                    >
                      {isInferring ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                      <span>{isInferring ? 'Evaluating...' : 'Run Inference'}</span>
                    </button>
                  </>
                )}

                {gamePhase === 'reviewing_recommendations' && (
                  <button
                    onClick={handleAdvanceTurn}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 active:scale-95"
                  >
                    <ChevronRight size={14} /> Next Turn
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all"
                >
                  <RefreshCw size={14} /> Reset Session
                </button>
              </div>
            </div>

            {isIntelligenceEnabled && (
              <div className="mb-6">
                <TurnChangeReport report={lastTurnReport} />
              </div>
            )}

            {currentStep !== 'ml' && (
              <ToolExecutionConsole currentStep={currentStep} />
            )}

            <div className="w-full">
              <DecisionCard
                facts={inferredFacts}
                zones={zones}
                domain={domain}
                onShowProof={handleShowProof}
                selectedFactId={selectedFact?.id}
                onApply={handleApplyRecommendation}
                appliedFactIds={appliedFactIds}
                disabled={gamePhase !== 'reviewing_recommendations'}
                cumulativeStats={cumulativeStats}
              />
            </div>

            <MapGrid
              zones={zones}
              domain={domain}
              highlightedZone={highlightedZone}
              onEditZone={(updated) => setZones(zones.map(z => z.id === updated.id ? updated : z))}
            />

            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2">

                <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Domain:</span>
                  <select
                    value={domain}
                    onChange={e => setDomain(e.target.value as DomainPreset)}
                    className="bg-slate-800 border border-slate-700 text-xs font-bold text-white rounded px-2 py-1 outline-none focus:border-indigo-500"
                    disabled={gamePhase !== 'awaiting_inference'}
                  >
                    <option value="abstract">Abstract Theater</option>
                    <option value="catan">Settlers of Catan</option>
                    <option value="openra">OpenRA Combat</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{mapping.zones}:</span>
                  <input
                    type="range" min="2" max="12" step="1"
                    value={numZones}
                    onChange={e => setNumZones(parseInt(e.target.value))}
                    className="w-24 accent-indigo-500"
                    disabled={gamePhase !== 'awaiting_inference'}
                  />
                  <input
                    type="number" min="2" max="12"
                    value={numZones}
                    onChange={e => setNumZones(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 text-xs font-mono text-white rounded w-12 text-center"
                    disabled={gamePhase !== 'awaiting_inference'}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Seed:</span>
                  <input
                    value={seed}
                    onChange={e => setSeed(e.target.value)}
                    className="bg-transparent border-none text-xs font-mono text-white focus:ring-0 w-24"
                    disabled={gamePhase !== 'awaiting_inference'}
                  />
                  <button
                    onClick={() => initZones(numZones)}
                    className="text-slate-500 hover:text-white transition-colors disabled:opacity-30"
                    title="Regenerate Map"
                    disabled={gamePhase !== 'awaiting_inference'}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveScenario} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all">
                  <Download size={14} /> Save
                </button>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer">
                  <Upload size={14} /> Load
                  <input type="file" className="hidden" onChange={loadScenario} accept=".json" />
                </label>
              </div>
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
            humanIntent={humanIntent}
            onIntentChange={setHumanIntent}
            onProposeIntent={handleProposeIntent}
            isConvertingIntent={isConvertingIntent}
            isRetrievingContext={isRetrievingContext}
            ragChunks={ragChunks}
          />
        );
      case 'validator':
        return (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <TabHeader
                title="Structural Fragment Validator & Knowledge Base"
                description="TS-PHOL enforces strict structural constraints to guarantee polynomial-time inference. Here you can edit logic rules and validate the system."
                icon={<Shield size={20} />}
              />
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                      Active Rule Set
                    </h3>
                    <div className="flex bg-slate-800 rounded p-1">
                      <button
                        onClick={() => setArEngine('problog')}
                        className={cn("px-2 py-0.5 text-[10px] uppercase font-bold rounded", arEngine === 'problog' ? "bg-amber-600/50 text-amber-100" : "text-slate-400 hover:text-white")}
                      >ProbLog</button>
                      <button
                        onClick={() => setArEngine('asp')}
                        className={cn("px-2 py-0.5 text-[10px] uppercase font-bold rounded", arEngine === 'asp' ? "bg-indigo-600/50 text-indigo-100" : "text-slate-400 hover:text-white")}
                      >ASP</button>
                    </div>
                    <ExplainButton
                      context="ruleset"
                      data={{ rules }}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 scale-90 origin-left"
                    />
                  </div>
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
                      {editingRuleId === rule.id && editingRule ? (
                        <div className="space-y-4 animate-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-indigo-400 font-bold">Editing {rule.id}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500 uppercase">Head</label>
                              <input
                                value={editingRule.head}
                                onChange={e => setEditingRule({ ...editingRule, head: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-slate-500 uppercase">Stratum</label>
                              <input
                                type="number"
                                value={editingRule.stratum}
                                onChange={e => setEditingRule({ ...editingRule, stratum: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-slate-500 uppercase">Body (comma separated)</label>
                            <input
                              value={editingRule.body.join(', ')}
                              onChange={e => setEditingRule({ ...editingRule, body: e.target.value.split(',').map(s => s.trim()) })}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={saveEditRule} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded transition-all">SAVE CHANGES</button>
                            <button onClick={cancelEditRule} className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded transition-all">CANCEL</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-indigo-400 font-bold">{rule.id}</span>
                            <div className="flex gap-2">
                              <button onClick={() => startEditRule(rule)} className="text-[9px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-mono transition-colors">EDIT</button>
                              <button onClick={() => deleteRule(rule.id)} className="text-[9px] px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-mono transition-colors">DELETE</button>
                              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono ml-2">STRATUM {rule.stratum}</span>
                            </div>
                          </div>
                          <div className="text-sm font-mono text-white mb-2">
                            {arEngine === 'problog' && <span className="text-amber-400 mr-2">{rule.probability.toFixed(2)} ::</span>}
                            {rule.head} <span className="text-slate-500 mx-2">:-</span> {rule.body.join(', ')}.
                          </div>
                          {rule.description && (
                            <p className="text-[11px] text-slate-500 italic leading-relaxed border-t border-slate-800/50 pt-2">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {isAddingRule ? (
                    <div className="p-6 bg-slate-900 border border-indigo-500/50 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200 mt-6">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Add Custom Rule</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase">Head</label>
                          <input
                            value={newRule.head}
                            onChange={e => setNewRule({ ...newRule, head: e.target.value })}
                            placeholder="e.g. Win(z)"
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase">Stratum</label>
                          <input
                            type="number"
                            value={newRule.stratum}
                            onChange={e => setNewRule({ ...newRule, stratum: parseInt(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Body (comma separated)</label>
                        <input
                          value={newRule.body.join(', ')}
                          onChange={e => setNewRule({ ...newRule, body: e.target.value.split(',').map(s => s.trim()) })}
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
                      className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-indigo-400 hover:border-indigo-400/50 transition-all flex items-center justify-center gap-2 text-xs font-mono mt-4"
                    >
                      <Zap size={14} /> ADD NEW RULE
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
        const topRecs = inferredFacts
          .filter(f => f.predicate === 'Execute' && f.probability > 0.01)
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 3);

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabHeader
              title="Logical Proof Artifacts"
              description="Inspect the symbolic derivation chains for the top recommendations. TS-PHOL guarantees that every action is logically grounded in tactical signals."
              icon={<Network size={20} />}
            />

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Top Recommendations</h3>
                  <div className="space-y-2">
                    {topRecs.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFact(f)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group",
                          selectedFact?.id === f.id ? "bg-indigo-600/20 border-indigo-500/50" : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">{f.predicate}({f.args.join(', ')})</span>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-500 font-mono">k={f.args.length}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">{(f.probability * 100).toFixed(0)}% Confidence</span>
                        </div>
                        <ChevronRight size={14} className={cn("transition-transform", selectedFact?.id === f.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">All Inferred Facts</h3>
                    <div className="flex items-center gap-2">
                      <ExplainButton
                        context="facts"
                        data={{ facts: inferredFacts }}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 scale-75 origin-right"
                      />
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">{inferredFacts.length}</span>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {inferredFacts.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFact(f)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all",
                          selectedFact?.id === f.id ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {f.predicate}({f.args.join(', ')})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl h-full min-h-[600px] overflow-hidden">
                  <InteractiveProof
                    fact={selectedFact || topRecs[0] || null}
                    zones={zones}
                    onHighlight={setHighlightedZone}
                    onSelectFact={setSelectedFact}
                    selectedFactId={selectedFact?.id || topRecs[0]?.id}
                  />
                </div>
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
            maxZones={maxZonesBenchmark}
            setMaxZones={setMaxZonesBenchmark}
            maxArity={maxArityBenchmark}
            setMaxArity={setMaxArityBenchmark}
            onExplain={handleExplainScaling}
            isExplaining={isExplainingScaling}
            onResetBenchmark={() => setScalingMetrics([])}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <Onboarding />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 h-16 bg-slate-900 border-b border-slate-800 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">TS-PHOL Strategy Workbench</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
              <span className="flex items-center gap-1"><Cpu size={10} /> Probabilistic Logic</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Zap size={10} /> {numZones} Zones</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-emerald-500/50" />
            <span className="text-[11px] font-bold text-white uppercase tracking-[0.15em]">
              Operational
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Turn</span>
            <span className="text-xs font-bold text-white">{turn}</span>
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
              { id: 'hypothesis', label: 'Hypothesis', icon: BrainCircuit },
              { id: 'validator', label: 'Validator', icon: Shield },
              { id: 'proof', label: 'Proof', icon: Network },
              { id: 'scaling', label: 'Scaling', icon: BarChart3 },
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
