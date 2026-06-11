'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Heart, Thermometer, BarChart3, AlertCircle, Copy, Brain } from 'lucide-react';

function newsBtnStyle(score: number, active: boolean) {
  if (!active) {
    return 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/40';
  }
  const map: Record<number, string> = {
    0: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-500/5',
    1: 'bg-amber-500/8 border-amber-500/30 text-amber-400 shadow-xs shadow-amber-500/5',
    2: 'bg-orange-500/10 border-orange-500/35 text-orange-400 shadow-sm shadow-orange-500/8',
    3: 'bg-rose-500/12 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/10',
  };
  return map[score] || 'bg-[var(--accent-color)]/10 text-[var(--accent-hover)] border-[var(--accent-color)]/40';
}

const NEWS2_KEYS = {
  FR: 'respiratory_rate',
  SpO2: 'spo2',
  Escala2: 'spo2_scale_2',
  O2: 'supplemental_oxygen',
  SBP: 'sbp',
  FC: 'heart_rate',
  Conciencia: 'consciousness',
  Temp: 'temperature',
} as const;

// ── Glass + Glow badge for NEWS2 (0–3 scale) ──
function newsScoreBadge(score: number): string {
  const map: Record<number, string> = {
    0: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/40',
    1: 'bg-amber-500/12 text-amber-400 border-amber-500/40',
    2: 'bg-orange-500/12 text-orange-400 border-orange-500/40',
    3: 'bg-rose-500/12 text-rose-400 border-rose-500/40',
  };
  return map[score] || 'bg-gray-500/12 text-gray-400 border-gray-500/30';
}

function N2Slider({ options, value, onChange }: {
  options: { label: string; score: number; value: any }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex rounded-[2px] border border-[var(--ren-border)] overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onChange(opt.value)}
          className={`relative flex-1 px-2 py-2 text-[10px] font-semibold transition-all leading-tight border ${
            value === opt.value
              ? newsBtnStyle(opt.score, true)
              : 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/40'
          }`}
        >
          <span className="block">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function News2Calculator() {
  const [formValues, setFormValues] = useState<Record<string, any>>({
    [NEWS2_KEYS.Escala2]: false,
    [NEWS2_KEYS.O2]: false,
  });
  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/calculator/news2/calculate`, {
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
  const news2RiskClass = (level: string): { bg: string; text: string; border: string } => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      'high':   { bg: 'bg-rose-500/12', text: 'text-rose-300', border: 'border-rose-500/40' },
      'medium': { bg: 'bg-orange-500/12', text: 'text-orange-300', border: 'border-orange-500/40' },
      'low':    { bg: 'bg-emerald-500/12', text: 'text-emerald-300', border: 'border-emerald-500/40' },
    };
    return map[level] || map.low;
  };
  const riskClass = news2RiskClass(r?.clinical_risk_level || 'low');

  return (
    <div>
      {/* FR */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Wind size={12} /> Frecuencia respiratoria
            {(() => {
              const v = formValues[NEWS2_KEYS.FR];
              if (v == null) return null;
              const m: Record<number,number> = {6:3,10:1,15:0,22:2,25:3};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <N2Slider
          options={[
            { label: '≤ 8\n(3)', score: 3, value: 6 },
            { label: '9–11\n(1)', score: 1, value: 10 },
            { label: '12–20\n(0)', score: 0, value: 15 },
            { label: '21–24\n(2)', score: 2, value: 22 },
            { label: '≥ 25\n(3)', score: 3, value: 25 },
          ]}
          value={formValues[NEWS2_KEYS.FR]}
          onChange={(v) => updateValue(NEWS2_KEYS.FR, v)}
        />
      </div>

      {/* SpO2 + Escala */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            Saturación de oxígeno (SpO₂)
            {(() => {
              const v = formValues[NEWS2_KEYS.SpO2];
              if (v == null) return null;
              const escala2Map: Record<number,number> = {5:3,84:2,86:1,90:0,93:1,95:2,97:3,99:0};
              const escala1Map: Record<number,number> = {98:0,94:1,92:2,88:3};
              const m = formValues[NEWS2_KEYS.Escala2] ? escala2Map : escala1Map;
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[10px] font-mono ren-text-tertiary mb-1.5 px-1">Escala de SpO₂</label>
            <div className="flex rounded-[2px] border border-[var(--ren-border)] overflow-hidden">
              <button
                onClick={() => updateValue(NEWS2_KEYS.Escala2, false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.Escala2] === false
                    ? 'bg-emerald-500/12 text-emerald-400 border-r border-emerald-500/30'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                Escala 1
              </button>
              <button
                onClick={() => updateValue(NEWS2_KEYS.Escala2, true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.Escala2] === true
                    ? 'bg-rose-500/12 text-rose-400 border-l border-rose-500/30'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                Escala 2
              </button>
            </div>
            <p className="text-[9px] ren-text-tertiary mt-1 px-1">
              {formValues[NEWS2_KEYS.Escala2]
                ? 'Solo en hipercapnia crónica confirmada'
                : 'Uso rutinario'}
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-mono ren-text-tertiary mb-1.5 px-1">Oxígeno suplementario</label>
            <div className="flex rounded-[2px] border border-[var(--ren-border)] overflow-hidden">
              <button
                onClick={() => updateValue(NEWS2_KEYS.O2, false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.O2] === false
                    ? 'bg-emerald-500/12 text-emerald-400 border-r border-emerald-500/30'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                No (0)
              </button>
              <button
                onClick={() => updateValue(NEWS2_KEYS.O2, true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.O2] === true
                    ? 'bg-orange-500/12 text-orange-400 border-l border-orange-500/30'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                Sí (2)
              </button>
            </div>
          </div>
        </div>
        <label className="block text-[10px] font-mono ren-text-tertiary mb-1.5 px-1">SpO₂ (%)</label>
        {formValues[NEWS2_KEYS.Escala2] ? (
          <div className="grid grid-cols-4 gap-1">
            {[
              { l: '≤83%\n(3)', s: 3, v: 5 },
              { l: '84-85%\n(2)', s: 2, v: 84 },
              { l: '86-87%\n(1)', s: 1, v: 86 },
              { l: '88-92%\n(0)', s: 0, v: 90 },
              { l: '93-94%+O₂\n(1)', s: 1, v: 93 },
              { l: '95-96%+O₂\n(2)', s: 2, v: 95 },
              { l: '≥97%+O₂\n(3)', s: 3, v: 97 },
              { l: '≥93% sin O₂\n(0)', s: 0, v: 99 },
            ].map(opt => {
              const active = formValues[NEWS2_KEYS.SpO2] === opt.v;
              return (
                <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.SpO2, opt.v)} className={`relative py-2 rounded-[2px] text-[10px] font-semibold transition-all border leading-tight whitespace-pre-line ${newsBtnStyle(opt.s, active)}`}>
                  {opt.l}
                </button>
              );
            })}
          </div>
        ) : (
          <N2Slider
            options={[
              { label: '≥96%\n(0)', score: 0, value: 98 },
              { label: '94–95%\n(1)', score: 1, value: 94 },
              { label: '92–93%\n(2)', score: 2, value: 92 },
              { label: '≤91%\n(3)', score: 3, value: 88 },
            ]}
            value={formValues[NEWS2_KEYS.SpO2]}
            onChange={(v) => updateValue(NEWS2_KEYS.SpO2, v)}
          />
        )}
      </div>

      {/* PAS */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Heart size={12} /> Presión arterial sistólica
            {(() => {
              const v = formValues[NEWS2_KEYS.SBP];
              if (v == null) return null;
              const m: Record<number,number> = {230:3,150:0,105:1,95:2,85:3};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <N2Slider
          options={[
            { label: '≥220\n(3)', score: 3, value: 230 },
            { label: '111–219\n(0)', score: 0, value: 150 },
            { label: '101–110\n(1)', score: 1, value: 105 },
            { label: '91–100\n(2)', score: 2, value: 95 },
            { label: '≤90\n(3)', score: 3, value: 85 },
          ]}
          value={formValues[NEWS2_KEYS.SBP]}
          onChange={(v) => updateValue(NEWS2_KEYS.SBP, v)}
        />
      </div>

      {/* FC */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Heart size={12} /> Frecuencia cardíaca
            {(() => {
              const v = formValues[NEWS2_KEYS.FC];
              if (v == null) return null;
              const m: Record<number,number> = {35:3,45:1,75:0,100:1,120:2,135:3};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[
            { l: '≤40\n(3)', s: 3, v: 35 },
            { l: '41–50\n(1)', s: 1, v: 45 },
            { l: '51–90\n(0)', s: 0, v: 75 },
            { l: '91–110\n(1)', s: 1, v: 100 },
            { l: '111–130\n(2)', s: 2, v: 120 },
            { l: '≥131\n(3)', s: 3, v: 135 },
          ].map(opt => {
            const active = formValues[NEWS2_KEYS.FC] === opt.v;
            return (
              <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.FC, opt.v)} className={`relative py-2.5 rounded-[2px] text-[10px] font-semibold transition-all border leading-tight ${newsBtnStyle(opt.s, active)}`}>
                {opt.l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conciencia */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Brain size={12} /> Nivel de conciencia
            {(() => {
              const v = formValues[NEWS2_KEYS.Conciencia];
              if (v == null) return null;
              const m: Record<string,number> = {'alert':0,'cvpu':3};
              const s = m[v] ?? 3;
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <N2Slider
          options={[
            { label: 'Alerta (A) — 0', score: 0, value: 'alert' },
            { label: 'CVPU — 3', score: 3, value: 'cvpu' },
          ]}
          value={formValues[NEWS2_KEYS.Conciencia]}
          onChange={(v) => updateValue(NEWS2_KEYS.Conciencia, v)}
        />
        <p className="text-[9px] ren-text-tertiary mt-2 px-1">CVPU: Confusión, Voz, Dolor o Inconsciente — cualquier alteración = 3 pts</p>
      </div>

      {/* Temperatura */}
      <div className="mb-6 p-3 rounded-[2px] bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Thermometer size={12} /> Temperatura (°C)
            {(() => {
              const v = formValues[NEWS2_KEYS.Temp];
              if (v == null) return null;
              const m: Record<number,number> = {34:3,35.5:1,37:0,38.5:1,40:2};
              const s = m[v];
              return s != null ? <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${newsScoreBadge(s)}`}>{s} pt{s!==1?'s':''}</span> : null;
            })()}
          </h3>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[
            { l: '≤35.0\n(3)', s: 3, v: 34 },
            { l: '35.1–36\n(1)', s: 1, v: 35.5 },
            { l: '36.1–38\n(0)', s: 0, v: 37 },
            { l: '38.1–39\n(1)', s: 1, v: 38.5 },
            { l: '≥39.1\n(2)', s: 2, v: 40 },
          ].map(opt => {
            const active = formValues[NEWS2_KEYS.Temp] === opt.v;
            return (
              <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.Temp, opt.v)} className={`relative py-2.5 rounded-[2px] text-[10px] font-semibold transition-all border leading-tight whitespace-pre-line ${newsBtnStyle(opt.s, active)}`}>
                {opt.l}
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
          className="ren-btn-sharp w-full md:w-auto md:min-w-[280px] py-3 px-8 text-sm disabled:opacity-60"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
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
        <div className="mb-4 p-2 rounded-[2px] bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-mono flex items-center gap-1.5">
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
            <div className={`rounded-[2px] border ${riskClass.border} ${riskClass.bg} overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.total_score}/20</span>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-[2px] ${riskClass.bg} ${riskClass.text} border ${riskClass.border}`}>
                    {r.color} {r.clinical_risk}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
                  {[
                    { l: 'FR', v: r.rr_score },
                    { l: 'SpO₂', v: r.spo2_score },
                    { l: 'O₂', v: r.oxygen_score },
                    { l: 'PAS', v: r.sbp_score },
                    { l: 'FC', v: r.hr_score },
                    { l: 'AVPU', v: r.consciousness_score },
                    { l: 'T°', v: r.temp_score },
                    { l: 'Escala SpO₂', v: r.spo2_scale_used },
                  ].map(item => (
                    <div key={item.l} className={`rounded-[2px] p-1.5 text-center border ${item.v != null ? newsScoreBadge(Math.min(Number(item.v), 3)) : 'bg-[var(--ren-bg-tertiary)] border-[var(--ren-border)] text-gray-400'}`}>
                      <p className="text-[7px] font-mono opacity-70 leading-tight">{item.l}</p>
                      <p className="text-xs font-bold tabular-nums">{item.v ?? '-'}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs ren-text-tertiary font-mono leading-relaxed">{r.clinical_response}</p>
                {r.has_individual_score_of_3 && (
                  <p className="text-[10px] font-mono text-orange-400 mt-1">⚠ Cualquier puntuación individual de 3 activa respuesta urgente</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={handleCalculate} className="flex-1 py-2 rounded-[2px] text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
              <button onClick={() => copyText(`NEWS2 | Score: ${r.total_score}/20 | Riesgo: ${r.clinical_risk} | ${r.clinical_response}`)} className="py-2 px-4 rounded-[2px] text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
              <button onClick={() => setResult(null)} className="py-2 px-4 rounded-[2px] text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
