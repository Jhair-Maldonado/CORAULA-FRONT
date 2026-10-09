'use client';

import React, { useEffect, useRef, useState } from 'react';
import { vacanciesService, vacanciesErrorMessage } from '@/services/management/vacanciesService';
import type { VacancyGradeResponse, VacancySectionResponse, UpdateVacancySectionResponse } from '@/types/vacanciesApi';
import { 
  Building03Icon, 
  UserGroupIcon, 
  Door01Icon,
  Tick02Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';

export default function PantallaVacantes() {
  const [nivelFilter, setNivelFilter] = useState<'' | VacancyGradeResponse['level']>('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: VacancyGradeResponse[]; error?: string } | null>(null);
  const loading = result?.revision !== revision;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;
  const filteredGrados = data?.filter(g => !nivelFilter || g.level === nivelFilter) ?? [];

  useEffect(() => {
    let current = true;
    vacanciesService.list().then(data => {
      if (current) setResult({ revision, data });
    }).catch(error => {
      if (current) setResult({ revision, error: vacanciesErrorMessage(error) });
    });
    return () => { current = false; };
  }, [revision]);

  function updateSection(response: UpdateVacancySectionResponse) {
    setResult(previous => previous?.data ? {
      ...previous,
      data: previous.data.map(grade => ({ ...grade, sections: grade.sections.map(section =>
        section.sectionId === response.sectionId ? { ...section, enrollmentOpen: response.enrollmentOpen } : section
      ) })),
    } : previous);
  }

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* HEADER & FILTROS */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
            PLANIFICACIÓN Y ADMISIÓN
          </span>
          <h1 className="text-ink text-xl font-bold mt-0.5 tracking-tight">
            Control de Vacantes por Grado
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Supervisa el nivel de ocupación, vacantes disponibles y habilita la apertura o cierre de inscripciones.
          </p>
        </div>

        {/* Filtro por Nivel */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              aria-label="Filtrar por nivel"
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value as '' | VacancyGradeResponse['level'])}
              className="appearance-none bg-white border border-line rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent min-h-10 cursor-pointer hover:border-accent transition-colors shadow-xs"
            >
              <option value="">Todos los Niveles</option>
              <option value="PRIMARY">Primaria</option>
              <option value="SECONDARY">Secundaria</option>
            </select>
            <ArrowDown01Icon size={14} aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {loading && <div role="status" className="max-w-7xl mx-auto w-full">
        <p className="text-xs text-muted mb-3">Cargando vacantes...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map(n => <div key={n} className="h-64 bg-white border border-line rounded-2xl shadow-xs animate-pulse" />)}</div>
      </div>}
      {error && <div role="alert" className="max-w-7xl mx-auto w-full p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm break-words"><p>{error}</p><button type="button" onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg font-bold text-xs focus-visible:outline-2 focus-visible:outline-accent">Reintentar</button></div>}
      {data && filteredGrados.length === 0 && <div className="max-w-7xl mx-auto w-full p-8 bg-white border border-dashed border-line rounded-2xl text-center"><Building03Icon size={28} aria-hidden="true" className="text-accent mx-auto mb-3" /><p className="text-sm font-bold text-ink">No hay secciones disponibles para los filtros seleccionados.</p></div>}
      {/* GRID DE TARJETAS MEJORADAS Y COMPACTAS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
        {filteredGrados.map(grado => {
          
          const capacidadTotal = grado.totalCapacity;
          const inscritosTotal = grado.activeEnrollmentCount;
          const vacantesDisponibles = grado.availableVacancies;
          const porcentajeOcupado = capacidadTotal > 0 ? (inscritosTotal / capacidadTotal) * 100 : 0;
          
          const isLleno = vacantesDisponibles <= 0;

          return (
            <div 
              key={`${grado.academicPeriodId}:${grado.level}:${grado.grade}`}
              className="bg-white rounded-2xl border border-line p-4 flex flex-col justify-between shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-accent/40 group"
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shrink-0 border border-accent/20">
                      {grado.grade}°
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-ink leading-tight">{grado.grade}° grado</h2>
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{grado.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    isLleno ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isLleno ? 'Sin vacantes' : 'Con vacantes'}
                  </span>
                </div>

                {/* Estadísticas de Ocupación */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral/40 border border-line/60 mb-3 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <UserGroupIcon size={12} aria-hidden="true" className="text-muted" /> Inscritos
                    </span>
                    <span className="text-base font-bold text-ink mt-0.5">{inscritosTotal}</span>
                  </div>
                  <div className="flex flex-col border-l border-line/60 pl-2.5">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <Door01Icon size={12} className="text-accent" /> Vacantes
                    </span>
                    <span className={`text-base font-bold mt-0.5 ${vacantesDisponibles > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {vacantesDisponibles}
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso de Capacidad */}
                <div className="flex flex-col gap-1 mb-4 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-muted">Capacidad</span>
                    <span className="text-ink font-bold">{inscritosTotal} / {capacidadTotal} ({Math.round(porcentajeOcupado)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isLleno ? 'bg-rose-500' : porcentajeOcupado > 80 ? 'bg-amber-500' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, porcentajeOcupado))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 relative z-10 border-t border-line/60 pt-3">
                {grado.sections.map(section => <SectionEnrollment key={section.sectionId} section={section} onUpdated={updateSection} />)}
                {grado.sections.length === 0 && <p className="text-xs text-muted">Sin secciones disponibles.</p>}
              </div>

              {/* Marca de agua estética de fondo */}
              <Building03Icon size={100} aria-hidden="true" className="absolute -right-6 -bottom-6 text-neutral/40 z-0 pointer-events-none group-hover:scale-105 transition-transform" />
            </div>
          );
        })}
      </div>

    </div>
  );
}

function SectionEnrollment({ section, onUpdated }: { section: VacancySectionResponse; onUpdated: (response: UpdateVacancySectionResponse) => void }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);

  async function toggleEnrollment() {
    if (mutation.current) return;
    mutation.current = true; setUpdating(true); setError(''); setNotice('');
    try {
      const response = await vacanciesService.updateSection(section.sectionId, { enrollmentOpen: !section.enrollmentOpen });
      onUpdated(response);
      setNotice(response.enrollmentOpen ? 'Matrícula abierta.' : 'Matrícula cerrada.');
    } catch (error) { setError(vacanciesErrorMessage(error)); }
    finally { mutation.current = false; setUpdating(false); }
  }

  return <section className="rounded-xl bg-neutral/30 border border-line/60 p-2.5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[11px] font-bold text-ink break-words">Sección {section.sectionName}</h3>
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${section.enrollmentOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{section.enrollmentOpen ? 'Abierta' : 'Cerrada'}</span>
    </div>
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-muted mt-1.5">
      <span>{section.activeEnrollmentCount} / {section.maxCapacity}</span><span>{section.availableVacancies} vacantes</span>
      {!section.active && <span className="px-1.5 rounded bg-neutral text-muted border border-line">Inactiva</span>}
    </div>
    <button type="button" disabled={updating} onClick={toggleEnrollment} aria-label={(section.enrollmentOpen ? 'Cerrar' : 'Abrir') + ' matrícula de sección ' + section.sectionName}
      className={`w-full min-h-10 py-2 mt-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${section.enrollmentOpen ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' : 'bg-accent text-white hover:bg-accent/90 shadow-xs'}`}>
      {updating ? 'Actualizando...' : section.enrollmentOpen ? <><Cancel01Icon size={14} aria-hidden="true" />Cerrar Matrícula</> : <><Tick02Icon size={14} aria-hidden="true" />Abrir Matrícula</>}
    </button>
    {notice && <p role="status" className="mt-2 text-[10px] text-emerald-700 font-medium flex items-start gap-1"><CheckmarkCircle01Icon size={12} aria-hidden="true" className="shrink-0" />{notice}</p>}
    {error && <p role="alert" className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-700 break-words">{error}</p>}
  </section>;
}
