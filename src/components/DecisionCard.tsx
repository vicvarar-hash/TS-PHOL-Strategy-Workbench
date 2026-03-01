/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Bot, Target, Shield, Zap, Info, ChevronRight, AlertTriangle, Calculator } from 'lucide-react';
import { cn } from '../lib/utils';
import { GroundedFact, ZoneState } from '../types';

interface RecommendationCardProps {
  fact: GroundedFact;
  zone: ZoneState | undefined;
  isPrimary: boolean;
  onShowProof: (fact: GroundedFact) => void;
  isSelected: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ fact, zone, isPrimary, onShowProof, isSelected }) => {
  const action = fact.args[0];
  const isAttack = action === 'Attack';
  const confidence = fact.probability;

  const reasons = fact.childFacts.map(f => {
    if (f.predicate === 'Defend') return "Critical vulnerability detected.";
    if (f.predicate === 'Attack') return "High probability of success.";
    if (f.predicate === 'Vulnerable') return "Sector defenses are below threshold.";
    if (f.predicate === 'HighValue') return "Strategic resources are concentrated here.";
    if (f.predicate === 'SupplyAvailable') return "Logistics support is confirmed.";
    if (f.predicate === 'NoFog') return "Visual confirmation of target state.";
    return `${f.predicate} confirmed (${(f.probability * 100).toFixed(0)}%)`;
  });

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      animate={isSelected ? { scale: [1, 1.02, 1], borderColor: ['rgba(99, 102, 241, 0.5)', 'rgba(99, 102, 241, 1)', 'rgba(99, 102, 241, 0.5)'] } : {}}
      transition={isSelected ? { repeat: Infinity, duration: 2 } : {}}
      className={cn(
        "rounded-xl border transition-all overflow-hidden flex flex-col",
        isSelected ? "bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-2 ring-indigo-500/50" :
        isPrimary 
          ? "bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20" 
          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
      )}
    >
      <div className={cn(
        "px-4 py-2 border-b flex items-center justify-between",
        isAttack ? "bg-rose-500/5 border-rose-500/10" : "bg-indigo-500/5 border-indigo-500/10"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center",
            isAttack ? "bg-rose-600 text-white" : "bg-indigo-600 text-white"
          )}>
            {isAttack ? <Zap size={14} /> : <Shield size={14} />}
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{action}</span>
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
          <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">Sector</div>
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

        <button 
          onClick={() => onShowProof(fact)}
          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 uppercase tracking-widest"
        >
          View Proof <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
};

interface DecisionCardProps {
  facts: GroundedFact[];
  zones: ZoneState[];
  onShowProof: (fact: GroundedFact) => void;
  selectedFactId?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ facts, zones, onShowProof, selectedFactId }) => {
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

        <div className="group relative">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-full cursor-help">
            <Calculator size={12} className="text-slate-500" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Confidence Math</span>
          </div>
          <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <h4 className="text-[10px] font-bold text-white uppercase mb-2">How we calculate confidence</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Confidence is derived using the TS-PHOL probabilistic logic engine:
            </p>
            <div className="mt-2 p-2 bg-slate-950 rounded font-mono text-[9px] text-indigo-400">
              P(Head) = P(Rule) * Π P(BodyFacts)
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">
              Probabilities are multiplied along the derivation chain, ensuring that uncertainty in signals propagates correctly to the final decision.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((fact, i) => (
          <RecommendationCard 
            key={fact.id}
            fact={fact}
            zone={zones.find(z => z.id === fact.args[1])}
            isPrimary={i === 0}
            onShowProof={onShowProof}
            isSelected={selectedFactId === fact.id}
          />
        ))}
      </div>
    </div>
  );
};
