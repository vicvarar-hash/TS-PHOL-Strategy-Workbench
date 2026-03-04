/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Target, Eye, Edit3, Save, X, Flame, Mountain, Waves, Trees, Landmark } from 'lucide-react';
import { ZoneState } from '../types';
import { DomainPreset, DOMAIN_MAPPING } from '../hooks/useInference';
import { cn } from '../lib/utils';

interface MapGridProps {
  zones: ZoneState[];
  domain: DomainPreset;
  highlightedZone: string | null;
  onEditZone: (zone: ZoneState) => void;
}

export const MapGrid: React.FC<MapGridProps> = ({ zones, domain, highlightedZone, onEditZone }) => {
  const mapping = DOMAIN_MAPPING[domain];
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
            <span className="text-[9px] text-slate-400 uppercase font-bold">{mapping.allied}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="text-[9px] text-slate-400 uppercase font-bold">{mapping.enemy}</span>
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
            <div className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-500 uppercase font-bold">
              {String.fromCharCode(65 + (idx % 8))}{Math.floor(idx / 8) + 1}
            </div>

            {editingId === z.id ? (
              <div className="absolute inset-0 z-20 bg-slate-900 p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-white truncate">{z.id}: {z.name}</span>
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Save size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-rose-400 hover:text-rose-300 transition-colors"><X size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">{mapping.allied}</label>
                    <input
                      type="number"
                      value={editValues?.ours}
                      onChange={e => setEditValues(prev => prev ? { ...prev, ours: parseInt(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">{mapping.enemy}</label>
                    <input
                      type="number"
                      value={editValues?.enemy}
                      onChange={e => setEditValues(prev => prev ? { ...prev, enemy: parseInt(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">{mapping.supply}</label>
                    <input
                      type="number"
                      value={editValues?.supply}
                      onChange={e => setEditValues(prev => prev ? { ...prev, supply: parseInt(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold">{mapping.value}</label>
                    <input
                      type="number"
                      value={editValues?.value}
                      onChange={e => setEditValues(prev => prev ? { ...prev, value: parseInt(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-rose-500 uppercase font-bold">p_attack</label>
                    <input
                      type="number" step="0.01" min="0" max="1"
                      value={editValues?.p_attack}
                      onChange={e => setEditValues(prev => prev ? { ...prev, p_attack: parseFloat(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] text-emerald-500 uppercase font-bold">p_success</label>
                    <input
                      type="number" step="0.01" min="0" max="1"
                      value={editValues?.p_success}
                      onChange={e => setEditValues(prev => prev ? { ...prev, p_success: parseFloat(e.target.value) } : null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg text-[10px] p-1.5 text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`fog-${z.id}`}
                      checked={editValues?.fog}
                      onChange={e => setEditValues(prev => prev ? { ...prev, fog: e.target.checked } : null)}
                      className="accent-indigo-500"
                    />
                    <label htmlFor={`fog-${z.id}`} className="text-[7px] text-slate-500 uppercase font-bold cursor-pointer">Fog of War</label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-0.5">
                  <div className={cn(
                    "w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-300 group-hover:rotate-12",
                    z.ours > z.enemy ? "border-indigo-500/30 bg-indigo-500/5 text-indigo-400" : "border-rose-500/30 bg-rose-500/5 text-rose-400"
                  )}>
                    {getTerrainIcon(z.id)}
                  </div>
                  {z.fog && (
                    <div className="absolute -top-1 -right-1 bg-slate-950 rounded-full p-0.5 border border-slate-800 shadow-lg">
                      <Eye size={6} className="text-slate-500" />
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter truncate w-full text-center">{z.id}</div>

                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 w-full mt-1">
                  <div className="flex items-center justify-between bg-indigo-500/10 rounded px-0.5 py-0.25">
                    <span className="text-[7px] text-indigo-300 font-bold">A</span>
                    <span className="text-[8px] font-mono text-white">{z.ours}</span>
                  </div>
                  <div className="flex items-center justify-between bg-rose-500/10 rounded px-0.5 py-0.25">
                    <span className="text-[7px] text-rose-300 font-bold">E</span>
                    <span className="text-[8px] font-mono text-white">{z.enemy}</span>
                  </div>
                  <div className="flex items-center justify-between bg-amber-500/10 rounded px-0.5 py-0.25">
                    <span className="text-[7px] text-amber-300 font-bold">S</span>
                    <span className="text-[8px] font-mono text-white">{z.supply}</span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-500/10 rounded px-0.5 py-0.25">
                    <span className="text-[7px] text-emerald-300 font-bold">V</span>
                    <span className="text-[8px] font-mono text-white">{z.value}</span>
                  </div>
                </div>

                <div className="w-full mt-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-slate-500 uppercase font-bold">Atk</span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full mx-1 overflow-hidden">
                      <div className="h-full bg-indigo-400" style={{ width: `${z.p_attack * 100}%` }} />
                    </div>
                    <span className="text-[7px] font-mono text-slate-400">{(z.p_attack * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-slate-500 uppercase font-bold">Suc</span>
                    <div className="flex-1 h-1 bg-slate-800 rounded-full mx-1 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${z.p_success * 100}%` }} />
                    </div>
                    <span className="text-[7px] font-mono text-slate-400">{(z.p_success * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Mini Stats Overlay on Hover */}
                <div className="absolute inset-0 bg-slate-900/95 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center p-2 pointer-events-none scale-95 group-hover:scale-100">
                  <div className="text-[10px] font-bold text-white mb-1 border-b border-slate-800 pb-1 w-full text-center">{z.id}: {z.name}</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full">
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] text-slate-500 uppercase font-bold">{mapping.allied}</span>
                      <span className="text-[10px] font-bold text-indigo-400">{z.ours}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] text-slate-500 uppercase font-bold">{mapping.enemy}</span>
                      <span className="text-[10px] font-bold text-rose-400">{z.enemy}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] text-slate-500 uppercase font-bold">{mapping.supply}</span>
                      <span className="text-[10px] font-bold text-amber-400">{z.supply}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] text-slate-500 uppercase font-bold">{mapping.value}</span>
                      <span className="text-[10px] font-bold text-emerald-400">{z.value}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[5px] font-mono text-slate-500 uppercase">Click to Edit</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
