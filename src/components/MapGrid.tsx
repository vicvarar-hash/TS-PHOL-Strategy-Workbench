/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Target, Eye, Edit3, Save, X } from 'lucide-react';
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

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
          <Target size={16} /> Operational Theater Map
        </h3>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Click a zone to edit parameters</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {zones.map(z => (
          <div 
            key={z.id} 
            onClick={() => !editingId && startEdit(z)}
            className={cn(
              "aspect-video rounded-xl border p-3 transition-all relative overflow-hidden group cursor-pointer",
              highlightedZone === z.id ? "bg-indigo-500/20 border-indigo-500 ring-4 ring-indigo-500/20 scale-105 z-10" : "bg-slate-800/50 border-slate-700 hover:border-slate-600",
              editingId === z.id && "ring-2 ring-indigo-500 border-indigo-500"
            )}
          >
            {editingId === z.id ? (
              <div className="relative z-20 space-y-2 bg-slate-900 p-2 rounded-lg inset-0 h-full overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-white truncate">{z.name}</span>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-emerald-400 hover:text-emerald-300"><Save size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-rose-400 hover:text-rose-300"><X size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[8px] text-slate-500 uppercase">Ours</label>
                    <input 
                      type="number" 
                      value={editValues?.ours} 
                      onChange={e => setEditValues(prev => prev ? {...prev, ours: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded text-[10px] p-1 text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] text-slate-500 uppercase">Enemy</label>
                    <input 
                      type="number" 
                      value={editValues?.enemy} 
                      onChange={e => setEditValues(prev => prev ? {...prev, enemy: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded text-[10px] p-1 text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] text-slate-500 uppercase">Supply</label>
                    <input 
                      type="number" 
                      value={editValues?.supply} 
                      onChange={e => setEditValues(prev => prev ? {...prev, supply: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded text-[10px] p-1 text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] text-slate-500 uppercase">Value</label>
                    <input 
                      type="number" 
                      value={editValues?.value} 
                      onChange={e => setEditValues(prev => prev ? {...prev, value: parseInt(e.target.value)} : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded text-[10px] p-1 text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                   <input 
                    type="checkbox" 
                    checked={editValues?.fog} 
                    onChange={e => setEditValues(prev => prev ? {...prev, fog: e.target.checked} : null)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                  />
                  <label className="text-[8px] text-slate-500 uppercase">Fog of War</label>
                </div>
              </div>
            ) : (
              <>
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Shield size={48} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-white uppercase truncate">{z.name}</div>
                    <Edit3 size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 mb-2">{z.id}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-500 uppercase">Ours</span>
                      <span className="text-xs font-bold text-indigo-400">{z.ours}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-500 uppercase">Enemy</span>
                      <span className="text-xs font-bold text-rose-400">{z.enemy}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-500 uppercase">Value</span>
                      <span className="text-xs font-bold text-amber-400">{z.value}</span>
                    </div>
                  </div>
                </div>
                {z.fog && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                    <Eye size={16} className="text-slate-500" />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
