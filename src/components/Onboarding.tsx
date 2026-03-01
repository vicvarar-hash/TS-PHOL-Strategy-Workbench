/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronRight, X, Info, Target, Cpu, Play, Network, Shield, RefreshCw, User } from 'lucide-react';
import { cn } from '../lib/utils';

export const Onboarding: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Configure Scenario",
      description: "Set the zone count and seed in the Scenario tab. This defines the operational theater for the simulation.",
      icon: Target,
      color: "text-indigo-400"
    },
    {
      title: "Step 2: Run Inference",
      description: "Execute the TS-PHOL engine to generate high-assurance tactical recommendations for the current turn.",
      icon: Play,
      color: "text-emerald-400"
    },
    {
      title: "Step 3: Apply Recommendations",
      description: "Review the top 3 AI suggestions and apply one or more actions. Each action has a deterministic impact on the zone state.",
      icon: Shield,
      color: "text-amber-400"
    },
    {
      title: "Step 4: Verify Proofs",
      description: "Inspect the machine-checkable proof artifacts to understand the logical chain behind every AI recommendation.",
      icon: Network,
      color: "text-indigo-400"
    },
    {
      title: "Step 5: Advance Turn",
      description: "Commit the turn to see tactical consequences. The simulation updates based on applied actions and environmental drift.",
      icon: RefreshCw,
      color: "text-rose-400"
    }
  ];

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:scale-110 transition-transform z-50"
    >
      <HelpCircle className="text-white" size={24} />
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Guided Tour</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shadow-inner", steps[step].color)}>
              {React.createElement(steps[step].icon, { size: 24 })}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">{steps[step].title}</h3>
              <div className="flex gap-1 mt-1">
                {steps.map((_, i) => (
                  <div key={i} className={cn("h-1 rounded-full flex-1", i === step ? "bg-indigo-500" : "bg-slate-800")} />
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed min-h-[48px]">
            {steps[step].description}
          </p>
          
          <div className="flex items-center justify-between pt-2">
            <button 
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 disabled:opacity-0 transition-all"
            >
              Back
            </button>
            <button 
              onClick={() => step === steps.length - 1 ? setIsOpen(false) : setStep(s => s + 1)}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all"
            >
              {step === steps.length - 1 ? "Get Started" : "Next Step"}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
