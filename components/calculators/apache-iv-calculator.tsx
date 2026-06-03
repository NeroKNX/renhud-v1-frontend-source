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
  gcsEye: 'grid grid-cols-2 sm:grid-cols-4 gap-1.5',
  gcsVerbal: 'grid grid-cols-3 gap-1.5',
  gcsMotor: 'grid grid-cols-3 gap-1.5',
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
  const [numFields, setNumFields] = useState<Record<string, string>>({});
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
    if (!age) { setError('Ingresa la edad'); return; }

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
        <div className="field" style={{ maxWidth: 200 }}>
          <FieldLabel>Edad <Sub>años</Sub></FieldLabel>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="0"
            className="num-input"
            min={16}
            max={120}
          />
        </div>

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
            GCS total: <strong style={{ color: gcsNa ? 'var(--text-dim)' : 'var(--green)' }}>
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
          <NumField label="Estancia pre-UCI" unit="días" key_="preICULos" value={numFields.preICULos || ''} onChange={v => updateNum('preICULos', v)} />
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
          <div className="field">
            <FieldLabel>Sistema</FieldLabel>
            <select
              className="select-input"
              value={diagnosisSystem}
              onChange={e => { setDiagnosisSystem(e.target.value); setDiagnosisKey(''); }}
              disabled={!diagnosisGroup}
            >
              <option value="">— Seleccione —</option>
              {filteredSystems.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <FieldLabel>Diagnóstico específico</FieldLabel>
            <select
              className="select-input"
              value={diagnosisKey}
              onChange={e => setDiagnosisKey(e.target.value)}
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

        {/* Signos vitales */}
        <div className="section-subtitle">Signos vitales</div>
        <div className="row">
          <NumField label="Frecuencia cardíaca" unit="/min" key_="hr" value={numFields.hr || ''} onChange={v => updateNum('hr', v)} />
          <NumField label="Frecuencia respiratoria" unit="/min" key_="rr" value={numFields.rr || ''} onChange={v => updateNum('rr', v)} />
          <NumField label="PAM" unit="mmHg" key_="map" value={numFields.map || ''} onChange={v => updateNum('map', v)} />
          <NumField label="Temperatura" unit="°C" key_="temp" value={numFields.temp || ''} onChange={v => updateNum('temp', v)} step="0.1" />
        </div>

        {/* Soporte ventilatorio + gases */}
        <div className="section-subtitle">
          <Wind size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--teal, #33ccbb)' }} />
          Soporte ventilatorio
        </div>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
            <ToggleField label="Ventilación mecánica" value={ventilated} onChange={setVentilated} color="var(--teal, #14b8a6)" />
          </div>
        </div>
        <div className="row">
          <NumField label="FiO₂" unit="%" key_="fio2" value={numFields.fio2 || ''} onChange={v => updateNum('fio2', v)} placeholder="21 (AA)" />
          <NumField label="PaO₂" unit="mmHg" key_="pao2" value={numFields.pao2 || ''} onChange={v => updateNum('pao2', v)} />
          <NumField label="PaCO₂" unit="mmHg" key_="paco2" value={numFields.paco2 || ''} onChange={v => updateNum('paco2', v)} />
          <NumField label="pH arterial" key_="ph" value={numFields.ph || ''} onChange={v => updateNum('ph', v)} step="0.001" />
        </div>

        {/* Electrolitos + Renal */}
        <div className="section-subtitle">
          <Filter size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Electrolitos y función renal
        </div>
        <div className="row">
          <NumField label="Na⁺" unit="mEq/L" key_="na" value={numFields.na || ''} onChange={v => updateNum('na', v)} />
          <NumField label="K⁺" unit="mEq/L" key_="k" value={numFields.k || ''} onChange={v => updateNum('k', v)} />
          <NumField label="Cr" unit="mg/dL" key_="cr" value={numFields.cr || ''} onChange={v => updateNum('cr', v)} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <ToggleField label="ERC estadio V / Hemodiálisis" value={erc} onChange={setErc} color="var(--orange, #f97316)" />
        </div>

        {/* Química */}
        <div className="section-subtitle">Química</div>
        <div className="row">
          <NumField label="BUN" unit="mg/dL" key_="bun" value={numFields.bun || ''} onChange={v => updateNum('bun', v)} />
          <NumField label="Albumina" unit="g/dL" key_="alb" value={numFields.alb || ''} onChange={v => updateNum('alb', v)} />
          <NumField label="Bilirrubina" unit="mg/dL" key_="bili" value={numFields.bili || ''} onChange={v => updateNum('bili', v)} />
        </div>

        {/* Hematología + Glucosa */}
        <div className="section-subtitle">Hematología y metabolismo</div>
        <div className="row">
          <NumField label="Hto" unit="%" key_="hto" value={numFields.hto || ''} onChange={v => updateNum('hto', v)} />
          <NumField label="Leucocitos" unit="×10³/mm³" key_="wbc" value={numFields.wbc || ''} onChange={v => updateNum('wbc', v)} />
          <NumField label="Glucosa" unit="mg/dL" key_="gluc" value={numFields.gluc || ''} onChange={v => updateNum('gluc', v)} />
        </div>

        {/* Diuresis */}
        <div className="section-subtitle">Diuresis</div>
        <div className="row">
          <NumField label="Diuresis 24h" unit="mL" key_="urine24h" value={numFields.urine24h || ''} onChange={v => updateNum('urine24h', v)} />
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
          >
            {(() => {
              const severityCol = severityColor(result.severity);
              return (
              <div className={`rounded-xl border backdrop-blur-sm ${severityCol.border} ${severityCol.bg} overflow-hidden`}>
                <div className="p-4">
                  <div className="flex items-end gap-5 mb-1">
                    <div>
                      <p className="text-[9px] font-mono ren-text-tertiary uppercase tracking-widest">Score total</p>
                      <span className="text-3xl font-bold ren-text-primary tabular-nums">{result.totalScore}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono ren-text-tertiary uppercase tracking-widest">Severidad</p>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${severityCol.bg} ${severityCol.text} border ${severityCol.border} backdrop-blur-sm inline-block mt-0.5`}>{result.severity}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-5 flex-wrap mt-3">
                    <div className="result-meta">
                      <span className="label">Mortalidad estimada</span>
                      <span className="value mortality">{result.mortalityPct}%</span>
                    </div>
                    <div className="result-meta">
                      <span className="label">LOS esperada</span>
                      <span className="value los">{result.losDays} días</span>
                    </div>
                    <div className="result-meta">
                      <span className="label">APS</span>
                      <span className="value" style={{ color: 'var(--teal)' }}>{result.aps}</span>
                    </div>
                  </div>

                  {result.breakdown && (
                    <>
                      <div className="section-title" style={{ marginBottom: 10, fontSize: 11 }}>
                        Score APS por sistema
                      </div>
                      <div className="system-pills">
                        {Object.entries(SYSTEM_GROUP).map(([sysKey, sys]) => {
                          const pts = sys.keys.reduce((sum, k) => sum + ((result.breakdown?.[k] as number) || 0), 0);
                          const col = systemSeverityPill(pts);
                          return (
                            <span key={sysKey} className={`sys-pill ${col.ring}`}>
                              <span className={`dot ${col.dot}`} />
                              {sys.label} <span className="pts">{pts}</span>
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {result.diagnosisLabel && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                      <span className="diag-badge">
                        <FileText size={11} />
                        {result.diagnosisLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={handleCalculate} className="action-btn flex-1">Recalcular</button>
              <button onClick={copyResult} className="action-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Copy size={12} /> Copiar
              </button>
              <button onClick={() => setResult(null)} className="action-btn">Limpiar</button>
            </div>
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

function NumField({ label, unit, key_, value, onChange, step, placeholder }: {
  label: string; unit?: string; key_: string; value: string; onChange: (v: string) => void; step?: string; placeholder?: string;
}) {
  return (
    <div className="field">
      <FieldLabel>
        {label}
        {unit && <Sub>{unit}</Sub>}
      </FieldLabel>
      <input
        type="number"
        className="num-input"
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
