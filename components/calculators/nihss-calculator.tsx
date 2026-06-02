'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, BarChart3, AlertCircle, Copy, Eye, Ear, MessageSquare, Wind } from 'lucide-react';

// Score colors matching SOFA style
function nihBtnStyle(score: number, active: boolean) {
  if (!active) {
    return 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/70 hover:bg-[var(--ren-bg-secondary)]/80';
  }
  const map: Record<number, string> = {
    0: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-xs shadow-emerald-500/5',
    1: 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-xs shadow-amber-500/5',
    2: 'bg-orange-500/25 border-orange-500/45 text-orange-400 shadow-sm shadow-orange-500/8',
    3: 'bg-rose-500/12 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/10',
    4: 'bg-red-500/15 border-red-500/45 text-red-400 shadow-md shadow-red-500/15',
  };
  return map[score] || 'bg-[var(--accent-color)]/10 text-[var(--accent-hover)] border-[var(--accent-color)]/40';
}

const SCORE_COLORS = ['#059669', '#d97706', '#ea580c', '#dc2626', '#b91c1c'];

// ── Glass + Glow badge for NIHSS (0–4 scale) ──
function nihssScoreBadge(score: number): string {
  const map: Record<number, string> = {
    0: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.12)] backdrop-blur-sm',
    1: 'bg-gradient-to-br from-amber-500/20 to-amber-500/4 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.12)] backdrop-blur-sm',
    2: 'bg-gradient-to-br from-orange-500/20 to-orange-500/4 text-orange-400 border-orange-500/40 shadow-[0_0_10px_rgba(251,146,60,0.12)] backdrop-blur-sm',
    3: 'bg-gradient-to-br from-rose-500/20 to-rose-500/4 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.12)] backdrop-blur-sm',
    4: 'bg-gradient-to-br from-red-600/22 to-red-600/6 text-red-300 border-red-600/45 shadow-[0_0_14px_rgba(220,38,38,0.18)] backdrop-blur-sm',
  };
  return map[score] || 'bg-gradient-to-br from-gray-500/10 to-gray-500/4 text-gray-400 border-gray-500/30 backdrop-blur-sm';
}

// Map value to score for each subitem
const SCORE_MAP: Record<string, Record<string, number>> = {
  nihss_loc: { '0': 0, '1': 1, '2': 2, '3': 3 },
  nihss_loc_questions: { '0': 0, '1': 1, '2': 2 },
  nihss_loc_commands: { '0': 0, '1': 1, '2': 2 },
  nihss_gaze: { '0': 0, '1': 1, '2': 2 },
  nihss_visual: { '0': 0, '1': 1, '2': 2, '3': 3 },
  nihss_facial: { '0': 0, '1': 1, '2': 2, '3': 3 },
  nihss_motor_arm_r: { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 },
  nihss_motor_arm_l: { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 },
  nihss_motor_leg_r: { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 },
  nihss_motor_leg_l: { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4 },
  nihss_ataxia: { '0': 0, '1': 1, '2': 2 },
  nihss_sensory: { '0': 0, '1': 1, '2': 2 },
  nihss_language: { '0': 0, '1': 1, '2': 2, '3': 3 },
  nihss_dysarthria: { '0': 0, '1': 1, '2': 2 },
  nihss_extinction: { '0': 0, '1': 1, '2': 2 },
};

type ItemConfig = {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  options: { value: string; label: string; score: number }[];
};

const NIHSS_ITEMS: ItemConfig[] = [
  {
    key: 'nihss_loc',
    label: '1a. Nivel de conciencia',
    shortLabel: 'LOC',
    icon: 'Brain',
    options: [
      { value: '0', label: 'Alerta', score: 0 },
      { value: '1', label: 'Somnoliento', score: 1 },
      { value: '2', label: 'Estuporoso', score: 2 },
      { value: '3', label: 'Coma', score: 3 },
    ],
  },
  {
    key: 'nihss_loc_questions',
    label: '1b. Preguntas (mes / edad)',
    shortLabel: 'Preg.',
    icon: '❓',
    options: [
      { value: '0', label: 'Ambas correctas', score: 0 },
      { value: '1', label: 'Una correcta', score: 1 },
      { value: '2', label: 'Ninguna', score: 2 },
    ],
  },
  {
    key: 'nihss_loc_commands',
    label: '1c. Órdenes (ojos / mano)',
    shortLabel: 'Órd.',
    icon: '✋',
    options: [
      { value: '0', label: 'Ambas correctas', score: 0 },
      { value: '1', label: 'Una correcta', score: 1 },
      { value: '2', label: 'Ninguna', score: 2 },
    ],
  },
  {
    key: 'nihss_gaze',
    label: '2. Mirada conjugada',
    shortLabel: 'Mirada',
    icon: '👁️',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Parálisis parcial', score: 1 },
      { value: '2', label: 'Desviación forzada', score: 2 },
    ],
  },
  {
    key: 'nihss_visual',
    label: '3. Campos visuales',
    shortLabel: 'Visual',
    icon: '👁️',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Hemianopsia parcial', score: 1 },
      { value: '2', label: 'Hemianopsia completa', score: 2 },
      { value: '3', label: 'Ceguera bilateral', score: 3 },
    ],
  },
  {
    key: 'nihss_facial',
    label: '4. Parálisis facial',
    shortLabel: 'Facial',
    icon: '😐',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Borramiento mínimo', score: 1 },
      { value: '2', label: 'Parálisis parcial', score: 2 },
      { value: '3', label: 'Parálisis completa', score: 3 },
    ],
  },
  {
    key: 'nihss_motor_arm_r',
    label: '5a. Motor — Brazo derecho',
    shortLabel: 'Brazo D',
    icon: '💪',
    options: [
      { value: '0', label: 'Sin caída', score: 0 },
      { value: '1', label: 'Caída leve', score: 1 },
      { value: '2', label: 'Caída contra gravedad', score: 2 },
      { value: '3', label: 'Sin mov. contra gravedad', score: 3 },
      { value: '4', label: 'Sin movimiento', score: 4 },
    ],
  },
  {
    key: 'nihss_motor_arm_l',
    label: '5b. Motor — Brazo izquierdo',
    shortLabel: 'Brazo I',
    icon: '💪',
    options: [
      { value: '0', label: 'Sin caída', score: 0 },
      { value: '1', label: 'Caída leve', score: 1 },
      { value: '2', label: 'Caída contra gravedad', score: 2 },
      { value: '3', label: 'Sin mov. contra gravedad', score: 3 },
      { value: '4', label: 'Sin movimiento', score: 4 },
    ],
  },
  {
    key: 'nihss_motor_leg_r',
    label: '6a. Motor — Pierna derecha',
    shortLabel: 'Pierna D',
    icon: '🦵',
    options: [
      { value: '0', label: 'Sin caída', score: 0 },
      { value: '1', label: 'Caída leve', score: 1 },
      { value: '2', label: 'Caída contra gravedad', score: 2 },
      { value: '3', label: 'Sin mov. contra gravedad', score: 3 },
      { value: '4', label: 'Sin movimiento', score: 4 },
    ],
  },
  {
    key: 'nihss_motor_leg_l',
    label: '6b. Motor — Pierna izquierda',
    shortLabel: 'Pierna I',
    icon: '🦵',
    options: [
      { value: '0', label: 'Sin caída', score: 0 },
      { value: '1', label: 'Caída leve', score: 1 },
      { value: '2', label: 'Caída contra gravedad', score: 2 },
      { value: '3', label: 'Sin mov. contra gravedad', score: 3 },
      { value: '4', label: 'Sin movimiento', score: 4 },
    ],
  },
  {
    key: 'nihss_ataxia',
    label: '7. Ataxia de extremidades',
    shortLabel: 'Ataxia',
    icon: '⚖️',
    options: [
      { value: '0', label: 'Sin ataxia', score: 0 },
      { value: '1', label: 'Ataxia 1 extremidad', score: 1 },
      { value: '2', label: 'Ataxia 2 ext.', score: 2 },
    ],
  },
  {
    key: 'nihss_sensory',
    label: '8. Sensibilidad',
    shortLabel: 'Sensib.',
    icon: '🤚',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Hipoestesia leve', score: 1 },
      { value: '2', label: 'Hipoestesia severa', score: 2 },
    ],
  },
  {
    key: 'nihss_language',
    label: '9. Lenguaje',
    shortLabel: 'Leng.',
    icon: '🗣️',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Afasia leve', score: 1 },
      { value: '2', label: 'Afasia severa', score: 2 },
      { value: '3', label: 'Mudo / Global', score: 3 },
    ],
  },
  {
    key: 'nihss_dysarthria',
    label: '10. Disartria',
    shortLabel: 'Disart.',
    icon: '🗣️',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Disartria leve', score: 1 },
      { value: '2', label: 'Disartria severa', score: 2 },
    ],
  },
  {
    key: 'nihss_extinction',
    label: '11. Extinción / Inatención',
    shortLabel: 'Neglig.',
    icon: '🔄',
    options: [
      { value: '0', label: 'Normal', score: 0 },
      { value: '1', label: 'Extinción 1 modalidad', score: 1 },
      { value: '2', label: 'Extinción ≥2 modalidades', score: 2 },
    ],
  },
];

export default function NihssCalculator() {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/calculator/nihss/calculate`, {
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
  const isFilled = NIHSS_ITEMS.every(item => formValues[item.key] !== undefined && formValues[item.key] !== '');
  const estimatedTotal = isFilled
    ? NIHSS_ITEMS.reduce((sum, item) => {
        const val = formValues[item.key];
        const scoreMap = SCORE_MAP[item.key];
        return sum + (scoreMap?.[String(val)] ?? 0);
      }, 0)
    : null;

  const severityColor = (s: string) => {
    const sv = s?.toLowerCase() || '';
    if (sv.includes('leve') || sv.includes('bajo') || sv.includes('sin stroke'))
      return { bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/4', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-[0_0_10px_rgba(52,211,153,0.12)]' };
    if (sv.includes('moderado'))
      return { bg: 'bg-gradient-to-br from-orange-500/20 to-orange-500/4', text: 'text-orange-400', border: 'border-orange-500/40', glow: 'shadow-[0_0_10px_rgba(251,146,60,0.12)]' };
    if (sv.includes('severo'))
      return { bg: 'bg-gradient-to-br from-red-600/22 to-red-600/6', text: 'text-red-300', border: 'border-red-600/45', glow: 'shadow-[0_0_14px_rgba(220,38,38,0.18)]' };
    return { bg: 'bg-gradient-to-br from-gray-500/10 to-gray-500/4', text: 'text-gray-400', border: 'border-gray-500/30', glow: '' };
  };

  const sevClass = result ? severityColor(result.nihss_severity || '') : null;

  return (
    <div>
      {/* Counters badge - live estimate */}
      {estimatedTotal !== null && (
        <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-[var(--accent-color)]/8 to-transparent border border-[var(--accent-color)]/20 backdrop-blur-sm">
          <Brain size={14} className="text-[var(--accent-color)]" />
          <span className="text-xs font-mono ren-text-secondary">Subtotal estimado:</span>
          <span className="text-sm font-bold ren-text-primary tabular-nums">{estimatedTotal}<span className="text-[10px] font-mono ren-text-tertiary">/42</span></span>
          {estimatedTotal >= 7 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/4 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.10)] backdrop-blur-sm ml-auto flex items-center gap-1"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a4 4 0 0 1 3.5 2M9 3a4 4 0 0 0-3.5 2M12 8a2 2 0 0 1 2 2c0 1.1-.9 2-2 2m0-4a2 2 0 0 0-2 2c0 1.1.9 2 2 2m0 4v4m-4-6a4 4 0 0 0 4 4m0 0a4 4 0 0 0 4-4"/><path d="M12 22c-4 0-6-2-6-6 0-1.5.5-3 2-4 0 0 2-1 4-1s4 1 4 1c1.5 1 2 2.5 2 4 0 4-2 6-6 6z"/></svg> Ocl. gran vaso probable</span>
          )}
        </div>
      )}

      {/* 15 subitems */}
      {NIHSS_ITEMS.map((item, idx) => {
        const currentVal = formValues[item.key];
        const currentScore = currentVal !== undefined && currentVal !== ''
          ? (SCORE_MAP[item.key]?.[String(currentVal)] ?? null)
          : null;
        return (
          <div key={item.key} className="mb-6 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
            <div className="mb-4">
              <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary flex items-center gap-1.5">
                <Brain size={12} /> {item.label}
                {currentScore !== null && (
                  <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${nihssScoreBadge(currentScore)}`}>
                    {currentScore} pt{currentScore !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
                className="text-[9px] font-mono ren-text-tertiary hover:text-[var(--accent-hover)] transition-colors mt-0.5"
              >
                {expandedItem === item.key ? 'ocultar' : 'cómo evaluar'}
              </button>
            </div>

            {expandedItem === item.key && (
              <p className="text-[10px] ren-text-tertiary mb-2 pl-4 border-l-2 border-[var(--accent-color)]/30 leading-relaxed">
                {getEvaluationHelp(item.key)}
              </p>
            )}

            <div className={`grid gap-1 ${item.options.length <= 3 ? 'grid-cols-' + item.options.length : item.options.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-5'}`}
                 style={item.options.length <= 3 ? { gridTemplateColumns: `repeat(${item.options.length}, 1fr)` } : {}}>
              {item.options.map(opt => {
                const active = String(formValues[item.key]) === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateValue(item.key, opt.value)}
                    className={`relative py-2 px-1.5 rounded-lg text-[10px] font-semibold transition-all border leading-tight text-center ${nihBtnStyle(opt.score, active)} ${opt.score >= 4 && active ? 'animate-pulse' : ''}`}
                  >
                    <span className="block">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

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
            <div className={`rounded-xl border ${sevClass?.border} ${sevClass?.bg} ${sevClass?.glow || ''} backdrop-blur-sm overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.nihss_total}/42</span>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full ${sevClass?.bg} ${sevClass?.text} border ${sevClass?.border} backdrop-blur-sm`}>
                    {r.nihss_severity}
                  </span>
                  {(r.nihss_total ?? 0) >= 7 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/4 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.10)] backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="inline-block mr-1"><path d="M12 4a4 4 0 0 1 3.5 2M9 3a4 4 0 0 0-3.5 2M12 8a2 2 0 0 1 2 2c0 1.1-.9 2-2 2m0-4a2 2 0 0 0-2 2c0 1.1.9 2 2 2m0 4v4m-4-6a4 4 0 0 0 4 4m0 0a4 4 0 0 0 4-4"/><path d="M12 22c-4 0-6-2-6-6 0-1.5.5-3 2-4 0 0 2-1 4-1s4 1 4 1c1.5 1 2 2.5 2 4 0 4-2 6-6 6z"/></svg> Ocl. gran vaso probable
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { l: 'LOC', v: r.nihss_detail?.loc },
                    { l: 'Preguntas', v: r.nihss_detail?.loc_questions },
                    { l: 'Órdenes', v: r.nihss_detail?.loc_commands },
                    { l: 'Mirada', v: r.nihss_detail?.gaze },
                    { l: 'Visual', v: r.nihss_detail?.visual },
                    { l: 'Facial', v: r.nihss_detail?.facial },
                    { l: 'Brazo D', v: r.nihss_detail?.motor_arm_r },
                    { l: 'Brazo I', v: r.nihss_detail?.motor_arm_l },
                    { l: 'Pierna D', v: r.nihss_detail?.motor_leg_r },
                    { l: 'Pierna I', v: r.nihss_detail?.motor_leg_l },
                    { l: 'Ataxia', v: r.nihss_detail?.ataxia },
                    { l: 'Sensib.', v: r.nihss_detail?.sensory },
                    { l: 'Lenguaje', v: r.nihss_detail?.language },
                    { l: 'Disartria', v: r.nihss_detail?.dysarthria },
                    { l: 'Neglig.', v: r.nihss_detail?.extinction },
                  ].map(item => (
                    <div key={item.l} className={`rounded-lg p-1.5 text-center border backdrop-blur-sm ${item.v != null ? nihssScoreBadge(Math.min(Number(item.v), 4)) : 'bg-[var(--ren-bg-tertiary)] border-[var(--ren-border)] text-gray-400'}`}>
                      <p className="text-[7px] font-mono opacity-70 leading-tight">{item.l}</p>
                      <p className="text-xs font-bold tabular-nums">{item.v ?? '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trombolysis eligibility section */}
            {(r.nihss_total >= 0 && r.nihss_total <= 42) && (
              <div className={`mt-4 p-3 rounded-lg border backdrop-blur-sm ${
                r.nihss_total >= 4 && r.nihss_total <= 25 
                  ? "bg-emerald-500/10 border-emerald-500/30" 
                  : r.nihss_total > 25 
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-amber-500/10 border-amber-500/30"
              }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold tracking-widest uppercase ${
                    r.nihss_total >= 4 && r.nihss_total <= 25 
                      ? "text-emerald-400" 
                      : r.nihss_total > 25 
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}>
                    Trombolisis
                  </span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    r.nihss_total >= 4 && r.nihss_total <= 25 
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                  }`}>
                    {r.nihss_total >= 4 && r.nihss_total <= 25 
                      ? "ELEGIBLE" 
                      : r.nihss_total > 25 
                        ? "CONTRAINDICADO" 
                        : "NO ELEGIBLE"}
                  </span>
                </div>
                <p className={`text-[10px] mt-1 ${
                  r.nihss_total >= 4 && r.nihss_total <= 25 
                    ? "text-emerald-400/70" 
                    : "text-gray-500"
                }`}>
                  {r.nihss_total >= 4 && r.nihss_total <= 25
                    ? "NIHSS dentro del rango para terapia trombolítica (4-25 pts). Evaluar ventana de tiempo, anticoagulación y contraindicaciones."
                    : r.nihss_total > 25
                      ? "NIHSS > 25 pts: contraindicación relativa por alto riesgo de sangrado."
                      : "NIHSS < 4 pts: déficit leve. Valorar riesgo/beneficio individualizado."}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={handleCalculate} className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
              <button onClick={() => copyText(`NIHSS | Score: ${r.nihss_total}/42 | Severidad: ${r.nihss_severity}`)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
              <button onClick={() => setResult(null)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Help text for each item (from fichasTecnicas NIHSS)
function getEvaluationHelp(key: string): string {
  const map: Record<string, string> = {
    nihss_loc: 'Evaluar el nivel de conciencia. Si no responde, aplicar estímulo verbal y luego doloroso (presión en lecho ungueal o trapecio).',
    nihss_loc_questions: 'Preguntar el mes actual y la edad. Una sola oportunidad. Si intubado/afásico/barrera de idioma, puntuar 1.',
    nihss_loc_commands: 'Pedir: "abra y cierre los ojos", luego "cierre y abra la mano" (lado no parético). Puntuar según el mejor esfuerzo.',
    nihss_gaze: 'Evaluar mirada conjugada horizontal. Solo movimientos voluntarios. No usar reflejo oculocefálico si el paciente coopera.',
    nihss_visual: 'Evaluar por confrontación (contar dedos en cada cuadrante). Si no coopera, usar amenaza visual.',
    nihss_facial: 'Pedir: "enseñe los dientes" y "cierre los ojos con fuerza". Evaluar asimetría en tercio inferior.',
    nihss_motor_arm_r: 'Brazo extendido 90° (sentado) o 45° (supino), palma abajo. Mantener 10 segundos. No ayudar.',
    nihss_motor_arm_l: 'Brazo extendido 90° (sentado) o 45° (supino), palma abajo. Mantener 10 segundos. No ayudar.',
    nihss_motor_leg_r: 'Pierna elevada 30°, rodilla extendida. Mantener 5 segundos. Paciente en supino.',
    nihss_motor_leg_l: 'Pierna elevada 30°, rodilla extendida. Mantener 5 segundos. Paciente en supino.',
    nihss_ataxia: 'Dedo-nariz y talón-rodilla bilateral. Si parálisis completa (4), documentar UN. Una sola oportunidad.',
    nihss_sensory: 'Pinchazo con aguja en cara, brazo, tronco, pierna bilateral. 1 = reporta sensación diferente. 2 = no siente.',
    nihss_language: 'Describir lámina, nombrar objetos, leer frases. 3 ejes: fluidez, comprensión, repetición.',
    nihss_dysarthria: 'Repetir palabras de la lista estandarizada. 1 = inteligible. 2 = ininteligible. UN si intubado.',
    nihss_extinction: 'Estimular ambos lados SIMULTÁNEAMENTE (visual + táctil). 2 = no responde en múltiples modalidades.',
  };
  return map[key] || '';
}
