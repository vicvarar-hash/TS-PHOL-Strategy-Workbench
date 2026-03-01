/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Bot, Target, Shield, Zap, AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { GroundedFact, ZoneState } from '../types';

interface DecisionCardProps {
  decision: { action: string, zone: string } | null;
  zone: ZoneState | undefined;
  facts: GroundedFact[];
  pAttackThreshold: number;
  onShowProof: (fact: GroundedFact) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, zone, facts, pAttackThreshold, onShowProof }) => {
  if (!decision || !zone) return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
      <Bot size={48} className="text-slate-700 animate-pulse" />
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-400">Awaiting Inference</h3>
        <p className="text-xs text-slate-500 max-w-[200px]">Run the TS-PHOL engine to generate a high-assurance tactical decision.</p>
      </div>
    </div>
  );

  const isAttack = decision.action === 'Attack';
  const executeFact = facts.find(f => f.predicate === 'Execute' && f.args.includes(zone.id));
  const confidence = executeFact?.probability || 0;
  
  // Find top reasons from the proof tree
  const reasons = executeFact?.childFacts.map(f => {
    if (f.predicate === 'Defend') return "Critical vulnerability detected in high-value sector.";
    if (f.predicate === 'Attack') return "High probability of success in enemy-occupied zone.";
    if (f.predicate === 'Vulnerable') return "Sector defenses are below threshold.";
    if (f.predicate === 'HighValue') return "Strategic resources are concentrated here.";
    if (f.predicate === 'SupplyAvailable') return "Logistics support is confirmed.";
    if (f.predicate === 'NoFog') return "Visual confirmation of target state.";
    return `${f.predicate} confirmed with ${(f.probability * 100).toFixed(0)}% confidence.`;
  }) || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-all"
      onClick={() => executeFact && onShowProof(executeFact)}
    >
      <div className={cn(
        "px-6 py-4 border-b border-slate-800 flex items-center justify-between",
        isAttack ? "bg-rose-500/10" : "bg-indigo-500/10"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
            isAttack ? "bg-rose-600 text-white shadow-rose-500/20" : "bg-indigo-600 text-white shadow-indigo-500/20"
          )}>
            {isAttack ? <Zap size={20} /> : <Shield size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Recommendation: {decision.action}</h3>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Sector: {zone.id} ({zone.name})</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{(confidence * 100).toFixed(0)}%</div>
          <div className="text-[9px] font-mono text-slate-500 uppercase">Confidence</div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Info size={12} /> Key Reasons
          </h4>
          <ul className="space-y-1.5">
            {reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center pt-2">
          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest group-hover:text-indigo-300 transition-colors flex items-center gap-1">
            View Full Proof Artifact <Target size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};
