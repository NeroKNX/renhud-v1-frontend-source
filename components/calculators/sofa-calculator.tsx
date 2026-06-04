'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Droplets, Heart, Brain, Zap, BarChart3, AlertCircle, Copy, ChevronRight, FileText, FlaskConical, Filter, Calculator } from 'lucide-react';

// ── Score intensity styling for SOFA buttons ──
function sofaBtnStyle(score: number, active: boolean) {
  if (!active) {
    return 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/70 hover:bg-[var(--ren-bg-secondary)]/80';
  }
  const map: Record<number, string> = {
    0: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-xs shadow-emerald-500/5',
    1: 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-xs shadow-amber-500/5',
    2: 'bg-orange-500/25 border-orange-500/45 text-orange-400 shadow-sm shadow-orange-500/8',
    3: 'bg-pink-400/25 border-pink-400/50 text-pink-300 shadow-sm shadow-pink-400/10',
    4: 'bg-red-600/35 border-red-600/60 text-red-300 shadow-md shadow-red-600/20',
  };
  return map[score] || 'bg-[var(--accent-color)]/10 text-[var(--accent-hover)] border-[var(--accent-color)]/40';
}

function sofaPulse(score: number) {
  return score >= 4;
}

// ── Glass + Glow badge (Opción A) ──
function sofaScoreBadge(score: number): string {
  const map: Record<number, string> = {
    0: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.12)] backdrop-blur-sm',
    1: 'bg-gradient-to-br from-amber-500/20 to-amber-500/4 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.12)] backdrop-blur-sm',
    2: 'bg-gradient-to-br from-orange-500/20 to-orange-500/4 text-orange-400 border-orange-500/40 shadow-[0_0_10px_rgba(251,146,60,0.12)] backdrop-blur-sm',
    3: 'bg-gradient-to-br from-pink-400/20 to-pink-400/4 text-pink-300 border-pink-400/40 shadow-[0_0_10px_rgba(244,114,182,0.12)] backdrop-blur-sm',
    4: 'bg-gradient-to-br from-red-600/22 to-red-600/6 text-red-300 border-red-600/45 shadow-[0_0_14px_rgba(220,38,38,0.18)] backdrop-blur-sm',
  };
  return map[score] || 'bg-gradient-to-br from-gray-500/10 to-gray-500/4 text-gray-400 border-gray-500/30 backdrop-blur-sm';
}

function severityColor(severity: string) {
  const s = severity?.toLowerCase() || '';
  if (s.includes('leve') || s.includes('bajo') || s.includes('baja') || s.includes('sin stroke'))
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', bar: 'bg-emerald-500' };
  if (s.includes('moderado') || s.includes('moderada') || s.includes('medio'))
    return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', bar: 'bg-orange-500' };
  if (s.includes('severo') || s.includes('severa') || s.includes('alto') || s.includes('alta') || s.includes('muy'))
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25', bar: 'bg-red-500' };
  return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/25', bar: 'bg-gray-500' };
}

export default function SofaCalculator() {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mini calculadoras
  const [paFiOpen, setPaFiOpen] = useState(false);
  const [paFiPaO2, setPaFiPaO2] = useState('');
  const [paFiFiO2, setPaFiFiO2] = useState('');
  const [gcsOpen, setGcsOpen] = useState(false);
  const [gcsEye, setGcsEye] = useState('');
  const [gcsVerbal, setGcsVerbal] = useState('');
  const [gcsMotor, setGcsMotor] = useState('');

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/calculator/sofa/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setError(data.error || 'Error al calcular');
      }
    } catch {
      setError('Error de conexión');
    }
    setIsCalculating(false);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const r = result as Record<string, any> | null;
  const severityClass = result ? severityColor(result.sofa_severity || '') : null;

  return (
    <div>
      {/* ── qSOFA inline ── */}
      <div className="mb-8 rounded-xl border-l-4 border-l-amber-500/50 border border-[var(--accent-color)]/20 bg-gradient-to-r from-amber-500/[0.04] to-transparent p-4 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest flex items-center gap-1.5 text-amber-400">
            <Zap size={12} /> qSOFA — Cribado rápido
            <span className="text-[9px] font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--ren-border)] ml-1">Sepsis-3</span>
          </h3>
          <p className="text-[10px] ren-text-tertiary mt-0.5 ml-[1.125rem]">Alerta temprana · FR ≥ 22 · PAS ≤ 100 · GCS {'<'} 15</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-mono text-amber-400/80 mb-1.5 px-1">Frec. respiratoria ≥22 rpm</label>
            <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
              <button onClick={() => updateValue('qsofa_rr', 0)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_rr === 0 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-r border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>No</button>
              <button onClick={() => updateValue('qsofa_rr', 1)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_rr === 1 ? 'bg-gradient-to-br from-red-500/20 to-red-500/4 text-red-400 border-l border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>Sí</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-amber-400/80 mb-1.5 px-1">PAS ≤100 mmHg</label>
            <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
              <button onClick={() => updateValue('qsofa_sbp', 0)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_sbp === 0 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-r border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>No</button>
              <button onClick={() => updateValue('qsofa_sbp', 1)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_sbp === 1 ? 'bg-gradient-to-br from-red-500/20 to-red-500/4 text-red-400 border-l border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>Sí</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-amber-400/80 mb-1.5 px-1">GCS {'<'} 15</label>
            <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
              <button onClick={() => updateValue('qsofa_gcs', 0)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_gcs === 0 ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-r border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>No</button>
              <button onClick={() => updateValue('qsofa_gcs', 1)} className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${formValues.qsofa_gcs === 1 ? 'bg-gradient-to-br from-red-500/20 to-red-500/4 text-red-400 border-l border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.12)] backdrop-blur-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'}`}>Sí</button>
            </div>
          </div>
        </div>
        {(() => {
          const hasQ = formValues.qsofa_rr != null && formValues.qsofa_sbp != null && formValues.qsofa_gcs != null;
          if (!hasQ) return null;
          const qTotal = Number(formValues.qsofa_rr) + Number(formValues.qsofa_sbp) + Number(formValues.qsofa_gcs);
          const qPos = qTotal >= 2;
          return (
            <div className={`mt-3 rounded-xl border overflow-hidden ${qPos ? 'border-red-500/25 bg-red-500/5' : 'border-emerald-500/25 bg-emerald-500/5'}`}>
              <div className="p-3 flex items-center gap-3">
                <span className="text-xl font-bold ren-text-primary tabular-nums">{qTotal}/3</span>
                {qPos ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/4 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.10)] backdrop-blur-sm">⚠ Alto riesgo — evaluar SOFA</span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.10)] backdrop-blur-sm">Bajo riesgo</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Separador */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dashed border-[var(--ren-border)]/30" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--ren-bg-primary)] px-3 text-[9px] font-mono ren-text-tertiary uppercase tracking-widest">Disfunción orgánica</span>
        </div>
      </div>

      {/* SOFA: Respiratorio */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Wind size={12} /> Respiratorio — PaFi
            <button onClick={() => setPaFiOpen(!paFiOpen)} className={`ml-auto text-[9px] font-mono px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${paFiOpen ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/25 text-[var(--accent-color)]' : 'bg-[var(--ren-bg-tertiary)] border-[var(--ren-border)] ren-text-tertiary hover:text-[var(--accent-hover)]'}`}>
              <Calculator size={10} />
              {paFiOpen ? 'Cerrar' : 'Calcular PaFi'}
            </button>
            {(() => {
              const v = formValues.sofa_paFi;
              if (v == null) return null;
              const m: Record<number,number> = {400:0,350:1,250:2,150:3,50:4};
              const s = m[v];
              return s != null ? <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>

        {/* Mini calculadora PaFi */}
        {paFiOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-[var(--ren-bg-tertiary)]/50 border border-[var(--accent-color)]/20"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400/80 mb-2">Calcular PaFi desde PaO₂ y FiO₂</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-[10px] font-mono ren-text-secondary mb-1">PaO₂ (mmHg)</label>
                <input
                  type="number"
                  value={paFiPaO2}
                  onChange={e => setPaFiPaO2(e.target.value)}
                  placeholder="ej: 85"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-primary font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-mono ren-text-secondary mb-1">FiO₂ (%)</label>
                <input
                  type="number"
                  value={paFiFiO2}
                  onChange={e => setPaFiFiO2(e.target.value)}
                  placeholder="ej: 40"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-primary font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <button
                onClick={() => {
                  const paO2 = parseFloat(paFiPaO2);
                  const fio2 = parseFloat(paFiFiO2);
                  if (paO2 > 0 && fio2 > 0 && fio2 <= 100) {
                    const paFi = Math.round(paO2 / (fio2 / 100));
                    let sofaVal: number;
                    if (paFi >= 400) sofaVal = 400;
                    else if (paFi >= 300) sofaVal = 350;
                    else if (paFi >= 200) sofaVal = 250;
                    else if (paFi >= 100) sofaVal = 150;
                    else sofaVal = 50;
                    updateValue('sofa_paFi', sofaVal);
                    setPaFiOpen(false);
                  }
                }}
                disabled={!paFiPaO2 || !paFiFiO2 || parseFloat(paFiFiO2) > 100}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-br from-cyan-500/20 to-cyan-500/4 text-cyan-400 border border-cyan-500/30 hover:from-cyan-500/30 hover:to-cyan-500/8 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(6,182,212,0.10)]"
              >
                Estimar
              </button>
            </div>
            {paFiPaO2 && paFiFiO2 && parseFloat(paFiFiO2) <= 100 && parseFloat(paFiPaO2) > 0 && parseFloat(paFiFiO2) > 0 && (() => {
              const paO2 = parseFloat(paFiPaO2);
              const fio2 = parseFloat(paFiFiO2);
              const paFi = Math.round(paO2 / (fio2 / 100));
              let score: number;
              if (paFi >= 400) score = 0;
              else if (paFi >= 300) score = 1;
              else if (paFi >= 200) score = 2;
              else if (paFi >= 100) score = 3;
              else score = 4;
              return (
                <div className="mt-2 pt-2 border-t border-[var(--ren-border)]/30">
                  <p className="text-xs font-mono ren-text-primary">PaFi = <strong className="text-cyan-400">{paFi}</strong> · Score SOFA: <span className={`px-1.5 py-0.5 rounded ${sofaScoreBadge(score)}`}>{score}</span></p>
                </div>
              );
            })()}
          </motion.div>
        )}

        <div className="grid grid-cols-5 gap-1.5">
          {[
            {l:'≥400',v:400,s:0,k:'pf_0'},
            {l:'300–399',v:350,s:1,k:'pf_1'},
            {l:'200–299',v:250,s:2,k:'pf_2'},
            {l:'100–199',v:150,s:3,k:'pf_3'},
            {l:'<100',v:50,s:4,k:'pf_4'},
          ].map(r => {
            const active = formValues.sofa_paFi === r.v;
            return (
              <button key={r.k} onClick={() => updateValue('sofa_paFi', r.v)} className={`relative py-2.5 rounded-lg text-xs font-semibold transition-all border ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOFA: Coagulación */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Droplets size={12} /> Coagulación — Plaquetas (×10³/µL)
            {(() => {
              const v = formValues.sofa_platelets;
              if (v == null) return null;
              const m: Record<number,number> = {150:0,100:1,50:2,20:3,5:4};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            {l:'≥150',v:150,s:0,k:'plt_0'},
            {l:'100–149',v:100,s:1,k:'plt_1'},
            {l:'50–99',v:50,s:2,k:'plt_2'},
            {l:'20–49',v:20,s:3,k:'plt_3'},
            {l:'<20',v:5,s:4,k:'plt_4'},
          ].map(r => {
            const active = formValues.sofa_platelets === r.v;
            return (
              <button key={r.k} onClick={() => updateValue('sofa_platelets', r.v)} className={`relative py-2.5 rounded-lg text-xs font-semibold transition-all border ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOFA: Hepático */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <FlaskConical size={12} /> Hepático — Bilirrubina (mg/dL)
            {(() => {
              const v = formValues.sofa_bilirubin;
              if (v == null) return null;
              const m: Record<number,number> = {1:0,1.5:1,3:2,8:3,13:4};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            {l:'<1.2',v:1,s:0,k:'bili_0'},
            {l:'1.2–1.9',v:1.5,s:1,k:'bili_1'},
            {l:'2.0–5.9',v:3,s:2,k:'bili_2'},
            {l:'6.0–11.9',v:8,s:3,k:'bili_3'},
            {l:'≥12',v:13,s:4,k:'bili_4'},
          ].map(r => {
            const active = formValues.sofa_bilirubin === r.v;
            return (
              <button key={r.k} onClick={() => updateValue('sofa_bilirubin', r.v)} className={`relative py-2.5 rounded-lg text-xs font-semibold transition-all border ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOFA: Cardiovascular */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Heart size={12} /> Cardiovascular — PAM + Vasopresores
            {(() => {
              const m = formValues.sofa_map;
              const d = formValues.sofa_dopamine;
              if (m == null || d == null) return null;
              const cv: Record<string,number> = {'80_none':0,'60_none':1,'70_low':2,'70_mid':3,'70_high':4};
              const s = cv[`${m}_${d}`];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            {l:'PAM ≥70, sin vasopresores', map:80, dopa:'none', s:0, k:'cv_0'},
            {l:'PAM <70, sin vasopresores', map:60, dopa:'none', s:1, k:'cv_1'},
            {l:'Dopamina ≤5 o Dobutamina', map:70, dopa:'low', s:2, k:'cv_2'},
            {l:'Dopa 5–15 o Epi/Norepi ≤0.1', map:70, dopa:'mid', s:3, k:'cv_3'},
            {l:'Dopa >15 o Epi/Norepi >0.1', map:70, dopa:'high', s:4, k:'cv_4'},
          ].map(r => {
            const active = formValues.sofa_map === r.map && formValues.sofa_dopamine === r.dopa;
            return (
              <button key={r.k} onClick={() => { updateValue('sofa_map', r.map); updateValue('sofa_dopamine', r.dopa); }} className={`relative py-2.5 px-3 rounded-lg text-xs font-semibold transition-all border text-left ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOFA: Neurológico */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Brain size={12} /> Neurológico — Glasgow
            <button onClick={() => setGcsOpen(!gcsOpen)} className={`text-[9px] font-mono px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${gcsOpen ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/25 text-[var(--accent-color)]' : 'bg-[var(--ren-bg-tertiary)] border-[var(--ren-border)] ren-text-tertiary hover:text-[var(--accent-hover)]'}`}>
              <Calculator size={10} />
              {gcsOpen ? 'Cerrar' : 'Calcular GCS'}
            </button>
            {(() => {
              const v = formValues.sofa_gcs;
              if (v == null) return null;
              const m: Record<number,number> = {15:0,13:1,11:2,8:3,5:4};
              const s = m[v];
              return s != null ? <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>

        {/* Mini calculadora Glasgow */}
        {gcsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-[var(--ren-bg-tertiary)]/50 border border-[var(--accent-color)]/20"
          >
            <p className="text-[10px] font-mono uppercase tracking-widest text-purple-400/80 mb-2">Calcular GCS desde componentes</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-[10px] font-mono ren-text-secondary mb-1">Ocular (1–4)</label>
                <select
                  value={gcsEye}
                  onChange={e => setGcsEye(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-primary font-mono focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">—</option>
                  <option value="4">4 — Espontánea</option>
                  <option value="3">3 — Al llamado</option>
                  <option value="2">2 — Al dolor</option>
                  <option value="1">1 — Ninguna</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono ren-text-secondary mb-1">Verbal (1–5)</label>
                <select
                  value={gcsVerbal}
                  onChange={e => setGcsVerbal(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-primary font-mono focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">—</option>
                  <option value="5">5 — Orientado</option>
                  <option value="4">4 — Confuso</option>
                  <option value="3">3 — Palabras sueltas</option>
                  <option value="2">2 — Sonidos incomp.</option>
                  <option value="1">1 — Ninguna</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono ren-text-secondary mb-1">Motora (1–6)</label>
                <select
                  value={gcsMotor}
                  onChange={e => setGcsMotor(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-primary font-mono focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">—</option>
                  <option value="6">6 — Obedece órdenes</option>
                  <option value="5">5 — Localiza dolor</option>
                  <option value="4">4 — Retirada al dolor</option>
                  <option value="3">3 — Flexión anormal</option>
                  <option value="2">2 — Extensión anormal</option>
                  <option value="1">1 — Ninguna</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                const eye = parseInt(gcsEye);
                const verb = parseInt(gcsVerbal);
                const mot = parseInt(gcsMotor);
                if (eye >= 1 && eye <= 4 && verb >= 1 && verb <= 5 && mot >= 1 && mot <= 6) {
                  const total = eye + verb + mot;
                  let sofaVal: number;
                  if (total >= 15) sofaVal = 15;
                  else if (total >= 13) sofaVal = 13;
                  else if (total >= 10) sofaVal = 11;
                  else if (total >= 6) sofaVal = 8;
                  else sofaVal = 5;
                  updateValue('sofa_gcs', sofaVal);
                  setGcsOpen(false);
                }
              }}
              disabled={!gcsEye || !gcsVerbal || !gcsMotor}
              className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-br from-purple-500/20 to-purple-500/4 text-purple-400 border border-purple-500/30 hover:from-purple-500/30 hover:to-purple-500/8 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_8px_rgba(168,85,247,0.10)]"
            >
              Estimar
            </button>
            {gcsEye && gcsVerbal && gcsMotor && (() => {
              const total = parseInt(gcsEye) + parseInt(gcsVerbal) + parseInt(gcsMotor);
              let score: number;
              if (total >= 15) score = 0;
              else if (total >= 13) score = 1;
              else if (total >= 10) score = 2;
              else if (total >= 6) score = 3;
              else score = 4;
              return (
                <div className="mt-2 pt-2 border-t border-[var(--ren-border)]/30">
                  <p className="text-xs font-mono ren-text-primary">GCS = <strong className="text-purple-400">{total}</strong>/15 · Score SOFA: <span className={`px-1.5 py-0.5 rounded ${sofaScoreBadge(score)}`}>{score}</span></p>
                </div>
              );
            })()}
          </motion.div>
        )}

        <div className="grid grid-cols-5 gap-1.5">
          {[
            {l:'15',v:15,s:0,k:'gcs_0'},
            {l:'13–14',v:13,s:1,k:'gcs_1'},
            {l:'10–12',v:11,s:2,k:'gcs_2'},
            {l:'6–9',v:8,s:3,k:'gcs_3'},
            {l:'<6',v:5,s:4,k:'gcs_4'},
          ].map(r => {
            const active = formValues.sofa_gcs === r.v;
            return (
              <button key={r.k} onClick={() => updateValue('sofa_gcs', r.v)} className={`relative py-2.5 rounded-lg text-xs font-semibold transition-all border ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SOFA: Renal */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-4">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Filter size={12} /> Renal — Creatinina (mg/dL) o Diuresis (24h)
            {(() => {
              const cr = formValues.sofa_creatinine;
              const u = formValues.sofa_urine;
              if (cr == null || u == null) return null;
              const ren: Record<string,number> = {'1_1000':0,'1.5_1000':1,'3_1000':2,'4_400':3,'6_100':4};
              const s = ren[`${cr}_${u}`];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${sofaScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {[
            {l:'<1.2', cr:1, urine:1000, s:0, k:'ren_0'},
            {l:'1.2–1.9', cr:1.5, urine:1000, s:1, k:'ren_1'},
            {l:'2.0–3.4', cr:3, urine:1000, s:2, k:'ren_2'},
            {l:'3.5–4.9 o diur<500/24h', cr:4, urine:400, s:3, k:'ren_3'},
            {l:'≥5 o diur<200/24h', cr:6, urine:100, s:4, k:'ren_4'},
          ].map(r => {
            const active = formValues.sofa_creatinine === r.cr && formValues.sofa_urine === r.urine;
            return (
              <button key={r.k} onClick={() => { updateValue('sofa_creatinine', r.cr); updateValue('sofa_urine', r.urine); }} className={`relative py-2.5 px-2 rounded-lg text-xs font-semibold transition-all border leading-tight ${sofaBtnStyle(r.s, active)} ${sofaPulse(r.s) && active ? 'animate-pulse' : ''}`}>
                {r.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón Calcular */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="w-full md:w-auto md:min-w-[280px] py-3 px-8 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color) 0%, #7c3aed 100%)',
            color: 'white',
          }}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Calculando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <BarChart3 size={15} />
              Calcular
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-mono flex items-center gap-1.5">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Resultado */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            {/* SOFA score */}
            <div className={`rounded-xl border backdrop-blur-sm ${severityClass?.border} ${severityClass?.bg} overflow-hidden`}>
              <div className="p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-3">SOFA — Disfunción orgánica</p>
                <div className="grid grid-cols-6 gap-1.5 mb-4">
                  {[
                    {l:'Resp',v:r.sofa_resp},{l:'Coag',v:r.sofa_coag},{l:'Hep',v:r.sofa_hepatic},
                    {l:'CV',v:r.sofa_cv},{l:'SNC',v:r.sofa_cns},{l:'Renal',v:r.sofa_renal},
                  ].map(item => (
                    <div key={item.l} className={`rounded-lg p-1.5 text-center border backdrop-blur-sm ${item.v != null ? sofaScoreBadge(item.v) : 'bg-[var(--ren-bg-tertiary)] border-[var(--ren-border)] text-gray-400'}`}>
                      <p className="text-[7px] font-mono opacity-70 leading-tight">{item.l}</p>
                      <p className="text-xs font-bold tabular-nums">{item.v ?? '-'}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-5 mb-1">
                  <div>
                    <p className="text-[9px] font-mono ren-text-tertiary uppercase tracking-widest">Score total</p>
                    <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.sofa_total}/24</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono ren-text-tertiary uppercase tracking-widest">Severidad</p>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${severityClass?.bg} ${severityClass?.text} border ${severityClass?.border} backdrop-blur-sm inline-block mt-0.5`}>{r.sofa_severity}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--ren-border)]/40">
                  <p className="text-xs ren-text-tertiary font-mono">
                    <span className="text-[var(--accent-hover)]">Mortalidad estimada:</span> {r.sofa_mortality_estimate}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={handleCalculate} className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
              <button onClick={() => copyText(`SOFA | qSOFA: ${(() => { const q = (Number(formValues.qsofa_rr)||0)+(Number(formValues.qsofa_sbp)||0)+(Number(formValues.qsofa_gcs)||0); return q+'/3'; })()} | SOFA total: ${r.sofa_total}/24 | Severidad: ${r.sofa_severity} | Mortalidad: ${r.sofa_mortality_estimate}`)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
              <button onClick={() => setResult(null)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
