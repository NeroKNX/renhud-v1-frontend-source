'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Beaker, ChevronDown, ChevronRight, Calculator, AlertCircle, Info, FlaskConical, Heart, Droplets, Thermometer, Wind, Syringe, Pill, Zap, BarChart3, Globe, FileText, Brain, Copy, BookOpen, AlertTriangle, Search, Sun, Moon } from 'lucide-react';
import { ApacheIVIcon, SofaIcon } from './icons';
import { CrowIcon } from '@/components/ui/crow-icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import SofaCalculator from '@/components/calculators/sofa-calculator';
import News2Calculator from '@/components/calculators/news2-calculator';
import NihssCalculator from '@/components/calculators/nihss-calculator';
import ApacheIVCalculator from '@/components/calculators/apache-iv-calculator';

function calcIcon(id: string) {
  switch (id) {
    case 'apache-iv': return <ApacheIVIcon size={32} />;
    case 'sofa': return <SofaIcon size={22} />;
    case 'news2': return <AlertTriangle className="w-5 h-5" />;
    case 'nihss': return <Brain className="w-5 h-5" />;
    default: return <Calculator className="w-6 h-6" />;
  }
}

// ── Fichas técnicas de cada calculadora ──
const fichasTecnicas: Record<string, {
  proposito: string;
  origen: string;
  interpretacion: { rango: string; significado: string }[];
  ventanaTerapeutica?: string[];
  limitaciones: string[];
  comoEvaluar?: { item: string; detalle: string; puntuacion: string }[];
  qsofa?: {
    proposito: string;
    origen: string;
    interpretacion: { rango: string; significado: string }[];
    limitaciones: string[];
  };
  referenciaRapida?: {
    pesos: { variable: string; pts: string }[];
    rangosCero: { variable: string; rango: string }[];
  };
}> = {
  'apache-iv': {
    proposito: 'Predecir mortalidad hospitalaria y estancia esperada en UCI a partir de los peores valores fisiológicos de las primeras 24 horas de ingreso. Permite además comparar el desempeño de una unidad evaluando mortalidad predicha vs. mortalidad observada.',
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
      'Validado en población norteamericana — puede sobreestimar mortalidad en contextos latinoamericanos.',
      'No predice calidad de vida ni funcionalidad post-UCI.',
      'No debe usarse como criterio único para limitar el esfuerzo terapéutico.',
    ],
    referenciaRapida: {
      pesos: [
        { variable: 'Glasgow', pts: 'hasta 48 pts si GCS 3' },
        { variable: 'PAM', pts: 'hasta 20 pts en hipotensión severa' },
        { variable: 'Frecuencia respiratoria', pts: 'hasta 17 pts en extremos' },
        { variable: 'PaO₂/FiO₂', pts: 'hasta 15 pts si < 100' },
        { variable: 'pH arterial', pts: 'hasta 12 pts fuera de rango' },
        { variable: 'Creatinina + diuresis', pts: 'hasta 10 pts combinados' },
      ],
      rangosCero: [
        { variable: 'Temperatura', rango: '36 – 38.4 °C' },
        { variable: 'PAM', rango: '70 – 109 mmHg' },
        { variable: 'FC', rango: '60 – 99 /min' },
        { variable: 'FR', rango: '12 – 19 /min' },
        { variable: 'pH', rango: '7.33 – 7.49' },
        { variable: 'Na⁺', rango: '135 – 144 mEq/L' },
        { variable: 'Creatinina', rango: '0.5 – 1.4 mg/dL' },
        { variable: 'Hto', rango: '30 – 45%' },
        { variable: 'Leucocitos', rango: '3 – 14.9 ×10³/mm³' },
        { variable: 'Glucosa', rango: '60 – 179 mg/dL' },
        { variable: 'Albúmina', rango: '2.0 – 3.4 g/dL' },
        { variable: 'Bilirrubina', rango: '< 2.0 mg/dL' },
        { variable: 'Glasgow', rango: '15' },
        { variable: 'PaO₂ (sin VM)', rango: '> 70 mmHg' },
      ],
    },
  },
  'sofa': {
    proposito: 'Cuantificar el grado de disfunción orgánica evaluando 6 sistemas de forma independiente. Permite diagnosticar sepsis (aumento ≥2 puntos sobre basal en paciente con infección sospechada), monitorear tendencia clínica día a día y soportar decisiones de escalada o desescalada terapéutica.',
    origen: 'Desarrollado por Vincent et al. (1996) en la European Society of Intensive Care Medicine como herramienta de descripción de disfunción orgánica secuencial. Adoptado por Sepsis-3 (2016) como criterio diagnóstico de sepsis.\n\nVincent JL et al. Intensive Care Med. 1996;22:707–710.\nSinger M et al. JAMA. 2016;315(8):801–810.',
    interpretacion: [
      { rango: '0–6 puntos', significado: 'Disfunción leve. Mortalidad ~1–5%.' },
      { rango: '7–9 puntos', significado: 'Disfunción moderada. Mortalidad ~15–20%.' },
      { rango: '10–12 puntos', significado: 'Disfunción severa. Mortalidad ~40–50%.' },
      { rango: '> 12 puntos', significado: 'Falla multiorgánica. Mortalidad > 50–80%.' },
    ],
    limitaciones: [
      'Cardiovascular: la puntuación depende del esquema local de vasopresores. Un mismo paciente puede puntuar distinto según protocolo institucional.',
      'Basal desconocida: si no hay disfunción orgánica previa documentada, asumir SOFA basal = 0. Esto puede subestimar el delta si el paciente tenía disfunción crónica.',
      'Delta SOFA: el diagnóstico de sepsis por Sepsis-3 requiere aumento ≥2 puntos sobre basal. En el primer cálculo no hay basal, así que no se puede clasificar como sepsis solo con un SOFA de ingreso.',
      'SOFA-2 (ESICM, en validación) podría reemplazar al SOFA actual — los puntos de corte pueden cambiar.',
      'No fue diseñado para uso fuera de UCI.',
    ],
    qsofa: {
      proposito: 'Identificar pacientes fuera de UCI con sospecha de infección y riesgo elevado de deterioro clínico o muerte. Funciona como cribado rápido — no diagnostica sepsis, sino que indica cuándo escalar la evaluación con SOFA completo.',
      origen: 'Definido en Sepsis-3 (2016) como herramienta de cribado extrahospitalario y de sala general. No reemplaza al SOFA — lo precede.\n\nSinger M et al. JAMA. 2016;315(8):801–810.',
      interpretacion: [
        { rango: '0–1 puntos', significado: 'Bajo riesgo. No descarta infección ni sepsis. Continuar evaluación clínica habitual.' },
        { rango: '≥ 2 puntos', significado: 'Alto riesgo. Mortalidad intrahospitalaria > 10% en pacientes con infección sospechada. Evaluar con SOFA completo y considerar monitoreo estrecho o traslado a UCI.' },
      ],
      limitaciones: [
        'Baja sensibilidad: puede no detectar sepsis en fases tempranas o presentación atípica.',
        'No aplica en UCI — fue diseñado para entornos de baja vigilancia.',
        'Un qSOFA < 2 no descarta sepsis si hay alta sospecha clínica.',
        'No sustituye el juicio clínico ni los criterios SIRS en contextos donde aún se usan.',
        'Validación limitada en poblaciones latinoamericanas e inmunosuprimidos.',
      ],
    },
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
    proposito: 'Detectar deterioro clínico temprano en sala general, urgencias y entornos prehospitalarios mediante 7 parámetros fisiológicos estandarizados. Define el umbral de respuesta clínica — desde monitoreo rutinario hasta activación de equipo de emergencia o traslado a UCI.',
    origen: 'Desarrollado por el Royal College of Physicians (RCP) del Reino Unido en 2017 como evolución del NEWS original (2012). Endosado por NHS England como estándar nacional de alerta temprana.\n\nRoyal College of Physicians. National Early Warning Score (NEWS) 2. RCP London, 2017.',
    interpretacion: [
      { rango: '0', significado: 'Sin riesgo. Monitoreo rutinario c/12h.' },
      { rango: '1–4', significado: 'Bajo riesgo. Evaluar c/4–6h. Notificar si empeora.' },
      { rango: '5–6 o cualquier componente = 3', significado: 'Riesgo medio. Evaluación médica urgente. Monitoreo c/1h.' },
      { rango: '≥ 7', significado: 'Riesgo alto. Evaluación de emergencia inmediata. Considerar UCI. Monitoreo continuo.' },
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
    proposito: 'Cuantificar la severidad del déficit neurológico en ACV agudo isquémico. Determina elegibilidad para trombólisis IV y trombectomía mecánica, y documenta evolución neurológica en seguimiento serial.',
    origen: 'Desarrollado por Brott et al. (1989) en el National Institute of Neurological Disorders and Stroke. Actualizado por NINDS en 2024 como estándar internacional para ensayos clínicos y práctica clínica en stroke agudo.\n\nBrott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke. 1989;20(7):864–870.',
    interpretacion: [
      { rango: '0', significado: 'Sin síntomas neurológicos.' },
      { rango: '1–4', significado: 'ACV menor. 80% alta a domicilio. Considerar trombólisis si hay déficit discapacitante.' },
      { rango: '5–15', significado: 'Moderado. Requiere rehabilitación intrahospitalaria. Candidato a trombólisis y trombectomía.' },
      { rango: '16–20', significado: 'Moderado-severo. Candidato prioritario a trombectomía si hay oclusión de gran vaso.' },
      { rango: '21–42', significado: 'Severo. Frecuentemente requiere cuidado institucional.' },
      { rango: '≥ 7', significado: 'Predictor de oclusión de gran vaso (sensibilidad 68–81%). Activar protocolo de trombectomía.' },
    ],
    ventanaTerapeutica: [
      'Trombólisis IV (alteplase/tenecteplase): hasta 4.5h desde inicio de síntomas. NIHSS ≥4 generalmente requerido.',
      'Trombectomía mecánica: hasta 24h en candidatos seleccionados con penumbra viable.',
    ],
    limitaciones: [
      'Sesgo hemisférico: subestima ACV derecho. A igual NIHSS, el volumen del infarto derecho es ~2× el izquierdo.',
      'No cuantifica bien déficits no motores (afasia, negligencia).',
      'Requiere examinador entrenado para máxima confiabilidad.',
      'Ítems UN (no testeable) no suman puntos pero deben documentarse.',
      'Anotar siempre lo que el paciente HACE, no lo que puede hacer.',
      'Administración: 5–8 minutos. Sin ayuda al paciente. Sin suposiciones.',
      'No predice pronóstico funcional de forma aislada — combinar con edad, basal funcional y volumen de infarto.',
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



function CalculatorThemeToggle() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('ren_preferences') || '{}');
      if (prefs.theme) setThemeState(prefs.theme);
    } catch {}
  }, []);

  const toggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    const mt = document.querySelector('meta[name="theme-color"]'); if(mt) mt.setAttribute('content', newTheme === 'dark' ? '#0B0E14' : '#F5F1E8');
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try {
      const prefs = JSON.parse(localStorage.getItem('ren_preferences') || '{}');
      prefs.theme = newTheme;
      localStorage.setItem('ren_preferences', JSON.stringify(prefs));
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl transition-all hover:bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/50"
      title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-[var(--ren-text-secondary)]" />
      ) : (
        <Moon size={18} className="text-[var(--ren-text-secondary)]" />
      )}
    </button>
  );
}

export default function CalculatorsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [calculators, setCalculators] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaTab, setFichaTab] = useState(0);

  // Lista estática de calculadoras — funciona sin backend
  const STATIC_CALCULATORS = [
    { id: 'apache-iv', name: 'APACHE IV', shortName: 'APACHE IV', description: 'Predicción de mortalidad y estancia en UCI a partir de los peores valores fisiológicos en las primeras 24h de ingreso.' },
    { id: 'sofa', name: 'SOFA', shortName: 'SOFA', description: 'Cuantificación de disfunción orgánica secuencial. Diagnóstico de sepsis (aumento ≥2 puntos sobre basal).' },
    { id: 'news2', name: 'NEWS 2', shortName: 'NEWS 2', description: 'Detección temprana de deterioro clínico en sala general, urgencias y entornos prehospitalarios.' },
    { id: 'nihss', name: 'NIHSS', shortName: 'NIHSS', description: 'Cuantificación de severidad neurológica en ACV isquémico agudo. Elegibilidad para trombólisis y trombectomía.' },
  ];

  // Cargar lista de calculadoras
  useEffect(() => {
    fetch('/api/calculators')
      .then(r => r.json())
      .then(d => setCalculators(d.calculators || []))
      .catch(() => setCalculators(STATIC_CALCULATORS));
  }, []);

  // Leer ?calc=xxx de la URL al montar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calc = params.get('calc');
    if (calc && ['sofa', 'news2', 'nihss', 'apache-iv'].includes(calc)) {
      setSelectedId(calc);
    }
  }, []);

  // Resetear ficha al cambiar de calculadora
  useEffect(() => {
    setFichaOpen(false);
    setFichaTab(0);
  }, [selectedId]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-6 h-14 border-b border-[var(--ren-border)] flex items-center justify-between ren-bg-header shrink-0" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <CrowIcon size="md" animate />
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm tracking-[0.2em] text-[var(--ren-text-primary)]">REN</span>
            <span className="text-[var(--ren-border)]">/</span>
            <span className="ren-spec-label">SCORES CLÍNICOS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">

          <CalculatorThemeToggle />
          <button
            onClick={() => {
              if (selectedId) {
                setSelectedId(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('calc');
                window.history.replaceState({}, '', url.toString());
              } else {
                window.history.replaceState({}, '', '/calculators');
                router.push('/');
              }
            }}
            className="p-2 hover:bg-[var(--ren-bg-tertiary)] border border-transparent hover:border-[var(--ren-border)] rounded-lg transition-colors"
            title={selectedId ? 'Volver al menú' : 'Ir al chat'}
          >
            <ArrowLeft size={18} className="text-[var(--ren-text-tertiary)] hover:text-[var(--ren-text-secondary)]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">


        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto ren-scrollbar">
          {!selectedId ? (
            /* Pantalla de bienvenida — tarjetas afiladas blueprint */
            <div className="flex items-center justify-center min-h-full p-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[680px]"
              >
                <div className="mb-8">
                  <p className="ren-spec-label mb-3">[ INSTRUMENTOS · UCI ]</p>
                  <h2 className="ren-display text-[clamp(32px,5vw,48px)] text-[var(--ren-text-primary)] mb-3">
                    Scores<br /><span className="thin">clínicos.</span>
                  </h2>
                  <p className="text-sm ren-text-secondary leading-relaxed max-w-[440px]">
                    Basados en evidencia. Resultados reproducibles, trazables y listos para documentar.
                  </p>
                </div>
                <div className="ren-rule mb-6" />
                <div className="grid grid-cols-1 gap-px bg-[var(--ren-border)] border border-[var(--ren-border)]">
                  {calculators.map((calc, i) => (
                    <motion.button
                      key={calc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => {
                        setSelectedId(calc.id);
                        const url = new URL(window.location.href);
                        url.searchParams.set('calc', calc.id);
                        window.history.replaceState({}, '', url.toString());
                      }}
                      className="group flex items-center gap-4 p-4 bg-[var(--ren-bg-primary)] hover:bg-[var(--accent-muted)] transition-all text-left relative"
                    >
                      <span className="font-mono text-[11px] text-[var(--accent-color)] opacity-70 shrink-0 w-6">{String(i + 1).padStart(2, '0')}</span>
                      <span className="w-[42px] h-[42px] rounded-[2px] bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] flex items-center justify-center text-[var(--ren-text-tertiary)] group-hover:text-[var(--accent-hover)] group-hover:border-[var(--accent-color)]/40 transition-all shrink-0">
                        {calcIcon(calc.id)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold ren-text-primary tracking-tight">{calc.shortName || calc.name}</p>
                        <p className="text-[11px] ren-text-tertiary mt-0.5 leading-relaxed">{calc.description}</p>
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
                  {/* Título y descripción */}
                  {(() => {
                    const calc = calculators.find(c => c.id === selectedId);
                    return (
                    <>
                    {/* ── Navegación rápida entre calculadoras — pills sutiles ── */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {['apache-iv', 'sofa', 'news2', 'nihss'].map((id) => {
                        const c = calculators.find(c => c.id === id);
                        const active = selectedId === id;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedId(id);
                              const url = new URL(window.location.href);
                              url.searchParams.set('calc', id);
                              window.history.replaceState({}, '', url.toString());
                            }}
                            className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-all ${
                              active
                                ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/40 text-[var(--accent-color)] font-semibold'
                                : 'bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] ren-text-secondary hover:text-[var(--accent-hover)] hover:border-[var(--accent-color)]/40'
                            }`}
                          >
                            {c?.shortName || c?.name || id}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mb-5">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-[2px] bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/40 flex items-center justify-center shrink-0">
                          {calcIcon(selectedId)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold ren-text-primary tracking-tight">{calc?.name || selectedId}</h2>
                          </div>
                          <p className="text-xs ren-text-secondary mt-0.5 leading-relaxed">{calc?.description}</p>
                          <div className="flex gap-4 mt-1.5">
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
                            ...(f.referenciaRapida ? [{ id: 'referencia-rapida', label: 'Referencia rápida', icon: Zap }] : []),
                            ...(f.comoEvaluar ? [{ id: 'como-evaluar', label: 'Cómo evaluar', icon: BookOpen }] : []),
                            ...(f.qsofa ? [{ id: 'qsofa', label: 'qSOFA', icon: Search }] : []),
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
                                      {f === fichasTecnicas.news2 && (
                                        <div className="mt-3 border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
                                          <p className="text-[11px] text-amber-300 leading-relaxed">
                                            <strong>Regla clave:</strong> Cualquier componente individual con puntuación 3 activa respuesta
                                            urgente independientemente del score total.
                                          </p>
                                        </div>
                                      )}
                                      {f.ventanaTerapeutica && (
                                        <div className="mt-3 border border-[var(--ren-border)] bg-[var(--ren-bg-tertiary)] rounded-lg p-3">
                                          <p className="text-[11px] font-semibold ren-text-primary mb-2">Ventana terapéutica</p>
                                          <ul className="space-y-1.5">
                                            {f.ventanaTerapeutica.map((v: string, i: number) => (
                                              <li key={i} className="text-[11px] ren-text-secondary leading-relaxed flex items-start gap-1.5">
                                                <span className="text-indigo-400 shrink-0 mt-px">▸</span>
                                                {v}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}

                                  {/* Tab: qSOFA */}
                                  {activeTabId === 'qsofa' && f.qsofa && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="mb-3">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-1">Propósito</p>
                                        <p className="text-xs ren-text-secondary leading-relaxed">{f.qsofa.proposito}</p>
                                      </div>
                                      <div className="mb-4">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-1">Origen</p>
                                        <p className="text-[11px] ren-text-tertiary italic leading-relaxed whitespace-pre-line">{f.qsofa.origen}</p>
                                      </div>
                                      <div className="mb-4">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-2">Interpretación</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {f.qsofa.interpretacion.map((i, idx) => (
                                            <div key={idx} className="border border-[var(--ren-border)] bg-[var(--ren-bg-tertiary)] rounded-lg p-3">
                                              <p className="text-xs font-mono font-semibold ren-text-primary mb-1">{i.rango}</p>
                                              <p className="text-[11px] ren-text-secondary leading-relaxed">{i.significado}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-2">Limitaciones</p>
                                        <ul className="space-y-2">
                                          {f.qsofa.limitaciones.map((l, idx) => (
                                            <li key={idx} className="text-[11px] ren-text-tertiary leading-relaxed flex items-start gap-2">
                                              <span className="w-1 h-1 rounded-full bg-[var(--accent-color)]/60 mt-1.5 shrink-0" />
                                              {l}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Tab: Referencia rápida */}
                                  {activeTabId === 'referencia-rapida' && f.referenciaRapida && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      {/* Variables de mayor peso */}
                                      <div className="mb-4">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-2">
                                          Variables de mayor peso en el APS
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          {f.referenciaRapida.pesos.map((p, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]"
                                            >
                                              <span className="text-[11px] ren-text-secondary">{p.variable}</span>
                                              <span className="text-[11px] font-mono font-semibold text-amber-400/90">{p.pts}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Rangos que suman 0 */}
                                      <div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-color)] mb-2">
                                          Rangos que suman 0 puntos (fisiología normal)
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          {f.referenciaRapida.rangosCero.map((r, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]"
                                            >
                                              <span className="text-[11px] ren-text-secondary">{r.variable}</span>
                                              <span className="text-[11px] font-mono text-emerald-400/80">{r.rango}</span>
                                            </div>
                                          ))}
                                        </div>
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
                  </>
                  );
                })()}



                  {selectedId === 'sofa' && <SofaCalculator />}
                  {selectedId === 'news2' && <News2Calculator />}
                  {selectedId === 'nihss' && <NihssCalculator />}
                  {selectedId === 'apache-iv' && <ApacheIVCalculator />}
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
