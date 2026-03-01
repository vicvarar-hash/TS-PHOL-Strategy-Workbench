/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Target, Eye, Edit3, Save, X, Flame, Mountain, Waves, Trees, Landmark } from 'lucide-react';
import { ZoneState } from '../types';
import { cn } from '../lib/utils';

interface MapGridProps {
  zones: ZoneState[];
  highlightedZone: string | null;
  onEditZone: (zone: ZoneState) => void;
}

export const MapGrid: React.FC<MapGridProps> = ({ zones, highlightedZone, onEditZone }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ZoneState | null>(null);

  const startEdit = (z: ZoneState) => {
    setEditingId(z.id);
    setEditValues({ ...z });
  };

  const saveEdit = () => {
    if (editValues) {
      onEditZone(editValues);
      setEditingId(null);
      setEditValues(null);
    }
  };

  const getTerrainIcon = (id: string) => {
    const num = parseInt(id.replace('Z', '')) || 0;
    if (num % 4 === 0) return <Mountain size={14} />;
    if (num % 4 === 1) return <Waves size={14} />;
    if (num % 4 === 2) return <Trees size={14} />;
    return <Landmark size={14} />;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Operational Theater Map</h3>
            <p className="text-[9px] text-slate-500 font-mono uppercase">Tactical Grid View</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="text-[9px] text-slate-400 uppercase font-bold">Allied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="text-[9px] text-slate-400 uppercase font-bold">Enemy</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 relative z-10">
        {zones.map((z, idx) => (
          <div 
            key={z.id} 
            onClick={() => !editingId && startEdit(z)}
            className={cn(
              "aspect-square rounded-xl border transition-all relative overflow-hidden group cursor-pointer flex flex-col items-center justify-center p-2",
              highlightedZone === z.id ? "bg-indigo-500/20 border-indigo-500 ring-4 ring-indigo-500/10 scale-105 z-10" : "bg-slate-900/40 border-slate-800/50 hover:border-slate-600 hover:bg-slate-800/40",
              editingId === z.id && "ring-2 ring-indigo-500 border-indigo-500 bg-slate-900"
            )}
          >
            {/* Coordinate Label */}
            <div className="absolute top-1 left-1.5 text-[7px] font-mono text-slate-600 uppercase">
              {String.fromCharCode(65 + (idx % 8))}{Math.floor(idx / 8) + 1}
            </div>

            {editingId === z.id ? (
              <div className="absolute inset-0 z-20 bg-slate-900 p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-white truncate">{z.name}</span>
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Save size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-rose-400 hover:text-rose-300 transition-colors"><X size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">Allied Strength</label>
                    <input 
                      type="number" 
                      value={editValues?.ours} 
                      onChange={e => setEditValues(prev => prev ? {...prev, ours: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">Enemy Strength</label>
                    <input 
                      type="number" 
                      value={editValues?.enemy} 
                      onChange={e => setEditValues(prev => prev ? {...prev, enemy: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300 group-hover:rotate-12",
                    z.ours > z.enemy ? "border-indigo-500/30 bg-indigo-500/5 text-indigo-400" : "border-rose-500/30 bg-rose-500/5 text-rose-400"
                  )}>
                    {getTerrainIcon(z.id)}
                  </div>
                  {z.fog && (
                    <div className="absolute -top-1.5 -right-1.5 bg-slate-950 rounded-full p-1 border border-slate-800 shadow-lg">
                      <Eye size={10} className="text-slate-500" />
                    </div>
                  )}
                </div>
                
                <div className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter truncate w-full text-center px-1">{z.name}</div>
                
                {/* Strength Indicators */}
                <div className="mt-2 flex gap-1.5">
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-full bg-indigo-500" style={{ height: `${Math.min(100, z.ours * 10)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-full bg-rose-500" style={{ height: `${Math.min(100, z.enemy * 10)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Mini Stats Overlay on Hover */}
                <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center p-2 pointer-events-none scale-95 group-hover:scale-100">
                  <div className="text-[8px] font-bold text-white mb-2 border-b border-slate-800 pb-1 w-full text-center">{z.name}</div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="flex flex-col items-center">
                      <span className="text-[6px] text-slate-500 uppercase font-bold">Allied</span>
                      <span className="text-[10px] font-bold text-indigo-400">{z.ours}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[6px] text-slate-500 uppercase font-bold">Enemy</span>
                      <span className="text-[10px] font-bold text-rose-400">{z.enemy}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[6px] font-mono text-slate-500 uppercase">Click to Edit</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
