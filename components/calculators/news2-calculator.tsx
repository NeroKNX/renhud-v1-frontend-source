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

const SCORE_COLORS = ['#059669', '#d97706', '#ea580c', '#dc2626'];

function N2Slider({ options, value, onChange }: {
  options: { label: string; score: number; value: any }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-2 text-[10px] font-semibold transition-all leading-tight ${
            value === opt.value
              ? `${newsBtnStyle(opt.score, true).split(' ')[0]} border-0 text-white`
              : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
          }`}
        >
          {opt.label}
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
  const riskClass = r?.clinical_risk_level === 'high'
    ? { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25', bar: 'bg-red-500' }
    : r?.clinical_risk_level === 'medium'
    ? { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', bar: 'bg-orange-500' }
    : { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', bar: 'bg-emerald-500' };

  return (
    <div>
      {/* FR */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Wind size={12} /> Frecuencia respiratoria
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
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            Saturación de oxígeno (SpO₂)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[10px] font-mono ren-text-tertiary mb-1.5 px-1">Escala de SpO₂</label>
            <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
              <button
                onClick={() => updateValue(NEWS2_KEYS.Escala2, false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.Escala2] === false
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                Escala 1
              </button>
              <button
                onClick={() => updateValue(NEWS2_KEYS.Escala2, true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.Escala2] === true
                    ? 'bg-rose-500 text-white'
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
            <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
              <button
                onClick={() => updateValue(NEWS2_KEYS.O2, false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.O2] === false
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                }`}
              >
                No (0)
              </button>
              <button
                onClick={() => updateValue(NEWS2_KEYS.O2, true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                  formValues[NEWS2_KEYS.O2] === true
                    ? 'bg-red-500 text-white'
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
          <N2Slider
            options={[
              { label: '≥93% con O₂\no 88–92% (0)', score: 0, value: 90 },
              { label: '86–87%\n(1)', score: 1, value: 86 },
              { label: '84–85%\n(2)', score: 2, value: 84 },
              { label: '≤83%\n(3)', score: 3, value: 80 },
            ]}
            value={formValues[NEWS2_KEYS.SpO2]}
            onChange={(v) => updateValue(NEWS2_KEYS.SpO2, v)}
          />
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
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Heart size={12} /> Presión arterial sistólica
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
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Heart size={12} /> Frecuencia cardíaca
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
              <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.FC, opt.v)} className={`relative py-2.5 rounded-lg text-[10px] font-semibold transition-all border leading-tight ${newsBtnStyle(opt.s, active)}`}>
                {opt.l}
                {active && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: SCORE_COLORS[opt.s] || '#059669' }}>
                    {opt.s}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conciencia */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Brain size={12} /> Nivel de conciencia (ACVPU)
          </h3>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[
            { l: 'Alerta\n(0)', s: 0, v: 'alert' },
            { l: 'Conf.\nnuevo (3)', s: 3, v: 'confusion' },
            { l: 'Voz\n(3)', s: 3, v: 'voice' },
            { l: 'Dolor\n(3)', s: 3, v: 'pain' },
            { l: 'Inconsc.\n(3)', s: 3, v: 'unresponsive' },
          ].map(opt => {
            const active = formValues[NEWS2_KEYS.Conciencia] === opt.v;
            return (
              <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.Conciencia, opt.v)} className={`relative py-2.5 rounded-lg text-[10px] font-semibold transition-all border leading-tight whitespace-pre-line ${opt.s === 0 && active ? 'bg-emerald-500/8 border-emerald-500/30 text-emerald-400' : opt.s > 0 && active ? 'bg-rose-500/12 border-rose-500/40 text-rose-400 shadow-sm' : 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/40'}`}>
                {opt.l}
                {active && opt.s > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: '#dc2626' }}>
                    {opt.s}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Temperatura */}
      <div className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
        <div className="mb-3">
          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
            <Thermometer size={12} /> Temperatura (°C)
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
              <button key={opt.v} onClick={() => updateValue(NEWS2_KEYS.Temp, opt.v)} className={`relative py-2.5 rounded-lg text-[10px] font-semibold transition-all border leading-tight whitespace-pre-line ${newsBtnStyle(opt.s, active)}`}>
                {opt.l}
                {active && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: SCORE_COLORS[opt.s] || '#059669' }}>
                    {opt.s}
                  </span>
                )}
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
            <div className={`rounded-xl border ${riskClass.border} ${riskClass.bg} overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.total_score}/20</span>
                  <span className={`text-sm font-mono px-2.5 py-0.5 rounded-full ${riskClass.bg} ${riskClass.text} border ${riskClass.border}`}>
                    {r.color} {r.clinical_risk}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">FR</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.rr_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">SpO₂</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.spo2_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">O₂</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.oxygen_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">PAS</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.sbp_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">FC</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.hr_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">AVPU</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.consciousness_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">T°</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.temp_score}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Escala SpO₂</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.spo2_scale_used}</p>
                  </div>
                </div>
                <p className="text-xs ren-text-tertiary font-mono leading-relaxed">{r.clinical_response}</p>
                {r.has_individual_score_of_3 && (
                  <p className="text-[10px] font-mono text-orange-400 mt-1">⚠ Cualquier puntuación individual de 3 activa respuesta urgente</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={handleCalculate} className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
              <button onClick={() => copyText(`NEWS2 | Score: ${r.total_score}/20 | Riesgo: ${r.clinical_risk} | ${r.clinical_response}`)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
              <button onClick={() => setResult(null)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
