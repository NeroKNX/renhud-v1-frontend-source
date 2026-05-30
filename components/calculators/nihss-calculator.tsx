'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, BarChart3, AlertCircle, Copy, Eye, Ear, MessageSquare, Wind } from 'lucide-react';

// Score colors matching SOFA style
function nihBtnStyle(score: number, active: boolean) {
  if (!active) {
    return 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] hover:border-[var(--accent-color)]/40';
  }
  const map: Record<number, string> = {
    0: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-400 shadow-xs shadow-emerald-500/5',
    1: 'bg-amber-500/8 border-amber-500/30 text-amber-400 shadow-xs shadow-amber-500/5',
    2: 'bg-orange-500/10 border-orange-500/35 text-orange-400 shadow-sm shadow-orange-500/8',
    3: 'bg-rose-500/12 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/10',
    4: 'bg-red-500/15 border-red-500/45 text-red-400 shadow-md shadow-red-500/15',
  };
  return map[score] || 'bg-[var(--accent-color)]/10 text-[var(--accent-hover)] border-[var(--accent-color)]/40';
}

const SCORE_COLORS = ['#059669', '#d97706', '#ea580c', '#dc2626', '#b91c1c'];

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
    icon: '🧠',
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
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' };
    if (sv.includes('moderado'))
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25' };
    if (sv.includes('severo'))
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25' };
    return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/25' };
  };

  const sevClass = result ? severityColor(result.nihss_severity || '') : null;

  return (
    <div>
      {/* Counters badge - live estimate */}
      {estimatedTotal !== null && (
        <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]">
          <Brain size={14} className="text-[var(--accent-color)]" />
          <span className="text-xs font-mono ren-text-secondary">Subtotal estimado:</span>
          <span className="text-sm font-bold ren-text-primary tabular-nums">{estimatedTotal}<span className="text-[10px] font-mono ren-text-tertiary">/42</span></span>
          {estimatedTotal >= 7 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 ml-auto">🧠 Ocl. gran vaso probable</span>
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
          <div key={item.key} className="mb-3 p-3 rounded-lg bg-[var(--ren-bg-secondary)]/30 border border-[var(--ren-border)]/40">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs">{item.icon}</span>
                <div>
                  <h3 className="text-[11px] font-semibold ren-text-primary leading-tight">{item.label}</h3>
                  <button
                    onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
                    className="text-[9px] font-mono ren-text-tertiary hover:text-[var(--accent-hover)] transition-colors mt-0.5"
                  >
                    {expandedItem === item.key ? 'ocultar' : 'cómo evaluar'}
                  </button>
                </div>
              </div>
              {currentScore !== null && (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ml-2"
                  style={{
                    backgroundColor: `${SCORE_COLORS[currentScore] || '#059669'}20`,
                    color: SCORE_COLORS[currentScore] || '#059669',
                    border: `1px solid ${SCORE_COLORS[currentScore] || '#059669'}40`,
                  }}
                >
                  {currentScore}
                </span>
              )}
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
                    {active && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center"
                        style={{ color: SCORE_COLORS[opt.score] || '#059669' }}
                      >
                        {opt.score}
                      </span>
                    )}
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
            <div className={`rounded-xl border ${sevClass?.border} ${sevClass?.bg} overflow-hidden`}>
              <div className="p-5">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.nihss_total}/42</span>
                  <span className={`text-sm font-mono px-2.5 py-0.5 rounded-full ${sevClass?.bg} ${sevClass?.text} border ${sevClass?.border}`}>
                    {r.nihss_severity}
                  </span>
                  {(r.nihss_total ?? 0) >= 7 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                      🧠 Ocl. gran vaso probable
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">LOC</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.loc ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Preguntas</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.loc_questions ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Órdenes</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.loc_commands ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Mirada</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.gaze ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Visual</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.visual ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Facial</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.facial ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Brazo D</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.motor_arm_r ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Brazo I</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.motor_arm_l ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Pierna D</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.motor_leg_r ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Pierna I</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.motor_leg_l ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Ataxia</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.ataxia ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Sensib.</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.sensory ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Lenguaje</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.language ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Disartria</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.dysarthria ?? 0}</p>
                  </div>
                  <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-mono ren-text-tertiary">Neglig.</p>
                    <p className="text-lg font-bold ren-text-primary tabular-nums">{r.nihss_detail?.extinction ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

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
