'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Droplets, FlaskConical, Heart, Activity, Brain, Filter, Thermometer, Zap, HeartPulse, Copy, AlertCircle, BarChart3, FileText } from 'lucide-react';

/* ─── Types ─── */
type GCSComponent = { key: string; label: string; range: [number, number]; labels: string[] };
type Comorbidity = { key: string; label: string };

interface ApacheIVResult {
  aps: number;
  ageScore: number;
  chronicScore: number;
  totalScore: number;
  mortalityPct: number;
  losDays: number;
  severity: string;
  gcsNaUsed: boolean;
  gcsTotal: number;
  diagnosisLabel: string;
}

interface DiagnosisOption {
  value: string;
  label: string;
  groupDependency?: string;
  systemDependency?: string;
}

interface SchemaResponse {
  variables: Array<{
    key: string;
    label: string;
    type: string;
    unit?: string;
    min?: number;
    max?: number;
    options?: Array<{ value: string; label: string; groupDependency?: string; systemDependency?: string }>;
  }>;
}

/* ─── Constants ─── */
const GCS_COMPONENTS: GCSComponent[] = [
  { key: 'gcsEye',   label: 'Ocular',  range: [1, 4], labels: ['No abre', 'Al dolor', 'Al llamado', 'Espontánea'] },
  { key: 'gcsVerbal', label: 'Verbal', range: [1, 5], labels: ['Sin sonidos', 'Incomprensible', 'Inapropiado', 'Confuso', 'Orientado'] },
  { key: 'gcsMotor', label: 'Motor',   range: [1, 6], labels: ['No respuesta', 'Extensión', 'Flexión', 'Retirada', 'Localiza', 'Obedece'] },
];

const COMORBIDITIES: Comorbidity[] = [
  { key: 'aids',               label: 'SIDA' },
  { key: 'hepaticFailure',    label: 'Falla hepática' },
  { key: 'lymphoma',          label: 'Linfoma' },
  { key: 'metastaticCancer',  label: 'Cáncer metastásico' },
  { key: 'leukemia',          label: 'Leucemia' },
  { key: 'immunosuppression', label: 'Inmunosupresión' },
  { key: 'cirrhosis',         label: 'Cirrosis' },
];

const ADMISSION_SOURCES = [
  { value: 'other',         label: 'Otro' },
  { value: 'floor',         label: 'Piso hospitalización' },
  { value: 'operating_room', label: 'Quirófano / Recuperación' },
  { value: 'other_hospital', label: 'Otro hospital' },
];

const DIAGNOSIS_GROUPS = [
  { value: 'medical',  label: 'Médico (no quirúrgico)' },
  { value: 'surgical', label: 'Quirúrgico (postoperatorio)' },
];

/* ── SOFA-style GCS pill colors (exact same 5 colors as sofaBtnStyle in sofa-calculator.tsx) ── */
const GCS_SOFA_COLORS = [
  'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-xs shadow-emerald-500/5',
  'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-xs shadow-amber-500/5',
  'bg-orange-500/25 border-orange-500/45 text-orange-400 shadow-sm shadow-orange-500/8',
  'bg-pink-400/25 border-pink-400/50 text-pink-300 shadow-sm shadow-pink-400/10',
  'bg-red-600/35 border-red-600/60 text-red-300 shadow-md shadow-red-600/20',
];

const GCS_GRID_CLASSES: Record<string, string> = {
  gcsEye: 'grid grid-cols-4 gap-1.5',
  gcsVerbal: 'grid grid-cols-3 sm:grid-cols-5 gap-1.5',
  gcsMotor: 'grid grid-cols-3 sm:grid-cols-6 gap-1.5',
};

function gcsToSofaLevel(key: string, score: number): number {
  switch (key) {
    case 'gcsEye':   return score >= 4 ? 0 : score >= 3 ? 1 : score >= 2 ? 2 : 4;
    case 'gcsVerbal': return score >= 5 ? 0 : score >= 4 ? 1 : score >= 3 ? 2 : score >= 2 ? 3 : 4;
    case 'gcsMotor': return score >= 6 ? 0 : score >= 5 ? 1 : score >= 4 ? 2 : score >= 3 ? 3 : 4;
    default:         return 0;
  }
}

function gcsSofaStyle(key: string, score: number, active: boolean): string {
  if (!active) return 'bg-[var(--ren-bg-secondary)] ren-text-secondary border-[var(--ren-border)] opacity-75 hover:border-[var(--accent-color)]/70 hover:bg-[var(--ren-bg-secondary)]/80';
  return GCS_SOFA_COLORS[gcsToSofaLevel(key, score)];
}

function gcsTotalSeverityClass(total: number, na: boolean): string {
  if (na) return 'var(--text-dim)';
  if (total === 15) return '#34D399';     // verde — normal
  if (total >= 13) return '#FBBF24';      // amarillo — leve
  if (total >= 9)  return '#FB923C';       // naranja — moderado
  if (total >= 6)  return '#FB7185';       // rosa — severo
  return '#F87171';                         // rojo — crítico
}

function severityColor(s: string) {
  const sl = s?.toLowerCase() || '';
  if (sl.includes('baja')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', bar: 'bg-emerald-500' };
  if (sl.includes('moderada')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25', bar: 'bg-amber-500' };
  if (sl.includes('alta')) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', bar: 'bg-orange-500' };
  return { bg: 'bg-grey-500/10', text: 'text-grey-400', border: 'border-grey-500/25', bar: 'bg-grey-500' };
}

function systemSeverityPill(pts: number) {
  if (pts <= 3)  return { dot: 'bg-emerald-500', ring: 'border-emerald-500/30 text-emerald-400' };
  if (pts <= 7)  return { dot: 'bg-teal-500', ring: 'border-teal-500/30 text-teal-400' };
  if (pts <= 12) return { dot: 'bg-amber-500', ring: 'border-amber-500/30 text-amber-400' };
  if (pts <= 18) return { dot: 'bg-orange-500', ring: 'border-orange-500/30 text-orange-400' };
  return { dot: 'bg-red-500', ring: 'border-red-500/30 text-red-400' };
}

/* ─── Breakdown display helpers ─── */
const BREAKDOWN_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  temp:        { label: 'Temp', icon: <Thermometer size={10} /> },
  map:         { label: 'PAM', icon: <Activity size={10} /> },
  hr:          { label: 'FC', icon: <HeartPulse size={10} /> },
  rr:          { label: 'FR', icon: <Wind size={10} /> },
  oxygenation: { label: 'Oxig', icon: <Droplets size={10} /> },
  ph:          { label: 'pH', icon: <FlaskConical size={10} /> },
  na:          { label: 'Na', icon: <FlaskConical size={10} /> },
  cr:          { label: 'Cr', icon: <Filter size={10} /> },
  hto:         { label: 'Hto', icon: <Droplets size={10} /> },
  wbc:         { label: 'GB', icon: <Activity size={10} /> },
  alb:         { label: 'Alb', icon: <FlaskConical size={10} /> },
  bili:        { label: 'Bili', icon: <FlaskConical size={10} /> },
  gluc:        { label: 'Gluc', icon: <Zap size={10} /> },
  bun:         { label: 'BUN', icon: <Filter size={10} /> },
  urine:       { label: 'Diur', icon: <Filter size={10} /> },
  gcs:         { label: 'GCS', icon: <Brain size={10} /> },
};

const SYSTEM_GROUP: Record<string, { icon: React.ReactNode; label: string; keys: string[] }> = {
  resp:  { label: 'Resp', icon: <Wind size={10} />, keys: ['rr', 'oxygenation'] },
  cv:    { label: 'CV', icon: <HeartPulse size={10} />, keys: ['hr', 'map'] },
  renal: { label: 'Renal', icon: <Filter size={10} />, keys: ['cr', 'bun', 'urine'] },
  hepatic: { label: 'Hepático', icon: <FlaskConical size={10} />, keys: ['bili', 'alb'] },
  heme:  { label: 'Heme', icon: <Droplets size={10} />, keys: ['hto', 'wbc'] },
  neuro: { label: 'Neuro', icon: <Brain size={10} />, keys: ['gcs'] },
  metab: { label: 'Metab', icon: <Zap size={10} />, keys: ['gluc', 'na', 'ph'] },
};

/* ─── The Component ─── */
export default function ApacheIVCalculator() {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [gcs, setGcs] = useState<Record<string, number>>({ gcsEye: 4, gcsVerbal: 5, gcsMotor: 6 });
  const [gcsNa, setGcsNa] = useState(false);
  const [age, setAge] = useState<string>('');
  // Numeric fields
  const DEFAULTS: Record<string, string> = {
    temp: '37', map: '70', hr: '80', rr: '15',
    pao2: '90', paco2: '40', ph: '7.4',
    na: '140', cr: '1', bun: '14',
    hto: '40', wbc: '10',
    alb: '4.0', bili: '1', gluc: '100',
  };
  const [numFields, setNumFields] = useState<Record<string, string>>(DEFAULTS);
  const resetFields = useCallback(() => setNumFields({ ...DEFAULTS }), []);
  // Comorbidities
  const [comorbidities, setComorbidities] = useState<Record<string, boolean>>({});
  // Toggles
  const [ventilated, setVentilated] = useState(false);
  const [emergencySurgery, setEmergencySurgery] = useState(false);
  const [readmission, setReadmission] = useState(false);
  const [thrombolysis, setThrombolysis] = useState(false);
  const [erc, setErc] = useState(false);
  // Admission
  const [admissionSource, setAdmissionSource] = useState('other');
  const [diagnosisGroup, setDiagnosisGroup] = useState('medical');
  const [diagnosisSystem, setDiagnosisSystem] = useState('');
  const [diagnosisKey, setDiagnosisKey] = useState('');
  // Result
  const [result, setResult] = useState<ApacheIVResult & { breakdown?: Record<string, number> } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<Record<string, boolean>>({});

  const diagnosisOptions = (schema?.variables?.find(v => v.key === 'diagnosisKey')?.options as DiagnosisOption[]) || [];
  const systemOptions = (schema?.variables?.find(v => v.key === 'diagnosisSystem')?.options as DiagnosisOption[]) || [];

  const filteredSystems = systemOptions.filter(s => s.groupDependency === diagnosisGroup);
  const filteredDiagnoses = diagnosisOptions.filter(d =>
    d.groupDependency === diagnosisGroup &&
    d.systemDependency === diagnosisSystem
  );

  useEffect(() => {
    fetch('/api/calculator/apache-iv/schema')
      .then(r => r.json())
      .then(d => {
        if (d.schema) setSchema(d.schema as SchemaResponse);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateNum = useCallback((key: string, val: string) => {
    setNumFields(prev => ({ ...prev, [key]: val }));
    setMissingFields(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const toggleComorbidity = useCallback((key: string) => {
    setComorbidities(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectGcs = useCallback((key: string, val: number) => {
    if (!gcsNa) setGcs(prev => ({ ...prev, [key]: val }));
  }, [gcsNa]);

  const gcsTotal = gcsNa ? 0 : (gcs.gcsEye || 4) + (gcs.gcsVerbal || 5) + (gcs.gcsMotor || 6);

  const showThrombolysis = diagnosisKey && (diagnosisKey === 'stroke' || diagnosisKey.startsWith('ami_'));

  const handleCalculate = async () => {
    const missing: Record<string, boolean> = {};
    if (!age) missing.age = true;
    if (!numFields.fio2) missing.fio2 = true;
    if (!numFields.urine24h) missing.urine24h = true;
    if (!numFields.preICULos) missing.preICULos = true;
    if (!diagnosisSystem) missing.diagnosisSystem = true;
    if (!diagnosisKey) missing.diagnosisKey = true;

    if (Object.keys(missing).length > 0) {
      setMissingFields(missing);
      const fieldNames: Record<string, string> = {
        age: 'Edad',
        fio2: 'FiO₂',
        urine24h: 'Diuresis 24h',
        preICULos: 'Estancia pre-UCI',
        diagnosisSystem: 'Sistema diagnóstico',
        diagnosisKey: 'Diagnóstico específico',
      };
      const list = Object.keys(missing).map(k => fieldNames[k] || k).join(', ');
      setError(`Campos requeridos faltantes: ${list}`);
      return;
    }

    setMissingFields({});

    setCalculating(true);
    setError(null);

    const payload: Record<string, any> = {
      age: Number(age),
      gcsEye: gcs.gcsEye,
      gcsVerbal: gcs.gcsVerbal,
      gcsMotor: gcs.gcsMotor,
      gcsNotAvailable: gcsNa,
      temp: numFields.temp ? Number(numFields.temp) : null,
      map: numFields.map ? Number(numFields.map) : null,
      hr: numFields.hr ? Number(numFields.hr) : null,
      rr: numFields.rr ? Number(numFields.rr) : null,
      fio2: numFields.fio2 ? Number(numFields.fio2) : null,
      pao2: numFields.pao2 ? Number(numFields.pao2) : null,
      paco2: numFields.paco2 ? Number(numFields.paco2) : null,
      ph: numFields.ph ? Number(numFields.ph) : null,
      na: numFields.na ? Number(numFields.na) : null,
      cr: numFields.cr ? Number(numFields.cr) : null,
      erc: erc,
      hto: numFields.hto ? Number(numFields.hto) : null,
      wbc: numFields.wbc ? Number(numFields.wbc) : null,
      alb: numFields.alb ? Number(numFields.alb) : null,
      bili: numFields.bili ? Number(numFields.bili) : null,
      gluc: numFields.gluc ? Number(numFields.gluc) : null,
      bun: numFields.bun ? Number(numFields.bun) : null,
      urine24h: numFields.urine24h ? Number(numFields.urine24h) : null,
      preICULos: numFields.preICULos ? Number(numFields.preICULos) : 0,
      admissionSource,
      admissionType: diagnosisGroup,
      diagnosisGroup,
      diagnosisSystem: diagnosisSystem || null,
      diagnosisKey: diagnosisKey || null,
      ventilated,
      emergencySurgery,
      readmission,
      thrombolysis,
      conditions: comorbidities,
    };

    try {
      const res = await fetch('/api/calculator/apache-iv/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    setCalculating(false);
  };

  const copyResult = () => {
    if (!result) return;
    const text = `APACHE IV | Score: ${result.totalScore} | APS: ${result.aps} | Mortalidad: ${result.mortalityPct}% | Severidad: ${result.severity} | LOS: ${result.losDays}d | ${result.diagnosisLabel}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-5 py-4">
        <div className="h-4 bg-[var(--ren-bg-tertiary)] rounded w-1/4 mb-4" />
        <div className="h-10 bg-[var(--ren-bg-tertiary)] rounded-lg w-1/3" />
        <div className="h-16 bg-[var(--ren-bg-tertiary)] rounded-lg" />
        <div className="h-8 bg-[var(--ren-bg-tertiary)] rounded-lg w-1/2" />
        <div className="h-24 bg-[var(--ren-bg-tertiary)] rounded-lg" />
        <div className="h-16 bg-[var(--ren-bg-tertiary)] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 apache-iv-root">

      {/* ─── DATOS DEL PACIENTE ─── */}
      <Section title="Datos del paciente">
        <div className={`field${missingFields.age ? ' field-missing' : ''}`} style={{ maxWidth: 200 }}>
          <FieldLabel>Edad <Sub>años</Sub></FieldLabel>
          <input
            type="number"
            value={age}
            onChange={e => {
              setAge(e.target.value);
              if (e.target.value) setMissingFields(prev => { const n = {...prev}; delete n.age; return n; });
            }}
            placeholder="0"
            className={`num-input${missingFields.age ? ' input-missing' : ''}`}
            min={16}
            max={120}
          />
        </div>

        <div className="border-t border-[var(--ren-border)] my-4" />

        <FieldLabel style={{ marginBottom: 8 }}>Glasgow <Sub>— toca cada componente</Sub></FieldLabel>

        {GCS_COMPONENTS.map(comp => {
          const val = gcs[comp.key] || comp.range[0];
          return (
            <div key={comp.key} className="row" style={{ marginBottom: 8 }}>
              <div className="field">
                <FieldLabel>{comp.label} <Sub>({comp.range[0]}–{comp.range[1]})</Sub></FieldLabel>
                <div className={GCS_GRID_CLASSES[comp.key]}>
                  {Array.from({ length: comp.range[1] - comp.range[0] + 1 }, (_, i) => {
                    const score = comp.range[0] + i;
                    const selected = val === score;
                    return (
                      <button
                        key={score}
                        onClick={() => selectGcs(comp.key, score)}
                        className={`relative py-2.5 rounded-lg text-xs font-semibold transition-all border ${gcsSofaStyle(comp.key, score, selected)}`}
                        disabled={gcsNa}
                      >
                        {score} {comp.labels[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 12, color: 'var(--text-dim)', paddingTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            GCS total: <strong style={{ color: gcsTotalSeverityClass(gcsTotal, gcsNa) }}>
              {gcsNa ? '—' : gcsTotal}
            </strong> / 15
          </span>
          <span
            className={`ne-toggle${gcsNa ? ' active' : ''}`}
            onClick={() => {
              setGcsNa(!gcsNa);
              if (!gcsNa) {
                setGcs({ gcsEye: 1, gcsVerbal: 1, gcsMotor: 1 });
              } else {
                setGcs({ gcsEye: 4, gcsVerbal: 5, gcsMotor: 6 });
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGcsNa(!gcsNa); } }}
          >
            <span className="ne-toggle-label">GCS no evaluable (sedación/parálisis)</span>
            <span className="ne-toggle-track"><span className="ne-toggle-thumb" /></span>
          </span>
        </div>
      </Section>

      {/* ─── COMORBILIDADES ─── */}
      <Section title="Comorbilidades">
        <div className="pills">
          {COMORBIDITIES.map(c => (
            <span
              key={c.key}
              className={`pill${comorbidities[c.key] ? ' active' : ' inactive'}`}
              onClick={() => toggleComorbidity(c.key)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleComorbidity(c.key); } }}
            >
              <span className="indicator" />
              {c.label}
            </span>
          ))}
        </div>
      </Section>

      {/* ─── ADMISIÓN ─── */}
      <Section title="Admisión">
        <div className="row">
          <div className="field">
            <FieldLabel>Origen del ingreso</FieldLabel>
            <select
              className="select-input"
              value={admissionSource}
              onChange={e => setAdmissionSource(e.target.value)}
            >
              {ADMISSION_SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <FieldLabel>Tipo de admisión</FieldLabel>
            <select
              className="select-input"
              value={diagnosisGroup}
              onChange={e => { setDiagnosisGroup(e.target.value); setDiagnosisSystem(''); setDiagnosisKey(''); }}
            >
              {DIAGNOSIS_GROUPS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <NumField label="Estancia pre-UCI" unit="días" key_="preICULos" value={numFields.preICULos || ''} onChange={v => updateNum('preICULos', v)} missing={missingFields.preICULos} />
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
            <ToggleField label="Reingreso UCI" value={readmission} onChange={setReadmission} color="var(--amber, #f59e0b)" />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <ToggleField label="Cirugía de emergencia" value={emergencySurgery} onChange={setEmergencySurgery} color="var(--red, #ef4444)"/>
        </div>
      </Section>

      {/* ─── DIAGNÓSTICO DE INGRESO ─── */}
      <Section title="Diagnóstico de ingreso">
        <div className="row">
          <div className={`field${missingFields.diagnosisSystem ? ' field-missing' : ''}`}>
            <FieldLabel>Sistema</FieldLabel>
            <select
              className={`select-input${missingFields.diagnosisSystem ? ' input-missing' : ''}`}
              value={diagnosisSystem}
              onChange={e => { setDiagnosisSystem(e.target.value); setDiagnosisKey(''); setMissingFields(prev => { const n = {...prev}; delete n.diagnosisSystem; return n; }); }}
              disabled={!diagnosisGroup}
            >
              <option value="">— Seleccione —</option>
              {filteredSystems.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className={`field${missingFields.diagnosisKey ? ' field-missing' : ''}`}>
            <FieldLabel>Diagnóstico específico</FieldLabel>
            <select
              className={`select-input${missingFields.diagnosisKey ? ' input-missing' : ''}`}
              value={diagnosisKey}
              onChange={e => { setDiagnosisKey(e.target.value); setMissingFields(prev => { const n = {...prev}; delete n.diagnosisKey; return n; }); }}
              disabled={!diagnosisSystem}
            >
              <option value="">— Seleccione —</option>
              {filteredDiagnoses.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        {showThrombolysis && (
          <div className="row" style={{ marginTop: 8 }}>
            <ToggleField label="Trombólisis" value={thrombolysis} onChange={setThrombolysis} color="var(--purple, #a855f7)" />
          </div>
        )}
      </Section>

      {/* ─── FISIOLOGÍA & LABORATORIOS ─── */}
      <Section title="Fisiología & laboratorios">

        {/* Signos vitales - T primero */}
        <div className="section-subtitle">
          <Activity size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--teal, #33ccbb)' }} />
          Signos vitales
        </div>
        <div className="row">
          <NumField label="Temperatura" unit="°C" key_="temp" value={numFields.temp || ''} onChange={v => updateNum('temp', v)} step="0.1" />
          <NumField label="PAM" unit="mmHg" key_="map" value={numFields.map || ''} onChange={v => updateNum('map', v)} />
          <NumField label="Frecuencia cardíaca" unit="/min" key_="hr" value={numFields.hr || ''} onChange={v => updateNum('hr', v)} />
          <NumField label="Frecuencia respiratoria" unit="/min" key_="rr" value={numFields.rr || ''} onChange={v => updateNum('rr', v)} />
        </div>

        {/* Oxigenación / Gasometría */}
        <div className="section-subtitle">
          <Wind size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--teal, #33ccbb)' }} />
          Oxigenación / Gasometría
        </div>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
            <ToggleField label="Ventilación mecánica" value={ventilated} onChange={setVentilated} color="var(--teal, #14b8a6)" />
          </div>
        </div>
        <div className="row">
          <NumField label="FiO₂" unit="%" key_="fio2" value={numFields.fio2 || ''} onChange={v => updateNum('fio2', v)} placeholder="21 (AA)" missing={missingFields.fio2} />
          <NumField label="PaO₂" unit="mmHg" key_="pao2" value={numFields.pao2 || ''} onChange={v => updateNum('pao2', v)} />
          <NumField label="PaCO₂" unit="mmHg" key_="paco2" value={numFields.paco2 || ''} onChange={v => updateNum('paco2', v)} />
          <NumField label="pH arterial" key_="ph" value={numFields.ph || ''} onChange={v => updateNum('ph', v)} step="0.001" />
        </div>

        {/* Función renal */}
        <div className="section-subtitle">
          <Filter size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Función renal
        </div>
        <div className="row">
          <ToggleField label="ERC estadio V / Hemodiálisis" value={erc} onChange={setErc} color="var(--orange, #f97316)" />
        </div>
        <div className="row">
          <NumField label="Na⁺" unit="mEq/L" key_="na" value={numFields.na || ''} onChange={v => updateNum('na', v)} />
          <NumField label="Cr" unit="mg/dL" key_="cr" value={numFields.cr || ''} onChange={v => updateNum('cr', v)} />
        </div>
        <div className="row">
          <NumField label="BUN" unit="mg/dL" key_="bun" value={numFields.bun || ''} onChange={v => updateNum('bun', v)} />
          <NumField label="Diuresis 24h" unit="mL" key_="urine24h" value={numFields.urine24h || ''} onChange={v => updateNum('urine24h', v)} missing={missingFields.urine24h} />
        </div>

        {/* Hematología */}
        <div className="section-subtitle">
          <Droplets size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Hematología
        </div>
        <div className="row">
          <NumField label="Hto" unit="%" key_="hto" value={numFields.hto || ''} onChange={v => updateNum('hto', v)} />
          <NumField label="Leucocitos" unit="×10³/mm³" key_="wbc" value={numFields.wbc || ''} onChange={v => updateNum('wbc', v)} />
        </div>

        {/* Química hepática */}
        <div className="section-subtitle">
          <FlaskConical size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Química hepática
        </div>
        <div className="row">
          <NumField label="Albumina" unit="g/dL" key_="alb" value={numFields.alb || ''} onChange={v => updateNum('alb', v)} />
          <NumField label="Glucosa" unit="mg/dL" key_="gluc" value={numFields.gluc || ''} onChange={v => updateNum('gluc', v)} />
          <NumField label="Bilirrubina" unit="mg/dL" key_="bili" value={numFields.bili || ''} onChange={v => updateNum('bili', v)} />
        </div>

      </Section>

      {/* ─── BOTÓN CALCULAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="calc-btn"
        >
          {calculating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" />
              Calculando...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={15} />
              Calcular APACHE IV
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="error-msg">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="space-y-3"
          >
            {(() => {
              const sevCol = severityColor(result.severity);
              return (
              <>
              {/* ─── GRID 2×2 — contenedor unificado ─── */}
              <div className="rounded-xl overflow-hidden backdrop-blur-sm border border-[var(--ren-border)]" style={{ background: 'var(--ren-bg-secondary)' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                }}>
                  {/* APACHE IV — top-left */}
                  <div className="relative border-b border-[var(--ren-border)]/50 border-r border-[var(--ren-border)]/50">
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 35%, rgba(250,204,21,0.10) 0%, rgba(250,204,21,0.03) 60%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />
                    <div className="relative z-1 text-center py-4 sm:py-5 px-2 sm:px-3">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <BarChart3 size={11} className="text-yellow-400/70" />
                        <span className="text-[8px] sm:text-[9px] font-semibold tracking-widest uppercase text-yellow-400">APACHE IV Score</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-[28px] sm:text-[40px] font-bold font-mono tabular-nums leading-none" style={{ color: '#FACC15' }}>{result.totalScore}</span>
                        <span className="text-[10px] sm:text-sm font-mono ren-text-tertiary">/286</span>
                      </div>
                      <div style={{ marginTop: 6, width: 24, height: 3, borderRadius: 999, background: '#FACC15', marginLeft: 'auto', marginRight: 'auto' }} />
                    </div>
                  </div>
                  {/* APS — top-right */}
                  <div className="relative border-b border-[var(--ren-border)]/50">
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 35%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.03) 60%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />
                    <div className="relative z-1 text-center py-4 sm:py-5 px-2 sm:px-3">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Heart size={11} className="text-emerald-400/70" />
                        <span className="text-[8px] sm:text-[9px] font-semibold tracking-widest uppercase text-emerald-400">APS Score</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-[28px] sm:text-[40px] font-bold font-mono tabular-nums leading-none" style={{ color: '#10B981' }}>{result.aps}</span>
                        <span className="text-[10px] sm:text-sm font-mono ren-text-tertiary">/239</span>
                      </div>
                      <div style={{ marginTop: 6, width: 24, height: 3, borderRadius: 999, background: '#10B981', marginLeft: 'auto', marginRight: 'auto' }} />
                    </div>
                  </div>
                  {/* Mortalidad — bottom-left */}
                  <div className="relative border-r border-[var(--ren-border)]/50">
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 35%, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.03) 60%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />
                    <div className="relative z-1 text-center py-4 sm:py-5 px-2 sm:px-3">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <HeartPulse size={11} className="text-red-400/70" />
                        <span className="text-[8px] sm:text-[9px] font-semibold tracking-widest uppercase text-red-400">Mortalidad</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-[28px] sm:text-[40px] font-bold font-mono tabular-nums leading-none" style={{ color: '#EF4444' }}>{result.mortalityPct}</span>
                        <span className="text-[10px] sm:text-sm font-mono ren-text-tertiary">%</span>
                      </div>
                    </div>
                  </div>
                  {/* LOS — bottom-right */}
                  <div className="relative">
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 50% 35%, rgba(139,92,246,0.10) 0%, rgba(139,92,246,0.03) 60%, transparent 100%)',
                      pointerEvents: 'none',
                    }} />
                    <div className="relative z-1 text-center py-4 sm:py-5 px-2 sm:px-3">
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <Activity size={11} className="text-purple-400/70" />
                        <span className="text-[8px] sm:text-[9px] font-semibold tracking-widest uppercase text-purple-400">Estancia UCI</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-[28px] sm:text-[40px] font-bold font-mono tabular-nums leading-none" style={{ color: '#8B5CF6' }}>{result.losDays}</span>
                        <span className="text-[10px] sm:text-sm font-mono ren-text-tertiary">días</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Severidad + Diagnóstico ─── */}
              <div className="rounded-xl border border-[var(--ren-border)] backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3" style={{ background: 'var(--ren-bg-secondary)', padding: '12px 16px' }}>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <span className="text-[9px] font-semibold tracking-widest uppercase ren-text-tertiary flex-shrink-0">Severidad</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm border ${sevCol.bg} ${sevCol.border} ${sevCol.text}`}>
                    <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${sevCol.bar}`} />
                    {result.severity}
                    <span className="opacity-70">({result.mortalityPct}%)</span>
                  </span>
                </div>
                {result.diagnosisLabel && (
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-end">
                    <span className="text-[9px] font-semibold tracking-widest uppercase ren-text-tertiary flex-shrink-0">Diagnóstico</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm border border-[var(--ren-border)] max-w-full whitespace-nowrap" style={{ background: 'var(--ren-bg-tertiary)', color: 'var(--text-primary)' }}>
                      <FileText size={11} className="ren-text-tertiary flex-shrink-0" />
                      <span className="truncate min-w-0">{result.diagnosisLabel}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* ─── System pills ─── */}
              {result.breakdown && (
                <div className="rounded-xl border border-[var(--ren-border)] backdrop-blur-sm" style={{ background: 'var(--ren-bg-secondary)', padding: '12px 16px' }}>
                  <div className="text-[9px] font-semibold tracking-widest uppercase ren-text-secondary mb-2.5">Score APS por sistema</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SYSTEM_GROUP).map(([sysKey, sys]) => {
                      const pts = sys.keys.reduce((sum, k) => sum + ((result.breakdown?.[k] as number) || 0), 0);
                      const col = systemSeverityPill(pts);
                      return (
                        <span key={sysKey} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border backdrop-blur-sm ${col.ring}`}>
                          <span className={`w-[5px] h-[5px] rounded-full ${col.dot}`} />
                          {sys.label} <span className="font-bold">{pts}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Botones ─── */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={handleCalculate} className="w-full sm:flex-1 py-2.5 rounded-lg text-[11px] font-semibold ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <Zap size={12} /> Recalcular
                </button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={copyResult} className="flex-1 sm:flex-none py-2.5 px-4 rounded-lg text-[11px] font-semibold ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Copy size={12} /> Copiar
                  </button>
                  <button onClick={() => setResult(null)} className="flex-1 sm:flex-none py-2.5 px-4 rounded-lg text-[11px] font-semibold ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Zap size={12} /> Limpiar
                  </button>
                </div>
              </div>
              </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Subcomponents ─── */

function sectionIcon(title: string): React.ReactNode {
  const s = 12;
  if (title.includes('paciente')) return <Brain size={s} />;
  if (title.includes('Comorbilidad')) return <Activity size={s} />;
  if (title.includes('Admisión')) return <FileText size={s} />;
  if (title.includes('Diagnóstico')) return <Filter size={s} />;
  if (title.includes('Fisiología')) return <FlaskConical size={s} />;
  return null;
}

function Section({ title, children, style }: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="section" style={style}>
      <div className="section-title">
        {sectionIcon(title)}
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="field-label" style={style}>
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <span className="sub">{children}</span>;
}

function NumField({ label, unit, key_, value, onChange, step, placeholder, missing }: {
  label: string; unit?: string; key_: string; value: string; onChange: (v: string) => void; step?: string; placeholder?: string; missing?: boolean;
}) {
  return (
    <div className={`field${missing ? ' field-missing' : ''}`}>
      <FieldLabel>
        {label}
        {unit && <Sub>{unit}</Sub>}
      </FieldLabel>
      <input
        type="number"
        className={`num-input${missing ? ' input-missing' : ''}`}
        placeholder={placeholder || '0'}
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step || '1'}
      />
    </div>
  );
}

function ToggleField({ label, value, onChange, color }: {
  label: string; value: boolean; onChange: (v: boolean) => void; color: string;
}) {
  return (
    <span
      className={`toggle-field${value ? ' active' : ''}`}
      onClick={() => onChange(!value)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!value); } }}
      style={{ '--toggle-color': color } as React.CSSProperties}
    >
      <span className={`toggle-track${value ? ' active' : ''}`}>
        <span className={`toggle-thumb${value ? ' active' : ''}`} />
      </span>
      {label}
    </span>
  );
}

