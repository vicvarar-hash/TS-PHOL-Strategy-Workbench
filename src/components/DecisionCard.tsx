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
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, zone, facts, pAttackThreshold }) => {
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
  const confidence = facts.find(f => f.predicate === 'Execute' && f.args.includes(zone.id))?.probability || 0;
  
  // Find top reasons from the proof tree
  const executeFact = facts.find(f => f.predicate === 'Execute' && f.args.includes(zone.id));
  const reasons = executeFact?.childFacts.map(f => {
    if (f.predicate === 'Defend') return "Critical vulnerability detected in high-value sector.";
    if (f.predicate === 'Attack') return "High probability of success in enemy-occupied zone.";
    if (f.predicate === 'Vulnerable') return "Sector defenses are below threshold.";
    if (f.predicate === 'HighValue') return "Strategic resources are concentrated here.";
    if (f.predicate === 'SupplyAvailable') return "Logistics support is confirmed.";
    if (f.predicate === 'NoFog') return "Visual confirmation of target state.";
    return `${f.predicate} confirmed with ${(f.probability * 100).toFixed(0)}% confidence.`;
  }) || [];

  // Counterfactual calculation
  const altThreshold = pAttackThreshold > 0.5 ? 0.3 : 0.7;
  const wouldChange = (isAttack && zone.p_attack < altThreshold) || (!isAttack && zone.p_attack > altThreshold);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
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
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Sector: {zone.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{(confidence * 100).toFixed(0)}%</div>
          <div className="text-[9px] font-mono text-slate-500 uppercase">Confidence</div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Info size={12} /> Logical Rationale
          </h4>
          <ul className="space-y-2">
            {reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
            <TrendingUp size={12} /> Counterfactual Analysis
          </h4>
          <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              "If the attack threshold were adjusted to <span className="text-white font-bold">{altThreshold.toFixed(1)}</span>, 
              the decision would {wouldChange ? <span className="text-rose-400 font-bold">CHANGE</span> : <span className="text-emerald-400 font-bold">REMAIN STABLE</span>}."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
