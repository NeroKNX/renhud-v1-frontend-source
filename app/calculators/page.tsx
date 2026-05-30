'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Beaker, ChevronDown, ChevronRight, Calculator, AlertCircle, Info, FlaskConical, Activity, Heart, Droplets, Thermometer, Wind, Syringe, Pill, Zap, BarChart3, Globe, FileText, Brain, Copy, BookOpen, AlertTriangle } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { useAuth } from '@/lib/auth-context';
import SofaCalculator from '@/components/calculators/sofa-calculator';
import News2Calculator from '@/components/calculators/news2-calculator';
import NihssCalculator from '@/components/calculators/nihss-calculator';
import ApacheIVCalculator from '@/components/calculators/apache-iv-calculator';

const fichasTecnicas: Record<string, {
  proposito: string;
  origen: string;
  interpretacion: { rango: string; significado: string }[];
  limitaciones: string[];
  comoEvaluar?: { item: string; detalle: string; puntuacion: string }[];
}> = {
  'apache-iv': {
    proposito: 'Predecir mortalidad hospitalaria y días de estancia (LOS) en pacientes críticamente enfermos al ingreso a UCI. El score combina el APS (Acute Physiology Score) con edad, diagnóstico de ingreso y condiciones crónicas.',
    origen: 'Zimmerman JE et al. Acute Physiology and Chronic Health Evaluation (APACHE) IV. Crit Care Med 2006;34(5):1297-310.',
    interpretacion: [
      { rango: 'Score bruto sin rango fijo', significado: 'APS 0–299 aprox. A mayor APS, mayor mortalidad esperada' },
      { rango: 'Mortalidad < 10%', significado: 'Riesgo bajo. Pronóstico favorable.' },
      { rango: 'Mortalidad 10–30%', significado: 'Riesgo moderado. Vigilancia estrecha.' },
      { rango: 'Mortalidad 30–60%', significado: 'Riesgo alto. Requiere soporte intensivo.' },
      { rango: 'Mortalidad > 60%', significado: 'Riesgo muy alto. Falla multiorgánica probable.' },
    ],
    limitaciones: [
      'Requiere datos de las primeras 24 horas de ingreso a UCI; no aplica para reingresos con nuevo cálculo.',
      'Los valores fisiológicos deben ser los PEORES de las primeras 24h, no los primeros disponibles.',
    ],
  },
  'sofa': {
    proposito: 'Cuantificar la disfunción orgánica en UCI. Diagnóstico de sepsis (aumento ≥ 2 puntos sobre basal en paciente con infección sospechada). Útil para seguimiento evolutivo diario.',
    origen: 'Vincent JL et al. Intensive Care Med 1996;22:707-10. Redefinido para sepsis en: Singer M et al. JAMA 2016 (Sepsis-3).',
    interpretacion: [
      { rango: '0–6', significado: 'Disfunción leve. Mortalidad ~1–5%.' },
      { rango: '7–9', significado: 'Disfunción moderada. Mortalidad ~15–20%.' },
      { rango: '10–12', significado: 'Disfunción severa. Mortalidad ~40–50%.' },
      { rango: '> 12', significado: 'Falla multiorgánica. Mortalidad > 50–80%.' },
    ],
    limitaciones: [
      'Cardiovascular: la puntuación depende del esquema local de vasopresores (dopamina, epinefrina, norepinefrina). Un mismo paciente puede puntuar distinto según protocolo.',
      'Basal desconocida: si no hay disfunción orgánica previa conocida, asumir SOFA basal = 0. Esto puede subestimar el delta si el paciente tenía disfunción crónica.',
      'Delta SOFA: el diagnóstico de sepsis por Sepsis-3 requiere aumento ≥2 puntos sobre basal. En el primer cálculo no hay basal, así que no se puede clasificar como sepsis solo con un SOFA de ingreso.',
      'SOFA-2 (ESICM, en validación) podría reemplazar al SOFA actual; los puntos de corte pueden cambiar.',
    ],
    comoEvaluar: [
      { item: 'Respiratorio', detalle: 'Usar el PEOR valor PaO₂/FiO₂ del día. Si el paciente está ventilado mecánicamente, aplicar puntajes 3-4 solo cuando está en VM (no aplica en ventilación espontánea con máscara).', puntuacion: '0: ≥400 | 1: 300–399 | 2: 200–299 | 3: 100–199 | 4: <100' },
      { item: 'Coagulación', detalle: 'Usar el recuento de plaquetas más bajo del día.', puntuacion: '0: ≥150 | 1: 100–149 | 2: 50–99 | 3: 20–49 | 4: <20' },
      { item: 'Hepático', detalle: 'Usar la bilirrubina total más alta del día.', puntuacion: '0: <1.2 | 1: 1.2–1.9 | 2: 2.0–5.9 | 3: 6.0–11.9 | 4: ≥12.0' },
      { item: 'Cardiovascular', detalle: 'Si PAM ≥ 70 mmHg sin vasopresores → puntaje 0. Si PAM < 70 sin vasopresores → 1. El resto depende de dosis de vasopresores. Se usa la PEOR combinación del día.', puntuacion: '0: PAM≥70 | 1: PAM<70 | 2: dopamina≤5 o dobutamina | 3: dopa 5.1–15 o epi/norepi≤0.1 | 4: dopa>15 o epi/norepi>0.1' },
      { item: 'Neurológico', detalle: 'Usar el GCS más bajo del día. Si el paciente está sedado, registrar el GCS antes de la sedación o el peor valor evaluable.', puntuacion: '0: 15 | 1: 13–14 | 2: 10–12 | 3: 6–9 | 4: <6' },
      { item: 'Renal', detalle: 'Usar la creatinina más alta O la menor diuresis del día. Se toma el peor de los dos criterios.', puntuacion: '0: Cr<1.2 | 1: Cr 1.2–1.9 | 2: Cr 2.0–3.4 | 3: Cr 3.5–4.9 o diuresis<500ml/d | 4: Cr>5.0 o diuresis<200ml/d' },
    ],
  },
  'news2': {
    proposito: 'Detección temprana de deterioro clínico en sala general, urgencias y entornos prehospitalarios. Sistema estandarizado del NHS (Reino Unido).',
    origen: 'Royal College of Physicians. National Early Warning Score (NEWS) 2. RCP London, 2017. Endosado por NHS England.',
    interpretacion: [
      { rango: '0', significado: 'Sin riesgo. Monitoreo rutinario c/12h.' },
      { rango: '1–4', significado: 'Bajo riesgo. Evaluar cada 4–6h. Notificar si empeora.' },
      { rango: '5–6 o cualquier componente = 3', significado: 'Riesgo medio. Evaluación médica urgente.' },
      { rango: '≥ 7', significado: 'Riesgo alto. Evaluación de emergencia. Considerar UCI.' },
    ],
    limitaciones: [
      'Diseñado para contexto hospitalario británico; validación en poblaciones latinoamericanas limitada.',
      'No sustituye valoración clínica ni el juicio del médico tratante.',
      'Confusión (C en ACVPU): aplica SOLO si es de nueva aparición — no confundir con demencia crónica o deterioro cognitivo basal.',
      'Escala 2 de SpO₂: usarla EXCLUSIVAMENTE en pacientes con hipercapnia crónica CONFIRMADA (EPOC GOLD III-IV con pCO₂ basal >45 mmHg).',
    ],
    comoEvaluar: [
      { item: 'Frec. respiratoria', detalle: 'Contar las respiraciones en 60 segundos. No avisar al paciente.', puntuacion: '≤8: 3 | 9–11: 1 | 12–20: 0 | 21–24: 2 | ≥25: 3' },
      { item: 'SpO₂ (Escala 1)', detalle: 'Oxímetro de pulso. Escala 1 = uso rutinario, para pacientes SIN hipercapnia crónica.', puntuacion: '≤91%: 3 | 92–93%: 2 | 94–95%: 1 | ≥96%: 0' },
      { item: 'SpO₂ (Escala 2)', detalle: 'SOLO para hipercapnia crónica confirmada. Meta SpO₂ 88–92%.', puntuacion: '≤83%: 3 | 84–85%: 2 | 86–87%: 1 | 88–92% o ≥93% con O₂: 0' },
      { item: 'Oxígeno suplem.', detalle: '¿El paciente recibe oxígeno suplementario en este momento?', puntuacion: 'Sí: 2 | No: 0' },
      { item: 'Temperatura', detalle: 'Tomar temperatura con termómetro electrónico.', puntuacion: '≤35.0: 3 | 35.1–36.0: 1 | 36.1–38.0: 0 | 38.1–39.0: 1 | ≥39.1: 2' },
      { item: 'PAS', detalle: 'Tomar con paciente en reposo. Brazo a la altura del corazón.', puntuacion: '≤90: 3 | 91–100: 2 | 101–110: 1 | 111–219: 0 | ≥220: 3' },
      { item: 'Frec. cardíaca', detalle: 'Palpación radial o monitor cardíaco. 60 segundos completos.', puntuacion: '≤40: 3 | 41–50: 1 | 51–90: 0 | 91–110: 1 | 111–130: 2 | ≥131: 3' },
      { item: 'Nivel conciencia', detalle: 'Usar escala ACVPU. A=Alerta. C=Confusión nueva. V=Voz. P=Dolor. U=Inconsciente.', puntuacion: 'Alerta: 0 | C/ V/ P/ U: 3' },
    ],
  },
  'nihss': {
    proposito: 'Cuantificar la severidad neurológica en ACV agudo. Guía decisiones de trombólisis/trombectomía y monitoreo de evolución.',
    origen: 'Brott T et al. Stroke 1989. Actualización NINDS 2024.',
    interpretacion: [
      { rango: '0', significado: 'Sin síntomas neurológicos.' },
      { rango: '1–4', significado: 'ACV menor. 80% alta a domicilio.' },
      { rango: '5–15', significado: 'Moderado. Requiere rehabilitación intrahospitalaria.' },
      { rango: '16–20', significado: 'Moderado-severo.' },
      { rango: '21–42', significado: 'Severo. Frecuentemente requiere cuidado institucional.' },
      { rango: '≥ 7', significado: 'Predictor de oclusión de gran vaso (sens 68–81%).' },
    ],
    limitaciones: [
      'Sesgo hemisférico: subestima ACV derecho. A igual NIHSS, el volumen del infarto derecho es ~2× el izquierdo.',
      'No cuantifica bien déficits no motores (afasia, negligencia).',
      'Requiere examinador entrenado para máxima confiabilidad.',
      'Ítems UN (no testeable) no suman puntos pero deben documentarse.',
      'Anotar siempre lo que el paciente HACE, no lo que puede hacer.',
    ],
    comoEvaluar: [
      { item: '1a. Alerta', detalle: 'Evaluar el nivel de conciencia.', puntuacion: '0: Alerta | 1: Somnoliento | 2: Estuporoso | 3: Coma' },
      { item: '1b. Preguntas', detalle: 'Preguntar el mes actual y la edad del paciente.', puntuacion: '0: Ambas | 1: Una | 2: Ninguna' },
      { item: '1c. Órdenes', detalle: 'Pedir abrir/cerrar ojos y mano.', puntuacion: '0: Ambas | 1: Una | 2: Ninguna' },
      { item: '2. Mirada horizontal', detalle: 'Evaluar mirada conjugada horizontal.', puntuacion: '0: Normal | 1: Paresia parcial | 2: Desviación forzada' },
      { item: '3. Campos visuales', detalle: 'Evaluar por confrontación.', puntuacion: '0: Normal | 1: Hemianopsia parcial | 2: Hemianopsia completa | 3: Ceguera bilateral' },
      { item: '4. Paresia facial', detalle: 'Pedir enseñar los dientes y cerrar ojos.', puntuacion: '0: Normal | 1: Leve | 2: Parcial | 3: Completa' },
      { item: '5a/5b. Brazos', detalle: 'Brazo extendido 90°/45°, 10 segundos.', puntuacion: '0: Sin caída | 1: Caída <10s | 2: Cae a cama | 3: Sin mov. gravedad | 4: Sin mov.' },
      { item: '6a/6b. Piernas', detalle: 'Pierna 30°, 5 segundos.', puntuacion: '0: Sin caída | 1: Caída <5s | 2: Cae a cama | 3: Sin mov. gravedad | 4: Sin mov.' },
      { item: '7. Ataxia', detalle: 'Dedo-nariz y talón-rodilla.', puntuacion: '0: Ausente | 1: 1 extremidad | 2: 2 extremidades' },
      { item: '8. Sensibilidad', detalle: 'Pinchazo con aguja.', puntuacion: '0: Normal | 1: Hipoestesia leve | 2: Hipoestesia severa' },
      { item: '9. Lenguaje', detalle: 'Describir lámina, nombrar, leer.', puntuacion: '0: Normal | 1: Afasia leve | 2: Afasia severa | 3: Global' },
      { item: '10. Disartria', detalle: 'Repetir palabras estandarizadas.', puntuacion: '0: Normal | 1: Leve | 2: Severa' },
      { item: '11. Extinción', detalle: 'Estimulación simultánea bilateral.', puntuacion: '0: Normal | 1: 1 modalidad | 2: ≥2 modalidades' },
    ],
  },
};

function calcIcon(id: string) {
  switch (id) {
    case 'apache-iv': return <Activity className="w-5 h-5" />;
    case 'sofa': case 'qsofa': return <Zap className="w-5 h-5" />;
    case 'news2': return <Heart className="w-5 h-5" />;
    case 'nihss': return <Brain className="w-5 h-5" />;
    default: return <Calculator className="w-5 h-5" />;
  }
}

export default function CalculatorsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [calculators, setCalculators] = useState<{ id: string; name: string; shortName: string; description: string; version: string; variableCount: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaTab, setFichaTab] = useState(0);

  useEffect(() => {
    fetch('/api/calculators')
      .then(r => r.json())
      .then(d => setCalculators(d.calculators || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) { setSchema(null); setFichaOpen(false); setFichaTab(0); return; }
    fetch(`/api/calculator/${selectedId}/schema`)
      .then(r => r.json())
      .then(d => {
        if (d.schema) setSchema(d.schema);
      })
      .catch(() => {});
  }, [selectedId]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header className="px-4 md:px-6 py-3 border-b border-[var(--ren-border)] flex items-center justify-between ren-bg-header shrink-0" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <CrowIcon size="lg" animate />
          <div>
            <h1 className="text-base md:text-lg font-mono tracking-tight ren-text-primary flex items-center gap-2">
              Calculadoras <span className="text-[10px] font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--ren-border)]">α</span>
            </h1>
            <p className="text-[10px] md:text-[11px] ren-text-tertiary font-mono">Herramientas clínicas determinísticas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!authLoading && !user && (
            <button onClick={() => router.push('/login')} className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/30 hover:bg-[var(--accent-color)]/20 transition-all font-mono">
              Iniciar sesión
            </button>
          )}
          <button onClick={() => router.push('/chat')} className="p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors" title="Ir al chat">
            <ArrowLeft size={18} className="text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto ren-scrollbar border-b border-[var(--ren-border)] shrink-0">
          <div className="flex gap-1 p-2" style={{ minWidth: 'max-content' }}>
            {calculators.map(calc => (
              <button
                key={calc.id}
                onClick={() => setSelectedId(calc.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                  selectedId === calc.id
                    ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25 text-[var(--accent-color)]'
                    : 'bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] ren-text-secondary'
                }`}
              >
                {calc.shortName || calc.name}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto ren-scrollbar">
          {!selectedId ? (
            <div className="flex items-center justify-center min-h-full p-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 flex items-center justify-center">
                      <FlaskConical className="w-7 h-7 text-[var(--accent-hover)]" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold ren-gradient-text mb-1">Calculadoras clínicas</h2>
                  <p className="text-xs ren-text-secondary leading-relaxed">Scores pronósticos determinísticos. Resultados reproducibles — el modelo nunca interviene.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {calculators.map((calc, i) => (
                    <motion.button
                      key={calc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setSelectedId(calc.id)}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:bg-[var(--accent-color)]/5 transition-all text-left"
                    >
                      <span className="w-10 h-10 rounded-xl bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] flex items-center justify-center text-[var(--ren-text-tertiary)] group-hover:text-[var(--accent-hover)] group-hover:border-[var(--accent-color)]/30 transition-all shrink-0">
                        {calcIcon(calc.id)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold ren-text-primary">{calc.shortName || calc.name}</p>
                        <p className="text-[10px] ren-text-tertiary mt-0.5">{calc.description}</p>
                        <p className="text-[10px] font-mono ren-text-tertiary mt-1">{calc.variableCount} variables · v{calc.version}</p>
                      </div>
                      <ChevronRight size={16} className="ren-text-tertiary group-hover:text-[var(--accent-hover)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="p-3 md:p-5 max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <button onClick={() => { setSelectedId(null); }} className="flex items-center gap-1.5 text-xs font-mono ren-text-tertiary hover:text-[var(--accent-hover)] transition-colors mb-4">
                    <ArrowLeft size={14} />
                    Todas las calculadoras
                  </button>

                  <div className="mb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25 flex items-center justify-center shrink-0">
                        {calcIcon(selectedId)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold ren-text-primary tracking-tight">{schema?.name || selectedId}</h2>
                          <span className="text-[10px] font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] px-2 py-0.5 rounded">{schema?.version}</span>
                        </div>
                        <p className="text-xs ren-text-secondary mt-0.5 leading-relaxed">{schema?.description}</p>
                        <div className="flex gap-4 mt-1.5">
                          {schema?.longDescription && (
                            <button
                              onClick={() => {
                                const detail = document.getElementById('calc-detail-' + selectedId);
                                if (detail) detail.classList.toggle('hidden');
                              }}
                              className="text-[11px] font-mono ren-text-tertiary cursor-pointer hover:text-[var(--accent-hover)] transition-colors flex items-center gap-1"
                            >
                              <Info size={11} />
                              más información
                            </button>
                          )}
                          {fichasTecnicas[selectedId] && (
                            <button
                              onClick={() => setFichaOpen(!fichaOpen)}
                              className={`text-[11px] font-mono cursor-pointer transition-colors flex items-center gap-1 ${
                                fichaOpen ? 'text-[var(--accent-hover)]' : 'ren-text-tertiary hover:text-[var(--accent-hover)]'
                              }`}
                            >
                              <FileText size={11} />
                              ficha técnica
                            </button>
                          )}
                        </div>
                        <div id={'calc-detail-' + selectedId} className="hidden mt-2">
                          <p className="text-xs ren-text-secondary leading-relaxed pl-3 border-l-2 border-[var(--accent-color)]/40">{schema?.longDescription}</p>
                          {schema?.reference && (
                            <p className="text-[10px] ren-text-tertiary mt-1 pl-3 italic">Ref: {schema.reference}</p>
                          )}
                        </div>
                        {fichaOpen && fichasTecnicas[selectedId] && (() => {
                          const f = fichasTecnicas[selectedId];
                          const tabs = [
                            { id: 'proposito', label: 'Propósito', icon: Info },
                            { id: 'interpretacion', label: 'Interpretación', icon: BarChart3 },
                            ...(f.comoEvaluar ? [{ id: 'como-evaluar', label: 'Cómo evaluar', icon: BookOpen }] : []),
                            { id: 'limitaciones', label: 'Limitaciones', icon: AlertTriangle },
                          ];
                          const activeTabId = tabs[fichaTab]?.id;
                          return (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 rounded-xl border border-[var(--ren-border)] bg-[var(--ren-bg-secondary)] overflow-hidden"
                            >
                              <div className="p-4">
                                <div className="flex gap-1 overflow-x-auto ren-scrollbar mb-4">
                                  {tabs.map((tab, idx) => (
                                    <button
                                      key={tab.id}
                                      onClick={() => setFichaTab(idx)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                                        fichaTab === idx
                                          ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25 text-[var(--accent-color)]'
                                          : 'bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] ren-text-secondary hover:text-[var(--accent-hover)]'
                                      }`}
                                    >
                                      <tab.icon size={12} />
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="min-h-[100px]">
                                  {activeTabId === 'proposito' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                                      <div className="mb-3">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-1">Propósito</p>
                                        <p className="text-xs ren-text-secondary leading-relaxed">{f.proposito}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-1">Origen</p>
                                        <p className="text-[11px] ren-text-tertiary italic leading-relaxed">{f.origen}</p>
                                      </div>
                                    </motion.div>
                                  )}
                                  {activeTabId === 'interpretacion' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {f.interpretacion.map((i, idx) => (
                                          <div key={idx} className="border border-[var(--ren-border)] bg-[var(--ren-bg-tertiary)] rounded-lg p-3">
                                            <p className="text-xs font-mono font-semibold ren-text-primary mb-1">{i.rango}</p>
                                            <p className="text-[11px] ren-text-secondary leading-relaxed">{i.significado}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                  {activeTabId === 'como-evaluar' && f.comoEvaluar && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                                      <div className="space-y-1">
                                        {f.comoEvaluar.map((ce, idx) => (
                                          <details key={idx} className="group">
                                            <summary className="text-xs font-semibold ren-text-primary cursor-pointer hover:text-[var(--accent-hover)] transition-colors list-none flex items-center gap-1.5 py-1">
                                              <ChevronRight size={11} className="ren-text-tertiary group-open:rotate-90 transition-transform shrink-0" />
                                              {ce.item}
                                            </summary>
                                            <div className="mt-1 ml-4 space-y-1 pb-1">
                                              <p className="text-[11px] ren-text-secondary leading-relaxed">{ce.detalle}</p>
                                              <p className="text-[10px] font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] rounded px-2 py-1">{ce.puntuacion}</p>
                                            </div>
                                          </details>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                  {activeTabId === 'limitaciones' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                                      <ul className="space-y-2">
                                        {f.limitaciones.map((l, idx) => (
                                          <li key={idx} className="text-[11px] ren-text-tertiary leading-relaxed flex items-start gap-2">
                                            <span className="w-1 h-1 rounded-full bg-[var(--accent-color)]/60 mt-1.5 shrink-0" />
                                            {l}
                                          </li>
                                        ))}
                                      </ul>
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Componentes por calculadora */}
                  {selectedId === 'sofa' && <SofaCalculator />}
                  {selectedId === 'news2' && <News2Calculator />}
                  {selectedId === 'nihss' && <NihssCalculator />}
                  {selectedId === 'apache-iv' && (
                    <div className="apache-iv-root">
                      <ApacheIVCalculator />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="h-6" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
