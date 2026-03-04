/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Bot, Target, Shield, Zap, Info, ChevronRight, AlertTriangle, Calculator, Play, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { GroundedFact, ZoneState } from '../types';
import { DomainPreset, DOMAIN_MAPPING } from '../hooks/useInference';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface RecommendationCardProps {
  fact: GroundedFact;
  zone: ZoneState | undefined;
  domain: DomainPreset;
  isPrimary: boolean;
  onShowProof: (fact: GroundedFact) => void;
  isSelected: boolean;
  onApply: (action: string, zoneId: string, factId: string) => void;
  isApplied: boolean;
  disabled: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  fact, zone, domain, isPrimary, onShowProof, isSelected, onApply, isApplied, disabled
}) => {
  const mapping = DOMAIN_MAPPING[domain];
  const [showMath, setShowMath] = React.useState(false);
  const action = fact.args[0];
  const isAttack = action === 'Attack';
  const confidence = fact.probability;

  const reasons = fact.childFacts.map(f => {
    if (f.predicate === 'Defend') return "Critical vulnerability detected.";
    if (f.predicate === 'Attack') return "High probability of success.";
    if (f.predicate === 'Vulnerable') return `${mapping.zone} defenses are below threshold.`;
    if (f.predicate === 'HighValue') return "Strategic resources are concentrated here.";
    if (f.predicate === 'SupplyAvailable') return "Logistics support is confirmed.";
    if (f.predicate === 'NoFog') return "Visual confirmation of target state.";
    return `${f.predicate} confirmed (${(f.probability * 100).toFixed(0)}%)`;
  });

  return (
    <motion.div
      whileHover={!disabled && !isApplied ? { y: -2 } : {}}
      animate={isSelected ? { scale: [1, 1.02, 1], borderColor: ['rgba(99, 102, 241, 0.5)', 'rgba(99, 102, 241, 1)', 'rgba(99, 102, 241, 0.5)'] } : {}}
      transition={isSelected ? { repeat: Infinity, duration: 2 } : {}}
      className={cn(
        "rounded-xl border transition-all overflow-hidden flex flex-col",
        isApplied ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]" :
          isSelected ? "bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-2 ring-indigo-500/50" :
            isPrimary
              ? "bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20"
              : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
      )}
    >
      <div className={cn(
        "px-4 py-2 border-b flex items-center justify-between",
        isApplied ? "bg-emerald-500/10 border-emerald-500/20" :
          isAttack ? "bg-rose-500/5 border-rose-500/10" : "bg-indigo-500/5 border-indigo-500/10"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center",
            isApplied ? "bg-emerald-600 text-white" :
              isAttack ? "bg-rose-600 text-white" : "bg-indigo-600 text-white"
          )}>
            {isApplied ? <CheckCircle2 size={14} /> : isAttack ? <Zap size={14} /> : <Shield size={14} />}
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {isApplied ? 'Applied' : action}
          </span>
        </div>
        <div className="text-right">
          <span className={cn(
            "text-xs font-mono font-bold",
            confidence > 0.7 ? "text-emerald-400" : confidence > 0.4 ? "text-amber-400" : "text-rose-400"
          )}>
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">{mapping.zone}</div>
          <div className="text-xs font-bold text-white">{zone?.id}: {zone?.name}</div>
        </div>

        <div className="space-y-1.5 flex-1">
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Rationale</div>
          <ul className="space-y-1">
            {reasons.slice(0, 2).map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400 leading-tight">
                <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onApply(action, zone?.id || '', fact.id)}
            disabled={disabled || isApplied}
            className={cn(
              "w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              isApplied
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:bg-slate-800"
            )}
          >
            {isApplied ? <CheckCircle2 size={12} /> : <Play size={12} />}
            {isApplied ? 'Applied' : 'Apply Action'}
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={() => onShowProof(fact)}
              className="flex-1 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-400 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 uppercase tracking-widest"
            >
              View Proof <ChevronRight size={12} />
            </button>
            <button
              onClick={() => setShowMath(!showMath)}
              className={cn(
                "flex-1 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 uppercase tracking-widest",
                showMath ? "text-indigo-400 border border-indigo-500/30" : "text-slate-400"
              )}
            >
              <Calculator size={12} /> Math
            </button>
          </div>
        </div>

        {showMath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-mono text-slate-400 space-y-2 mt-2"
          >
            <div className="text-indigo-400 font-bold mb-1 border-b border-indigo-500/20 pb-1 flex items-center gap-1">
              <Calculator size={10} /> Confidence Computation
            </div>
            <div><span className="text-slate-500">P(Rule):</span> {fact.ruleId}</div>
            <div className="space-y-0.5 pl-2 mt-1 border-l border-slate-800">
              {fact.childFacts.map((f, i) => (
                <div key={i}><span className="text-slate-500">P({f.predicate}):</span> {(f.probability * 100).toFixed(0)}%</div>
              ))}
            </div>
            <div className="pt-1 mt-1 border-t border-slate-800 text-emerald-400 font-bold">
              Final: P({fact.predicate}) = {(fact.probability * 100).toFixed(0)}%
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

interface DecisionCardProps {
  facts: GroundedFact[];
  zones: ZoneState[];
  domain: DomainPreset;
  onShowProof: (fact: GroundedFact) => void;
  selectedFactId?: string;
  onApply: (action: string, zoneId: string, factId: string) => void;
  appliedFactIds: string[];
  disabled: boolean;
  cumulativeStats: { applied: number, generated: number };
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  facts, zones, domain, onShowProof, selectedFactId, onApply, appliedFactIds, disabled, cumulativeStats
}) => {
  const [reportOpen, setReportOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [commanderReport, setCommanderReport] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (facts.length === 0) {
      setReportOpen(false);
      setCommanderReport(null);
    }
  }, [facts]);

  const generateReport = async () => {
    setIsGenerating(true);
    setReportOpen(true);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setCommanderReport("Error: GEMINI_API_KEY not found in environment. Cannot generate report.");
      setIsGenerating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a seasoned operational commander reviewing AI tactical output.
        Current Theater State:
        ${JSON.stringify(zones.map(z => ({ id: z.id, name: z.name, ours: z.ours, enemy: z.enemy })), null, 2)}
        
        All Logically Inferred Facts (Full Battlefield Assessment):
        ${JSON.stringify(facts.map(f => ({ pred: f.predicate, args: f.args, conf: f.probability })), null, 2)}
        
        Write a concise, 3-paragraph "Commander's Assessment" using rich **Markdown formatting** (bolding key terms, using bullet points if needed).
        Paragraph 1: Synthesize the overall battlefield balance and health based on all inferred facts. Bold critical zone names.
        Paragraph 2: Explain in plain English *why* the top "Execute" recommendations were chosen based on the logic.
        Paragraph 3: Note any glaring risks or non-selected vulnerabilities. Use bullet points for multiple risks.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      setCommanderReport(response.text || "Report generation failed.");
    } catch (err) {
      setCommanderReport("API Error: " + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter and sort recommendations
  const recommendations = facts
    .filter(f => f.predicate === 'Execute' && f.probability > 0.01)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  if (recommendations.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-400">No Valid Recommendations</h3>
          <p className="text-xs text-slate-500 max-w-[240px]">
            The current tactical state does not satisfy any decision rules above the minimum confidence threshold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">AI Recommendations</h3>
            <p className="text-[9px] text-slate-500 font-mono uppercase">Top {recommendations.length} Candidates</p>
          </div>
        </div>


      </div>

      <div className="flex gap-4">
        <button
          onClick={generateReport}
          disabled={disabled || recommendations.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
          Commander's Report
        </button>
      </div>

      {reportOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-slate-950 border border-indigo-500/30 rounded-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/20 pb-2 mb-2 flex items-center gap-2">
              <Bot size={14} /> Tactical Synthesis
            </h4>
            {isGenerating ? (
              <p className="text-xs text-slate-500 animate-pulse">Consulting LLM models for battlefield analysis...</p>
            ) : (
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap prose prose-invert prose-headings:text-indigo-300 prose-strong:text-amber-400 max-w-none">
                <ReactMarkdown>{commanderReport}</ReactMarkdown>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((fact, i) => (
          <RecommendationCard
            key={fact.id}
            fact={fact}
            zone={zones.find(z => z.id === fact.args[1])}
            domain={domain}
            isPrimary={i === 0}
            onShowProof={onShowProof}
            isSelected={selectedFactId === fact.id}
            onApply={onApply}
            isApplied={appliedFactIds.includes(fact.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
