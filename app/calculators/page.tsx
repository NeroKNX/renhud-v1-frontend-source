'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Beaker, ChevronRight, Calculator, AlertCircle, Info, FlaskConical, Activity, Heart, Droplets, Thermometer, Wind, Syringe, Pill, Zap, BarChart3, Globe, FileText, Brain } from 'lucide-react';
import { CrowIcon } from '@/components/ui/crow-icon';
import { useAuth } from '@/lib/auth-context';

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
    default: return <Calculator className="w-5 h-5" />;
  }
}

function severityColor(severity: string) {
  switch (severity) {
    case 'BAJA': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25', bar: 'bg-emerald-500' };
    case 'BAJA-MODERADA': return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/25', bar: 'bg-yellow-500' };
    case 'MODERADA': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/25', bar: 'bg-orange-500' };
    case 'ALTA': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/25', bar: 'bg-red-500' };
    case 'MUY ALTA': return { bg: 'bg-rose-600/10', text: 'text-rose-400', border: 'border-rose-600/25', bar: 'bg-rose-600' };
    default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/25', bar: 'bg-gray-500' };
  }
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
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de calculadoras
  useEffect(() => {
    fetch('/api/calculators')
      .then(r => r.json())
      .then(d => setCalculators(d.calculators || []))
      .catch(() => {});
  }, []);

  // Cargar schema al seleccionar
  useEffect(() => {
    if (!selectedId) { setSchema(null); setResult(null); return; }
    fetch(`/api/calculator/${selectedId}/schema`)
      .then(r => r.json())
      .then(d => {
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
      .catch(() => setError('No se pudo cargar la calculadora'));
  }, [selectedId]);

  const updateValue = (key: string, value: any) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value };

      // Auto-seleccionar en cascada para diagnósticos jerárquicos
      if (key === 'admissionType') {
        // Resetear diagnóstico cuando cambia tipo de admisión
        delete next.diagnosisSystem;
        delete next.diagnosisKey;

        // Traducir admissionType al groupDependency real del árbol (medical/surgical)
        const groupKey = value === 'medical' ? 'medical' : 'surgical';

        const sysVar = schema?.variables.find(v => v.key === 'diagnosisSystem');
        const firstSys = sysVar?.options?.find((opt: any) => opt.groupDependency === groupKey);
        if (firstSys) {
          next.diagnosisSystem = firstSys.value;
          const diagVar = schema?.variables.find(v => v.key === 'diagnosisKey');
          const firstDiag = diagVar?.options?.find(
            (opt: any) => opt.systemDependency === firstSys.value && opt.groupDependency === groupKey
          );
          if (firstDiag) next.diagnosisKey = firstDiag.value;
        }
      } else if (key === 'diagnosisSystem') {
        delete next.diagnosisKey;

        // Obtener el grupo real desde admissionType
        const admissionVal = next.admissionType || 'medical';
        const groupKey = admissionVal === 'medical' ? 'medical' : 'surgical';

        const diagVar = schema?.variables.find(v => v.key === 'diagnosisKey');
        const firstDiag = diagVar?.options?.find(
          (opt: any) => opt.systemDependency === value && opt.groupDependency === groupKey
        );
        if (firstDiag) next.diagnosisKey = firstDiag.value;
      }

      return next;
    });
  };

  const handleCalculate = async () => {
    if (!selectedId || !schema) return;
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

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — calculadoras */}
        <aside className="w-56 lg:w-64 shrink-0 border-r border-[var(--ren-border)] overflow-y-auto ren-scrollbar hidden md:block">
          <div className="p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-2 px-2">
              {calculators.length} {calculators.length === 1 ? 'disponible' : 'disponibles'}
            </p>
            {calculators.map(calc => (
              <button
                key={calc.id}
                onClick={() => setSelectedId(calc.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all mb-0.5 ${
                  selectedId === calc.id
                    ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25 shadow-sm'
                    : 'hover:bg-[var(--ren-bg-tertiary)] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    selectedId === calc.id
                      ? 'bg-[var(--accent-color)]/15 text-[var(--accent-hover)]'
                      : 'bg-[var(--ren-bg-tertiary)] text-[var(--ren-text-tertiary)]'
                  }`}>
                    {calcIcon(calc.id)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold ren-text-primary truncate">{calc.shortName || calc.name}</p>
                    <p className="text-[10px] ren-text-tertiary truncate">{calc.variableCount} variables</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Selector móvil — pills compactas */}
        <div className="md:hidden overflow-x-auto ren-scrollbar border-b border-[var(--ren-border)]">
          <div className="flex gap-1.5 p-2" style={{ minWidth: 'max-content' }}>
            {calculators.map(calc => (
              <button
                key={calc.id}
                onClick={() => setSelectedId(calc.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                  selectedId === calc.id
                    ? 'bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/25 text-[var(--accent-color)]'
                    : 'bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] ren-text-secondary'
                }`}
              >
                {calcIcon(calc.id)}
                {calc.shortName || calc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto ren-scrollbar">
          {!selectedId ? (
            /* Pantalla de bienvenida */
            <div className="flex items-center justify-center min-h-full p-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-sm"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20 flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-[var(--accent-hover)]" />
                  </div>
                </div>
                <h2 className="text-base font-bold ren-gradient-text mb-1">Calculadoras clínicas</h2>
                <p className="text-xs ren-text-secondary mb-4 leading-relaxed">
                  Scores pronósticos determinísticos. Resultados reproducibles — el modelo nunca interviene.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {calculators.map(calc => (
                    <button
                      key={calc.id}
                      onClick={() => setSelectedId(calc.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] text-xs ren-text-secondary hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all"
                    >
                      {calcIcon(calc.id)}
                      {calc.shortName || calc.name}
                      <ChevronRight size={12} className="ren-text-tertiary" />
                    </button>
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
                        {schema?.longDescription && (
                          <div className="mt-1.5">
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
                      </div>
                    </div>
                  </div>

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
                      <div key={grp.group} className="mb-6">
                        {/* Grupo — subtítulo limpio */}
                        <div className="mb-3 pl-1">
                          <h3 className="text-[11px] font-mono uppercase tracking-widest ren-text-tertiary">
                            {grp.group}
                          </h3>
                        </div>
                        {/* Variables del grupo en grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
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
                                        formValues[variable.key]
                                          ? 'bg-[var(--accent-color)] text-white shadow-sm'
                                          : 'bg-[var(--ren-bg-secondary)] ren-text-secondary hover:bg-[var(--ren-bg-tertiary)]'
                                      }`}
                                    >
                                      Sí
                                    </button>
                                    <button
                                      onClick={() => updateValue(variable.key, false)}
                                      className={`flex-1 px-3 py-2 text-xs font-semibold transition-all ${
                                        !formValues[variable.key]
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
                                    className="w-3.5 h-3.5 rounded border-[var(--ren-border)] bg-[var(--ren-bg-primary)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]/50 shrink-0"
                                  />
                                  <span className="text-sm ren-text-primary">{variable.label}</span>
                                </label>
                              ) : variable.type === 'select' ? (
                                <div>
                                  <label className="block text-xs font-mono ren-text-tertiary mb-0.5 px-1">
                                    {variable.label}
                                    {variable.required && <span className="text-red-400 ml-0.5">*</span>}
                                  </label>
                                  <select
                                    value={formValues[variable.key] ?? variable.defaultValue ?? ''}
                                    onChange={e => updateValue(variable.key, e.target.value)}
                                    disabled={variable.disablable ? formValues[variable.disablable] === true : false}
                                    className={`w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-xs ren-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]/50 focus:border-[var(--accent-color)]/50 transition-all ${
                                      variable.disablable && formValues[variable.disablable] ? 'opacity-40 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {filterOptions(variable)?.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
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
                                      className={`w-full bg-[var(--ren-bg-secondary)] border border-[var(--ren-border)] rounded-lg px-3 py-2.5 text-sm ren-text-primary placeholder:text-[var(--ren-text-tertiary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]/50 focus:border-[var(--accent-color)]/50 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
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

                  {/* Botón Calcular */}
                  <button
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ren-btn-glow"
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

                  {error && (
                    <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-mono flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      {error}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Resultado */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="mt-4"
                  >
                    {severity && (
                      <div className={`rounded-xl border ${severity.border} ${severity.bg} overflow-hidden`}>
                        {/* Score + mortalidad */}
                        <div className="p-5">
                          {/* 4 métricas principales */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', damping: 16, stiffness: 140 }}
                            >
                              <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">APACHE IV Score</p>
                              <span className="text-2xl font-bold ren-text-primary tabular-nums">{result.totalScore}</span>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.05 }}
                              className="text-right"
                            >
                              <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">APS Score</p>
                              <span className="text-2xl font-bold ren-text-primary tabular-nums">{result.aps}</span>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.1 }}
                            >
                              <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">Mortalidad estimada</p>
                              <div className="flex items-baseline gap-1.5">
                                <span className={`text-2xl font-bold tabular-nums ${severity.text}`}>
                                  {result.mortalityPct}%
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${severity.bg} ${severity.text} border ${severity.border}`}>
                                  {result.severity}
                                </span>
                              </div>
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ type: 'spring', damping: 16, stiffness: 140, delay: 0.15 }}
                              className="text-right"
                            >
                              <p className="text-[10px] font-mono uppercase tracking-widest ren-text-tertiary mb-0.5">Estimated LOS</p>
                              <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-2xl font-bold ren-text-primary tabular-nums">{result.losDays}</span>
                                <span className="text-xs ren-text-tertiary font-mono">days</span>
                              </div>
                            </motion.div>
                          </div>

                          {/* Barra de severidad */}
                          <div className="h-1.5 bg-[var(--ren-bg-tertiary)] rounded-full mb-4">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(result.mortalityPct, 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full ${severity.bar} rounded-full`}
                            />
                          </div>

                          {/* Diagnóstico */}
                          {result.diagnosisLabel && (
                            <div className="flex justify-center mb-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)]">
                                <FileText size={11} className="ren-text-tertiary" />
                                {result.diagnosisLabel}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleCalculate}
                        className="flex-1 py-2 rounded-lg text-xs font-mono ren-text-secondary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:border-[var(--accent-color)]/40 hover:text-[var(--accent-hover)] transition-all"
                      >
                        Recalcular
                      </button>
                      <button
                        onClick={() => { setResult(null); }}
                        className="py-2 px-4 rounded-lg text-xs font-mono ren-text-tertiary bg-[var(--ren-bg-tertiary)] border border-[var(--ren-border)] hover:bg-[var(--ren-bg-secondary)] transition-all"
                      >
                        Limpiar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Espaciador inferior */}
              <div className="h-6" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
