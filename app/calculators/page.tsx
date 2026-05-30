'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Beaker, ChevronDown, ChevronRight, Calculator, AlertCircle, Info, FlaskConical, Activity, Heart, Droplets, Thermometer, Wind, Syringe, Pill, Zap, BarChart3, Globe, FileText, Brain, Copy, BookOpen, AlertTriangle } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { useAuth } from '@/lib/auth-context';
import ApacheIVCalculator from '@/components/calculators/apache-iv-calculator';

type CalcVariable = {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean';
  unit?: string;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  step?: number;
  defaultValue?: any;
  options?: { value: string; label: string; groupDependency?: string; systemDependency?: string }[];
  group?: string;
  renderAs?: 'radio' | 'conditional';
  condition?: { dependsOn: string; values: string[] };
  cascade?: { trigger: string; field: string; parentTrigger?: string; parentField?: string; valueMap?: Record<string, string> };
  disablable?: string; // key of boolean field that disables this input
};

type CalcSchema = {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  longDescription: string;
  reference: string;
  version: string;
  variables: CalcVariable[];
};

type CalcListItem = {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  version: string;
  variableCount: number;
};

type CalcResult = {
  result: {
    aps: number;
    totalScore: number;
    mortalityPct: number;
    losDays: number;
    severity: string;
    gcsNaUsed: boolean;
    gcsTotal: number;
    gcsNote?: string;
    details: Record<string, any>;
    diagnosisLabel: string;
  };
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

// ── Fichas técnicas de cada calculadora ──
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
      'Confusión (C en ACVPU): aplica SOLO si es de nueva aparición — no confundir con demencia crónica o deterioro cognitivo basal. "Nueva" significa que el personal de salud nota un cambio respecto al estado mental habitual del paciente. Puntúa automáticamente 3 aunque el resto de NEWS sea normal.',
      'Escala 2 de SpO₂: usarla EXCLUSIVAMENTE en pacientes con hipercapnia crónica CONFIRMADA (EPOC GOLD III-IV con pCO₂ basal >45 mmHg documentada en gasometría previa). La meta de SpO₂ en estos pacientes es 88-92%. No se usa por defecto ni en pacientes con EPOC sin hipercapnia documentada. Usar Escala 1 para todo lo demás.',
    ],
    comoEvaluar: [
      { item: 'Frec. respiratoria', detalle: 'Contar las respiraciones en 60 segundos. No avisar al paciente. Registrar el valor en rpm.', puntuacion: '≤8: 3 | 9–11: 1 | 12–20: 0 | 21–24: 2 | ≥25: 3' },
      { item: 'SpO₂ (Escala 1)', detalle: 'Usar oxímetro de pulso. Escala 1 = uso rutinario, para pacientes SIN hipercapnia crónica. Esperar señal estable.', puntuacion: '≤91%: 3 | 92–93%: 2 | 94–95%: 1 | ≥96%: 0' },
      { item: 'SpO₂ (Escala 2)', detalle: 'SOLO para hipercapnia crónica confirmada. Meta SpO₂ 88–92%.', puntuacion: '≤83%: 3 | 84–85%: 2 | 86–87%: 1 | 88–92% o ≥93% con O₂: 0' },
      { item: 'Oxígeno suplem.', detalle: '¿El paciente recibe oxígeno suplementario en este momento? Sí = 2, No = 0.', puntuacion: 'Sí: 2 | No: 0' },
      { item: 'Temperatura', detalle: 'Tomar temperatura con termómetro electrónico. La vía (oral/axilar/timpánica) debe ser consistente.', puntuacion: '≤35.0: 3 | 35.1–36.0: 1 | 36.1–38.0: 0 | 38.1–39.0: 1 | ≥39.1: 2' },
      { item: 'PAS', detalle: 'Tomar con paciente en reposo. Brazo a la altura del corazón.', puntuacion: '≤90: 3 | 91–100: 2 | 101–110: 1 | 111–219: 0 | ≥220: 3' },
      { item: 'Frec. cardíaca', detalle: 'Palpación radial o monitor cardíaco. 60 segundos completos.', puntuacion: '≤40: 3 | 41–50: 1 | 51–90: 0 | 91–110: 1 | 111–130: 2 | ≥131: 3' },
      { item: 'Nivel conciencia', detalle: 'Usar escala ACVPU. A=Alerta. C=Confusión de nueva aparición. V=Responde a voz. P=Responde a dolor. U=Inconsciente.', puntuacion: 'Alerta: 0 | C/ V/ P/ U: 3' },
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
      'Administración: 5–8 minutos. Sin ayuda al paciente. Sin suposiciones.',
    ],
    comoEvaluar: [
      { item: '1a. Alerta', detalle: 'Evaluar el nivel de conciencia. Si el paciente no responde completamente, aplicar estímulo verbal y luego doloroso (presión en lecho ungueal o trapecio).', puntuacion: '0: Alerta, responde bien. 1: No alerta pero responde a estímulo menor. 2: Solo responde a estímulos repetidos/dolor. 3: Sin respuesta o reflejos solamente.' },
      { item: '1b. Preguntas', detalle: 'Preguntar el mes actual y la edad del paciente. Una sola oportunidad. No ayudar, no dar pistas. Si está intubado/afásico/barrera de idioma, puntuar 1.', puntuacion: '0: Ambas correctas. 1: Una correcta. 2: Ninguna correcta.' },
      { item: '1c. Órdenes', detalle: 'Pedir: "abra y cierre los ojos", luego "cierre y abra la mano" (lado no parético). Si no puede usar las manos, usar comando alternativo de un paso. Puntuar según el mejor esfuerzo.', puntuacion: '0: Ambas correctas. 1: Una correcta. 2: Ninguna correcta.' },
      { item: '2. Mirada horizontal', detalle: 'Evaluar mirada conjugada horizontal. Pedir al paciente que siga su dedo. Solo movimientos voluntarios. No usar reflejo oculocefálico a menos que el paciente no pueda cooperar.', puntuacion: '0: Normal. 1: Paresia parcial de mirada. 2: Desviación forzada o paresia total.' },
      { item: '3. Campos visuales', detalle: 'Evaluar por confrontación. Contar dedos en cada cuadrante. Si el paciente no puede cooperar por afasia, usar amenaza visual (parpadeo).', puntuacion: '0: Sin pérdida. 1: Hemianopsia parcial. 2: Hemianopsia completa. 3: Ceguera bilateral.' },
      { item: '4. Paresia facial', detalle: 'Pedir: "enseñe los dientes" y "cierre los ojos con fuerza". Evaluar asimetría en tercio inferior de la cara. En paciente conciente, no usar reflejos.', puntuacion: '0: Normal. 1: Paresia leve (asimetría al sonreír). 2: Paresia parcial (cara inferior). 3: Parálisis completa uni o bilateral.' },
      { item: '5a/5b. Brazos', detalle: 'Brazo extendido 90° (sentado) o 45° (supino), palma hacia abajo. Mantener 10 segundos. Evaluar cada brazo por separado. No ayudar.', puntuacion: '0: Sin caída. 1: Caída <10s sin tocar cama. 2: Cae a cama, contra gravedad. 3: Sin movimiento contra gravedad. 4: Sin movimiento.' },
      { item: '6a/6b. Piernas', detalle: 'Pierna elevada 30°, rodilla extendida. Mantener 5 segundos. Evaluar cada pierna por separado. Paciente en supino.', puntuacion: '0: Sin caída. 1: Caída <5s sin tocar cama. 2: Cae a cama, contra gravedad. 3: Sin movimiento contra gravedad. 4: Sin movimiento.' },
      { item: '7. Ataxia', detalle: 'Prueba dedo-nariz y talón-rodilla bilateral. DIFICULTAD: si el paciente tiene debilidad (paresia), la ataxia solo se puntúa si el movimiento es desproporcionadamente dismétrico para el grado de fuerza. Si hay parálisis completa (4), documentar UN. Si el paciente no coopera, documentar UN. Una sola oportunidad — no repetir.', puntuacion: '0: Ausente. 1: Ataxia en 1 miembro. 2: Ataxia en 2 miembros. UN: Parálisis/amputación/no coopera.' },
      { item: '8. Sensibilidad', detalle: 'Pinchazo con aguja (no afilada) en cara, brazo, tronco, pierna bilateral. DIFERENCIA ENTRE 1 Y 2: puntuar 1 cuando el paciente REPORTA que siente el pinchazo pero "diferente" o "menos agudo" en un lado. Puntuar 2 cuando el paciente NO siente el pinchazo en absoluto en esa zona. Si hay afasia, evaluar por muecas o retirada al estímulo doloroso — si no hay respuesta, asumir 2.', puntuacion: '0: Normal bilateral. 1: Pérdida leve-moderada (siente pero menos agudo). 2: Pérdida severa o total (no siente el pinchazo).' },
      { item: '9. Lenguaje', detalle: 'Describir la lámina del kit NIHSS. Nombrar objetos. Leer frases. Evaluar 3 ejes: fluidez (habla espontánea), comprensión (sigue instrucciones), repetición (repite frases). DIFERENCIA 1 VS 2: 1 = puedes mantener conversación aunque con errores. 2 = comunicación fragmentada, el paciente no puede expresar ideas completas. 3 = afasia global, no produce ni comprende lenguaje.', puntuacion: '0: Normal. 1: Afasia leve-moderada (conversación posible con errores). 2: Afasia severa (comunicación fragmentada, ideas incompletas). 3: Mutismo o afasia global.' },
      { item: '10. Disartria', detalle: 'Pedir al paciente que lea o repita palabras de la lista estandarizada del NIHSS. Evaluar claridad articulatoria. DIFERENCIA 1 VS 2: 1 = el paciente es inteligible aunque suene arrastrado. 2 = el paciente es ininteligible incluso en contexto. Si está intubado, traqueostomizado o con barrera física que impida evaluar, marcar UN.', puntuacion: '0: Normal. 1: Leve-moderada (inteligible). 2: Severa (ininteligible) o anártrico. UN: Intubado/barrera física.' },
      { item: '11. Extinción / Negligencia', detalle: 'Estimular ambos lados SIMULTÁNEAMENTE (visual: mover dedos en ambos campos; táctil: tocar ambos brazos). El paciente debe señalar dónde sintió. DIFERENCIA 1 VS 2: 1 = extingue en una modalidad (ej. táctil pero no visual) o la negligencia es leve. 2 = no responde a estímulos en un lado en MÚLTIPLES modalidades (visual + táctil + auditiva).', puntuacion: '0: Sin anomalía. 1: Inatención a 1 modalidad (visual O táctil). 2: Hemiinatención severa a >1 modalidad.' },
    ],
  },
};

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

export default function CalculatorsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [calculators, setCalculators] = useState<CalcListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schema, setSchema] = useState<CalcSchema | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [result, setResult] = useState<CalcResult['result'] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaTab, setFichaTab] = useState(0);

  // Cargar lista de calculadoras
  useEffect(() => {
    fetch('/api/calculators')
      .then(r => r.json())
      .then(d => setCalculators(d.calculators || []))
      .catch(() => {});
  }, []);

  // Cargar schema al seleccionar
  useEffect(() => {
    if (!selectedId) { setSchema(null); setResult(null); setFichaOpen(false); setFichaTab(0); return; }
    setSchemaLoading(true);
    fetch(`/api/calculator/${selectedId}/schema`)
      .then(r => r.json())
      .then(d => {
        setSchemaLoading(false);
        if (d.schema) {
          setSchema(d.schema);
          // Inicializar valores: SOLO select/boolean con defaultValue, sin pre-poblar fisiológicos
          const defaults: Record<string, any> = {};
          d.schema.variables.forEach((v: CalcVariable) => {
            if (v.defaultValue !== undefined) {
              defaults[v.key] = v.defaultValue;
            } else if (v.type === 'boolean' && !v.renderAs) {
              defaults[v.key] = false;
            }
          });
          setFormValues(defaults);
          setResult(null);
          setError(null);
        }
      })
      .catch(() => {
        setSchemaLoading(false);
        setError('No se pudo cargar la calculadora');
      });
  }, [selectedId]);

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value };

      // Resetear diagnóstico en cascada cuando cambia admisión o sistema
      if (key === 'admissionType') {
        delete next.diagnosisSystem;
        delete next.diagnosisKey;
      } else if (key === 'diagnosisSystem') {
        delete next.diagnosisKey;
      }

      return next;
    });
  };

  const handleCalculate = async () => {
    if (!selectedId || !schema) return;

    // ── Validación de campos requeridos (APACHE IV) ──
    if (selectedId === 'apache-iv') {
      const requiredFields = schema.variables.filter(v => v.required === true);
      const missing = requiredFields.filter(v => {
        const val = formValues[v.key];
        if (v.type === 'number') return val === '' || val === undefined || val === null || val < 0;
        if (v.type === 'select') return !val || val === '';
        if (v.type === 'boolean') return val === undefined || val === null;
        return false;
      });
      if (missing.length > 0) {
        setError(`Campos obligatorios: ${missing.map(v => v.label).join(', ')}`);
        return;
      }
    }

    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/calculator/${selectedId}/calculate`, {
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

  const severity = result ? severityColor(result.severity) : null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
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
        {/* Selector — pills compactas para todas las pantallas */}
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

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto ren-scrollbar">
          {!selectedId ? (
            /* Pantalla de bienvenida — tarjetas de navegación */
            <div className="flex items-center justify-center min-h-full p-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
              >
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 flex items-center justify-center">
                      <FlaskConical className="w-7 h-7 text-[var(--accent-hover)]" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold ren-gradient-text mb-1">Calculadoras clínicas</h2>
                  <p className="text-xs ren-text-secondary leading-relaxed">
                    Scores pronósticos determinísticos. Resultados reproducibles — el modelo nunca interviene.
                  </p>
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
              {/* Encabezado de la calculadora */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Volver a calculadoras */}
                  <button
                    onClick={() => { setSelectedId(null); setResult(null); }}
                    className="flex items-center gap-1.5 text-xs font-mono ren-text-tertiary hover:text-[var(--accent-hover)] transition-colors mb-4"
                  >
                    <ArrowLeft size={14} />
                    Todas las calculadoras
                  </button>

                  {/* Título y descripción */}
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
                          <div>
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
                            <div id={'calc-detail-' + selectedId} className="hidden mt-2">
                              <p className="text-xs ren-text-secondary leading-relaxed pl-3 border-l-2 border-[var(--accent-color)]/40">{schema.longDescription}</p>
                              {schema.reference && (
                                <p className="text-[10px] ren-text-tertiary mt-1 pl-3 italic">Ref: {schema.reference}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {fichasTecnicas[selectedId] && (
                          <div>
                            <button
                              onClick={() => setFichaOpen(!fichaOpen)}
                              className={`text-[11px] font-mono cursor-pointer transition-colors flex items-center gap-1 ${
                                fichaOpen ? 'text-[var(--accent-hover)]' : 'ren-text-tertiary hover:text-[var(--accent-hover)]'
                              }`}
                            >
                              <FileText size={11} />
                              ficha técnica
                            </button>
                          </div>
                        )}
                        </div>
                        {/* Panel de ficha técnica expandible */}
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
                                {/* Tabs — pills horizontales */}
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

                                {/* Contenido de tabs con animación fade */}
                                <div className="min-h-[100px]">
                                  {/* Tab: Propósito */}
                                  {activeTabId === 'proposito' && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
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

                                  {/* Tab: Interpretación */}
                                  {activeTabId === 'interpretacion' && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
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

                                  {/* Tab: Cómo evaluar */}
                                  {activeTabId === 'como-evaluar' && f.comoEvaluar && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
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

                                  {/* Tab: Limitaciones */}
                                  {activeTabId === 'limitaciones' && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
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

                  {schemaLoading ? (
                    <div className="animate-pulse space-y-5 py-4">
                      <div>
                        <div className="h-3 bg-[var(--ren-bg-tertiary)] rounded w-1/4 mb-3" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                        </div>
                      </div>
                      <div>
                        <div className="h-3 bg-[var(--ren-bg-tertiary)] rounded w-1/3 mb-3" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                          <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                        </div>
                      </div>
                      <div>
                        <div className="h-3 bg-[var(--ren-bg-tertiary)] rounded w-1/5 mb-3" />
                        <div className="h-[42px] bg-[var(--ren-bg-tertiary)] rounded-lg" />
                      </div>
                      <div className="flex justify-center">
                        <div className="h-12 bg-[var(--ren-bg-tertiary)] rounded-xl w-full md:w-[280px]" />
                      </div>
                    </div>
                  ) : selectedId === 'apache-iv' ? (
                    <div className="apache-iv-root">
                      <ApacheIVCalculator />
                    </div>
                  ) : (
                    <>
                  {/* Formulario — grupos con subtítulos */}
                  {(() => {
                    const vars = schema?.variables || [];
                    type GroupVar = typeof vars extends (infer V)[] ? V : never;
                    const groups: { group: string; variables: typeof vars }[] = [];
                    vars.forEach(v => {
                      const g = v.group || 'General';
                      let last = groups[groups.length - 1];
                      if (!last || last.group !== g) {
                        groups.push({ group: g, variables: [v] });
                      } else {
                        last.variables.push(v);
                      }
                    });
                    return groups.map((grp, gi) => {
                      // Filtrar variables visibles (condicionales + cascade)
                      const visibleVars = grp.variables.filter(variable => {
                        // Condicional por variable.condition
                        if (variable.condition) {
                          const depVal = formValues[variable.condition.dependsOn];
                          if (!variable.condition.values.includes(depVal)) return false;
                        }
                        return true;
                      });

                      // No renderizar grupo si no hay variables visibles
                      if (visibleVars.length === 0) return null;

                      // Helper: filtrar opciones de un select por cascade
                      const filterOptions = (variable: CalcVariable): typeof variable.options => {
                        if (!variable.cascade || !variable.options) return variable.options;
                        let triggerVal = formValues[variable.cascade.trigger];
                        let parentVal = variable.cascade.parentTrigger
                          ? formValues[variable.cascade.parentTrigger]
                          : null;
                        // Aplicar valueMap: traduce el triggerVal al valor real en las options
                        const cascadeAny = variable.cascade as any;
                        if (cascadeAny.valueMap && triggerVal != null && cascadeAny.valueMap[triggerVal] !== undefined) {
                          triggerVal = cascadeAny.valueMap[triggerVal];
                        }
                        // Aplicar parentValueMap: traduce parentVal
                        if (cascadeAny.parentValueMap && parentVal != null && cascadeAny.parentValueMap[parentVal] !== undefined) {
                          parentVal = cascadeAny.parentValueMap[parentVal];
                        }
                        return variable.options.filter(opt => {
                          const optAny = opt as any;
                          // Debe coincidir con el trigger principal
                          const matchesCascade = triggerVal != null
                            ? optAny[variable.cascade!.field] === triggerVal
                            : false;
                          // Y también con el padre si existe
                          const matchesParent = parentVal != null && variable.cascade!.parentField
                            ? optAny[variable.cascade!.parentField] === parentVal
                            : true;
                          return matchesCascade && matchesParent;
                        });
                      };

                      return (
                      <div key={grp.group} className="mb-8">
                        {/* Grupo — subtítulo limpio */}
                        <div className="mb-4 pl-1">
                          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary">
                            {grp.group}
                          </h3>
                        </div>
                        {/* Variables del grupo en grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                          {visibleVars.map(variable => (
                            <motion.div
                              key={variable.key}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              {variable.type === 'boolean' && variable.renderAs === 'radio' ? (
                                <div>
                                  <label className="block text-xs font-mono ren-text-tertiary mb-1 px-1">
                                    {variable.label}
                                    {variable.required && <span className="text-red-400 ml-0.5">*</span>}
                                  </label>
                                  <div className="flex rounded-lg border border-[var(--ren-border)] overflow-hidden">
                                    <button
                                      onClick={() => updateValue(variable.key, true)}
                                      className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                                        formValues[variable.key] === true
                                          ? 'bg-[var(--accent-color)] text-white shadow-sm'
                                          : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                                      }`}
                                    >
                                      Sí
                                    </button>
                                    <button
                                      onClick={() => updateValue(variable.key, false)}
                                      className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                                        formValues[variable.key] === false
                                          ? 'bg-[var(--accent-color)] text-white shadow-sm'
                                          : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                                      }`}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ) : variable.type === 'boolean' && variable.renderAs !== 'radio' ? (
                                <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--ren-border)] bg-[var(--ren-bg-secondary)] hover:border-[var(--ren-border-subtle)] transition-all cursor-pointer h-full">
                                  <input
                                    type="checkbox"
                                    checked={formValues[variable.key] || false}
                                    onChange={e => {
                                      updateValue(variable.key, e.target.checked);
                                    }}
                                    className="w-4 h-4 rounded border-[var(--ren-border)] bg-[var(--ren-bg-primary)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]/50 shrink-0"
                                  />
                                  <span className="text-sm ren-text-primary">{variable.label}</span>
                                </label>
                              ) : variable.type === 'select' ? (
                                <div>
                                  <label className="block text-xs font-mono ren-text-tertiary mb-0.5 px-1">
                                    {variable.label}
                                    {variable.required && <span className="text-red-400 ml-0.5">*</span>}
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={formValues[variable.key] ?? variable.defaultValue ?? ''}
                                      onChange={e => updateValue(variable.key, e.target.value)}
                                      disabled={variable.disablable ? formValues[variable.disablable] === true : false}
                                      className={`w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg px-3 py-2.5 pr-8 text-sm ren-text-primary appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/40 focus:border-[var(--accent-color)]/60 transition-all ${
                                        variable.disablable && formValues[variable.disablable] ? 'opacity-40 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      <option value="">— Seleccione —</option>
                                      {filterOptions(variable)?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                                      <ChevronDown size={14} className="ren-text-tertiary" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-xs font-mono ren-text-tertiary mb-0.5 px-1">
                                    {variable.label}
                                    {variable.required && <span className="text-red-400 ml-0.5">*</span>}
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      value={formValues[variable.key] ?? ''}
                                      onChange={e => updateValue(variable.key, e.target.value ? Number(e.target.value) : '')}
                                      min={variable.min}
                                      max={variable.max}
                                      step={variable.step ?? 1}
                                      placeholder={variable.placeholder}
                                      disabled={variable.disablable ? formValues[variable.disablable] === true : false}
                                      className={`w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm ren-text-primary placeholder:text-[var(--ren-text-tertiary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/40 focus:border-[var(--accent-color)]/60 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                        variable.disablable && formValues[variable.disablable] ? 'opacity-40 cursor-not-allowed' : ''
                                      }`}
                                    />
                                    {variable.unit && (
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ren-text-tertiary pointer-events-none">
                                        {variable.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );});
                  })()}

                  {/* ── qSOFA en vivo (solo para SOFA) ── */}
                  {selectedId === 'sofa' && (() => {
                    const rr = Number(formValues.qsofa_rr);
                    const sbp = Number(formValues.qsofa_sbp);
                    const gcs = Number(formValues.qsofa_gcs);
                    const hasQsofaData = !isNaN(rr) && !isNaN(sbp) && !isNaN(gcs) && rr > 0 && sbp > 0;
                    if (!hasQsofaData) return null;
                    const qRr = rr >= 22 ? 1 : 0;
                    const qSbp = sbp <= 100 ? 1 : 0;
                    const qGcs = gcs < 15 ? 1 : 0;
                    const qTotal = qRr + qSbp + qGcs;
                    const qPositive = qTotal >= 2;
                    return (
                      <div className="mb-4">
                        <div className={`rounded-xl border overflow-hidden ${qPositive ? 'border-red-500/25 bg-red-500/5' : 'border-emerald-500/25 bg-emerald-500/5'}`}>
                          <div className="p-4">
                            <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-2 flex items-center gap-1.5">
                              <Zap size={12} />
                              qSOFA — en vivo
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">FR ≥22</p>
                                <p className={`text-lg font-bold tabular-nums ${qRr ? 'text-red-400' : 'ren-text-primary'}`}>{qRr}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">PAS ≤100</p>
                                <p className={`text-lg font-bold tabular-nums ${qSbp ? 'text-red-400' : 'ren-text-primary'}`}>{qSbp}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">GCS &lt;15</p>
                                <p className={`text-lg font-bold tabular-nums ${qGcs ? 'text-red-400' : 'ren-text-primary'}`}>{qGcs}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold ren-text-primary tabular-nums">{qTotal}/3</span>
                              {qPositive ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">⚠️ Alto riesgo — evaluar SOFA</span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Bajo riesgo</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedId !== 'apache-iv' && (
                    <>
                  {/* Botón Calcular */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleCalculate}
                      disabled={isCalculating}
                      className="w-full md:w-auto md:min-w-[280px] py-3 px-8 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ren-btn-glow"
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
                    </>
                  )}
                    </>
                  )}

                  {selectedId !== 'apache-iv' && error && (
                    <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-mono flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      {error}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Resultado — dinámico por tipo de calculadora */}
              {(() => {
                const calcId = selectedId;
                const r = result as Record<string, any>;
                if (!r) return null;
                if (calcId === 'apache-iv') return null;

                // ── Helper para badge de severidad ──
                const SeverityBadge = ({ label, severityText }: { label: string; severityText: string }) => {
                  const col = severityColor(severityText);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border ${col.border} ${col.bg} overflow-hidden`}
                    >
                      <div className="p-5">
                        {label && (
                          <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-2">{label}</p>
                        )}
                        {severityText && (
                          <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded-full ${col.bg} ${col.text} border ${col.border}`}>
                            {severityText}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                };

                // ── Helper: renderizar componentes detallados ──
                const renderComponents = (components: Record<string, number>) => {
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      {Object.entries(components).map(([key, value]) => (
                        <div key={key} className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                          <p className="text-[9px] font-mono uppercase tracking-wider ren-text-tertiary truncate">{key}</p>
                          <p className="text-lg font-bold ren-text-primary tabular-nums">{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                };

                // ── Helper: botón copiar ──
                const copyText = (text: string) => {
                  navigator.clipboard.writeText(text).catch(() => {});
                };

                // ── APACHE IV ──
                if (calcId === 'apache-iv') {
                  const severityClass = severityColor(r.severity);
                  return (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        className="mt-4"
                      >
                        <div className={`rounded-xl border ${severityClass.border} ${severityClass.bg} overflow-hidden`}>
                          <div className="p-5">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 16, stiffness: 140 }}>
                                <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">APACHE IV Score</p>
                                <span className="text-2xl font-bold ren-text-primary tabular-nums">{r.totalScore}</span>
                              </motion.div>
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.05 }} className="text-right">
                                <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">APS</p>
                                <span className="text-2xl font-bold ren-text-primary tabular-nums">{r.aps}</span>
                              </motion.div>
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.1 }}>
                                <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">Mortalidad estimada</p>
                                <div className="flex items-baseline gap-1.5">
                                  <span className={`text-2xl font-bold tabular-nums ${severityClass.text}`}>{r.mortalityPct}%</span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${severityClass.bg} ${severityClass.text} border ${severityClass.border}`}>{r.severity}</span>
                                </div>
                              </motion.div>
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.15 }} className="text-right">
                                <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">LOS estimada</p>
                                <span className="text-2xl font-bold ren-text-primary tabular-nums">{r.losDays} <span className="text-xs ren-text-tertiary font-mono">días</span></span>
                              </motion.div>
                            </div>
                            <div className="h-1.5 bg-[var(--ren-bg-tertiary)] rounded-full mb-4">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(r.mortalityPct, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full ${severityClass.bar} rounded-full`} />
                            </div>
                            {r.diagnosisLabel && (
                              <div className="flex justify-center mb-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]">
                                  <FileText size={11} className="ren-text-tertiary" />
                                  {r.diagnosisLabel}
                                </span>
                              </div>
                            )}
                            {r.gcsNote && (
                              <div className="flex justify-center mt-1">
                                <span className="text-[10px] font-mono ren-text-tertiary">{r.gcsNote}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button onClick={handleCalculate} className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
                          <button onClick={() => copyText(`APACHE IV | Score: ${r.totalScore} | APS: ${r.aps} | Mortalidad: ${r.mortalityPct}% | Severidad: ${r.severity} | LOS: ${r.losDays}d`)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
                          <button onClick={() => setResult(null)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  );
                }

                // ── SOFA + qSOFA ──
                if (calcId === 'sofa' || calcId === 'qsofa') {
                  const severityClass = severityColor(r.sofa_severity || '');
                  return (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 200 }} className="mt-4">
                        {/* qSOFA */}
                        <div className={`rounded-xl border bg-[var(--ren-bg-secondary)] border-[var(--ren-border)] mb-3`}>
                          <div className="p-4">
                            <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-2">qSOFA — Cribado rápido</p>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">FR ≥22</p>
                                <p className={`text-lg font-bold tabular-nums ${r.qsofa_detail?.rr_points ? severityClass.text : 'ren-text-primary'}`}>{r.qsofa_detail?.rr_points ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">PAS ≤100</p>
                                <p className={`text-lg font-bold tabular-nums ${r.qsofa_detail?.sbp_points ? severityClass.text : 'ren-text-primary'}`}>{r.qsofa_detail?.sbp_points ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">GCS &lt;15</p>
                                <p className={`text-lg font-bold tabular-nums ${r.qsofa_detail?.gcs_points ? severityClass.text : 'ren-text-primary'}`}>{r.qsofa_detail?.gcs_points ?? '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold ren-text-primary tabular-nums">{r.qsofa_score}/3</span>
                              {r.qsofa_positive ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">⚠️ Alto riesgo — evaluar SOFA</span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Bajo riesgo</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SOFA completo */}
                        <div className={`rounded-xl border ${severityClass.border} ${severityClass.bg} overflow-hidden`}>
                          <div className="p-4">
                            <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-3">SOFA — Disfunción orgánica</p>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">Resp</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_resp ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">Coag</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_coag ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">Hep</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_hepatic ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">CV</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_cv ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">SNC</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_cns ?? '-'}</p>
                              </div>
                              <div className="bg-[var(--ren-bg-tertiary)] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-mono ren-text-tertiary">Renal</p>
                                <p className="text-xl font-bold ren-text-primary tabular-nums">{r.sofa_renal ?? '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-baseline gap-3 mb-2">
                              <span className="text-2xl font-bold ren-text-primary tabular-nums">{r.sofa_total}/24</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${severityClass.bg} ${severityClass.text} border ${severityClass.border}`}>{r.sofa_severity}</span>
                            </div>
                            <p className="text-xs ren-text-tertiary font-mono">Mortalidad estimada: {r.sofa_mortality_estimate}</p>
                            {r.paFi && <p className="text-[10px] ren-text-tertiary font-mono mt-1">PaFi: {r.paFi}</p>}
                          </div>
                        </div>

                        {(r.components) && renderComponents(r.components as Record<string, number>)}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button onClick={handleCalculate} className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all">Recalcular</button>
                          <button onClick={() => copyText(`SOFA | qSOFA: ${r.qsofa_score}/3 | SOFA total: ${r.sofa_total}/24 | Severidad: ${r.sofa_severity} | Mortalidad: ${r.sofa_mortality_estimate}`)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center gap-1.5"><Copy size={12} /> Copiar</button>
                          <button onClick={() => setResult(null)} className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all">Limpiar</button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  );
                }

                // ── NEWS2 ──
                if (calcId === 'news2') {
                  const riskClass = r.clinical_risk_level === 'high' ? severityColor('ALTA') : r.clinical_risk_level === 'medium' ? severityColor('MODERADA') : severityColor('BAJA');
                  return (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 200 }} className="mt-4">
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
                    </AnimatePresence>
                  );
                }

                // ── NIHSS ──
                if (calcId === 'nihss') {
                  const severityClass = severityColor(r.nihss_severity || '');
                  return (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 200 }} className="mt-4">
                        <div className={`rounded-xl border ${severityClass.border} ${severityClass.bg} overflow-hidden`}>
                          <div className="p-5">
                            <div className="flex items-baseline gap-3 mb-4">
                              <span className="text-3xl font-bold ren-text-primary tabular-nums">{r.nihss_total}/42</span>
                              <span className={`text-sm font-mono px-2.5 py-0.5 rounded-full ${severityClass.bg} ${severityClass.text} border ${severityClass.border}`}>
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
                    </AnimatePresence>
                  );
                }

                // Fallback genérico — muestra todo lo que devuelva
                return null;
              })()}

              {/* Espaciador inferior */}
              <div className="h-6" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
