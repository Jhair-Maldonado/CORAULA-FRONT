'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Search,
  PlusCircle,
  Loader2,
  X
} from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import {
  teacherIncidentsService,
  teacherIncidentsErrorMessage,
  isUncertainIncidentRegistration,
  incidentLocationError,
  incidentDescriptionError,
  incidentActionsError,
  limaDateTimeToIso,
  nowLimaDateTimeLocal,
  formatLimaDateTime,
  UNCERTAIN_INCIDENT_MESSAGE
} from '@/services/teacher/teacherIncidentsService';
import type { TeacherCourseStudentResponse } from '@/types/teacherCoursesApi';
import { INCIDENT_LOCATION_MAX, INCIDENT_TEXT_MAX } from '@/types/incidenciasApi';
import type { GravedadIncidencia, IncidenciaResponse, IncidenciasPage } from '@/types/incidenciasApi';

export type { GravedadIncidencia };

const PAGE_SIZE = 10;

const GRAVEDADES: {
  value: GravedadIncidencia;
  label: string;
  badgeClass: string;
  bgClass: string;
  description: string;
}[] = [
  {
    value: 'LEVE',
    label: 'Leve',
    badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    bgClass: 'bg-emerald-600',
    description: 'Distracción, retraso o falta menor sin reincidencia.'
  },
  {
    value: 'MODERADA',
    label: 'Moderada',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-800',
    bgClass: 'bg-amber-500',
    description: 'Incumplimiento reiterado, evasión o desobediencia.'
  },
  {
    value: 'GRAVE',
    label: 'Grave',
    badgeClass: 'border-rose-300 bg-rose-50 text-rose-800',
    bgClass: 'bg-rose-600',
    description: 'Agresión verbal/física, hostigamiento o falta grave al reglamento.'
  }
];

// Sugerencias: el backend acepta texto libre (1–120 caracteres).
export const LUGARES_SUGERIDOS = [
  'Aula de clases',
  'Patio / Recreo',
  'Chat / Canal virtual',
  'Laboratorio / Taller',
  'Pasillos / Servicios',
  'Entrada / Salida escolar'
];

export default function VistaIncidenciasDocente() {
  const { cursos, docenteNombre } = useDocenteSession();

  // Estados del Formulario
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [students, setStudents] = useState<TeacherCourseStudentResponse[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');

  // Búsqueda en vivo de estudiante
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | ''>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentSearchOpen, setIsStudentSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [dateTime, setDateTime] = useState(() => nowLimaDateTimeLocal());
  const [lugar, setLugar] = useState(LUGARES_SUGERIDOS[0]);
  const [gravedad, setGravedad] = useState<GravedadIncidencia>('MODERADA');
  const [descripcion, setDescripcion] = useState('');
  const [accionesTomadas, setAccionesTomadas] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formUncertain, setFormUncertain] = useState(false);

  // Historial paginado del docente autenticado (GET /v1/teacher/incidents)
  const [historyPage, setHistoryPage] = useState<IncidenciasPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);

  // Filtros de Historial (aplicados en el backend)
  const [filterGravedad, setFilterGravedad] = useState<'TODAS' | GravedadIncidencia>('TODAS');
  const [filterSectionId, setFilterSectionId] = useState<number | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(0);

  // Secciones únicas a partir de los cursos asignados
  const secciones = Array.from(
    new Map(cursos.map(c => [c.sectionId, `${c.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} ${c.grade}° ${c.sectionName}`])).entries()
  );

  useEffect(() => {
    if (filterDateFrom && filterDateTo && filterDateFrom > filterDateTo) {
      setHistoryLoading(false);
      setHistoryError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError('');
    teacherIncidentsService
      .getIncidents({
        severity: filterGravedad === 'TODAS' ? undefined : filterGravedad,
        sectionId: filterSectionId === '' ? undefined : filterSectionId,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page,
        size: PAGE_SIZE
      }, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setHistoryPage(data);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setHistoryPage(null);
        setHistoryError(teacherIncidentsErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [filterGravedad, filterSectionId, filterDateFrom, filterDateTo, page, historyRevision]);

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsStudentSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-seleccionar primer curso cuando esté disponible
  useEffect(() => {
    if (cursos.length > 0 && selectedCourseId === '') {
      setSelectedCourseId(cursos[0].sectionCourseId);
    }
  }, [cursos, selectedCourseId]);

  // Cargar estudiantes del curso seleccionado
  useEffect(() => {
    if (!selectedCourseId || typeof selectedCourseId !== 'number') {
      setStudents([]);
      setSelectedEnrollmentId('');
      setStudentSearchQuery('');
      return;
    }

    let active = true;
    setStudentsLoading(true);
    setStudentsError('');
    setSelectedEnrollmentId('');
    setStudentSearchQuery('');

    teacherCoursesService
      .getStudents(selectedCourseId)
      .then(data => {
        if (!active) return;
        setStudents(data);
      })
      .catch(err => {
        if (active) setStudentsError(teacherCoursesErrorMessage(err));
      })
      .finally(() => {
        if (active) setStudentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCourseId]);

  const selectedCourse = cursos.find(c => c.sectionCourseId === selectedCourseId);
  const selectedStudent = students.find(s => s.enrollmentId === selectedEnrollmentId);

  // Filtro en vivo de estudiantes según lo escrito por el docente
  const filteredStudents = students.filter(s => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = s.fullName.toLowerCase().includes(q);
    const matchCode = s.studentCode ? s.studentCode.toLowerCase().includes(q) : false;
    return matchName || matchCode;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setFormSuccess('');
    setFormUncertain(false);

    if (!selectedStudent || !selectedCourse) {
      setFormError('Debes seleccionar un estudiante implicado mediante la búsqueda en vivo.');
      return;
    }
    const textError = incidentLocationError(lugar) ?? incidentDescriptionError(descripcion) ?? incidentActionsError(accionesTomadas);
    if (textError) {
      setFormError(textError);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await teacherIncidentsService.registerIncident({
        sectionCourseId: selectedCourse.sectionCourseId,
        enrollmentId: selectedStudent.enrollmentId,
        occurredAt: limaDateTimeToIso(dateTime),
        location: lugar,
        severity: gravedad,
        description: descripcion,
        actionsTaken: accionesTomadas.trim() || null
      });
      setFormSuccess(`Incidencia registrada para ${saved.studentName}.`);
      setDescripcion('');
      setAccionesTomadas('');
      setGravedad('MODERADA');
      setSelectedEnrollmentId('');
      setStudentSearchQuery('');
      setPage(0);
      setHistoryRevision(n => n + 1);
    } catch (err) {
      if (isUncertainIncidentRegistration(err)) {
        // Sin respuesta confirmada: no se reintenta; se refresca el historial para que el docente verifique.
        setFormUncertain(true);
        setHistoryRevision(n => n + 1);
      } else {
        setFormError(teacherIncidentsErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const incidencias = historyPage?.content ?? [];
  const totalPages = historyPage?.totalPages ?? 0;
  const hasFilters = filterGravedad !== 'TODAS' || filterSectionId !== '' || !!filterDateFrom || !!filterDateTo;

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Módulo */}
      <header className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shrink-0">
            <ShieldAlert size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Módulo de Incidencias Disciplinarias
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Registro formal y seguimiento de incidencias de convivencia escolar (RF-21)
            </p>
          </div>
        </div>
      </header>

      {/* Disposición en dos columnas: Formulario vs Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Formulario de Registro (5 columnas) */}
        <section
          className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-xl border border-line shadow-xs"
          aria-labelledby="form-incidencia-title"
        >
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-line">
            <PlusCircle size={18} className="text-accent" aria-hidden="true" />
            <h2 id="form-incidencia-title" className="text-sm font-bold text-ink">
              Registrar Nueva Incidencia
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-bold text-muted">
            {/* Feedback Banners */}
            {formSuccess && (
              <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}
            {formUncertain && (
              <div role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>{UNCERTAIN_INCIDENT_MESSAGE}</span>
              </div>
            )}
            {formError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. Selector de Curso / Sección */}
            <label className="block">
              Curso / Sección <span className="text-rose-600">*</span>
              <select
                required
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(Number(e.target.value))}
                className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
              >
                {cursos.length === 0 ? (
                  <option value="">No hay cursos asignados</option>
                ) : (
                  cursos.map(c => (
                    <option key={c.sectionCourseId} value={c.sectionCourseId}>
                      {c.name} — {c.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} {c.grade}° {c.sectionName}
                    </option>
                  ))
                )}
              </select>
            </label>

            {/* 2. Búsqueda en Vivo de Estudiante Implicado */}
            <div ref={searchContainerRef} className="block relative">
              <span className="block text-muted">
                Estudiante implicado <span className="text-rose-600">*</span>
              </span>

              {studentsLoading ? (
                <p className="py-2 text-[11px] text-muted font-normal">Cargando lista de alumnos...</p>
              ) : studentsError ? (
                <p className="py-1 text-[11px] text-rose-600 font-normal">{studentsError}</p>
              ) : selectedStudent ? (
                /* Tarjeta de Estudiante Seleccionado */
                <div className="mt-1.5 p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-ink truncate">{selectedStudent.fullName}</p>
                      <p className="text-[10px] text-emerald-800 font-mono">
                        {selectedStudent.studentCode || 'Sin código institucional'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEnrollmentId('');
                      setStudentSearchQuery('');
                      setIsStudentSearchOpen(true);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shrink-0 shadow-2xs"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* Entrada de Búsqueda en Vivo */
                <div className="relative mt-1.5">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Escribe para buscar por nombre o código..."
                      value={studentSearchQuery}
                      onChange={e => {
                        setStudentSearchQuery(e.target.value);
                        setIsStudentSearchOpen(true);
                      }}
                      onFocus={() => setIsStudentSearchOpen(true)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
                    />
                    {studentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStudentSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1"
                        aria-label="Borrar texto"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown flotante con resultados filtrados */}
                  {isStudentSearchOpen && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto bg-white border border-line rounded-xl shadow-lg divide-y divide-line/60 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                      {filteredStudents.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted font-normal">
                          {students.length === 0
                            ? 'No hay estudiantes matriculados en esta sección.'
                            : `No se encontraron coincidencias para "${studentSearchQuery}".`}
                        </div>
                      ) : (
                        filteredStudents.map(s => (
                          <button
                            key={s.enrollmentId}
                            type="button"
                            onClick={() => {
                              setSelectedEnrollmentId(s.enrollmentId);
                              setStudentSearchQuery('');
                              setIsStudentSearchOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-neutral/30 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-ink truncate">{s.fullName}</p>
                              <p className="text-[10px] text-muted font-mono">{s.studentCode || 'Sin código'}</p>
                            </div>
                            <span className="text-[11px] font-bold text-accent shrink-0">Elegir</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Docente que reporta (Automático / Trazabilidad) */}
            <div>
              <span className="block text-muted">Docente que reporta</span>
              <div className="mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/15 text-xs text-ink flex items-center justify-between">
                <span className="font-semibold">{docenteNombre || 'Docente en sesión'}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                  Autor
                </span>
              </div>
            </div>

            {/* 4. Fecha / Hora y Lugar del Hecho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                Fecha y hora <span className="text-rose-600">*</span>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  max={nowLimaDateTimeLocal()}
                  onChange={e => setDateTime(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
                />
                <span className="text-[10px] font-normal text-muted block mt-0.5">Hora de Lima</span>
              </label>

              <label className="block">
                Lugar / Contexto <span className="text-rose-600">*</span>
                <input
                  type="text"
                  required
                  list="incidencia-lugares"
                  maxLength={INCIDENT_LOCATION_MAX}
                  value={lugar}
                  onChange={e => setLugar(e.target.value)}
                  placeholder="Ej. Aula de clases"
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
                />
                <datalist id="incidencia-lugares">
                  {LUGARES_SUGERIDOS.map(l => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </label>
            </div>

            {/* 5. Nivel de Gravedad */}
            <div>
              <span className="block text-ink mb-1.5">
                Nivel de gravedad <span className="text-rose-600">*</span>
              </span>
              <div className="grid grid-cols-3 gap-2">
                {GRAVEDADES.map(g => {
                  const isSelected = gravedad === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGravedad(g.value)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? `${g.badgeClass} ring-2 ring-accent/30 shadow-xs font-black`
                          : 'border-line bg-white hover:bg-neutral/20 text-muted font-bold'
                      }`}
                    >
                      <span className="text-xs">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. ¿Qué pasó? (Descripción obligatoria) */}
            <label className="block">
              ¿Qué pasó? / Descripción detallada <span className="text-rose-600">*</span>
              <textarea
                required
                rows={4}
                maxLength={INCIDENT_TEXT_MAX}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalla de forma objetiva los hechos ocurridos, palabras expresadas o transgresión al reglamento..."
                className="w-full mt-1.5 p-3 rounded-xl border border-line bg-white text-xs font-normal text-ink placeholder:text-muted focus-visible:outline-accent resize-none"
              />
              <span className="text-[10px] font-normal text-muted block text-right mt-0.5">
                {descripcion.length}/{INCIDENT_TEXT_MAX} caracteres
              </span>
            </label>

            {/* 7. Acciones tomadas / Compromiso */}
            <label className="block">
              Acciones tomadas / Compromiso (Opcional)
              <input
                type="text"
                maxLength={INCIDENT_TEXT_MAX}
                value={accionesTomadas}
                onChange={e => setAccionesTomadas(e.target.value)}
                placeholder="Ej. Diálogo reflexivo, compromiso escrito, aviso a tutoría..."
                className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-normal focus-visible:outline-accent"
              />
            </label>

            {/* Botón de Guardado */}
            <button
              type="submit"
              disabled={submitting || !descripcion.trim() || !selectedEnrollmentId}
              className="mt-2 min-h-10 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Registrando incidencia...</span>
                </>
              ) : (
                <span>Registrar incidencia</span>
              )}
            </button>
          </form>
        </section>

        {/* Columna Derecha: Historial paginado con filtros del backend (7 columnas) */}
        <section
          className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-xl border border-line shadow-xs min-w-0"
          aria-labelledby="historial-incidencia-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <h2 id="historial-incidencia-title" className="text-sm font-bold text-ink">
              Historial de Incidencias ({historyPage?.totalElements ?? 0})
            </h2>
          </div>

          {/* Filtros: Sección, Fechas y Gravedad */}
          <div className="flex flex-col gap-3 my-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-muted">
              <label className="block">
                Sección
                <select
                  aria-label="Filtrar por sección"
                  value={filterSectionId}
                  onChange={e => changeFilter(setFilterSectionId)(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full mt-1 p-2 rounded-lg border border-line bg-neutral/20 text-ink text-xs font-semibold focus-visible:outline-accent"
                >
                  <option value="">Todas las secciones</option>
                  {secciones.map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                Desde
                <input
                  type="date"
                  aria-label="Fecha desde"
                  value={filterDateFrom}
                  onChange={e => changeFilter(setFilterDateFrom)(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-line bg-neutral/20 text-ink text-xs font-semibold focus-visible:outline-accent"
                />
              </label>
              <label className="block">
                Hasta
                <input
                  type="date"
                  aria-label="Fecha hasta"
                  value={filterDateTo}
                  onChange={e => changeFilter(setFilterDateTo)(e.target.value)}
                  className="w-full mt-1 p-2 rounded-lg border border-line bg-neutral/20 text-ink text-xs font-semibold focus-visible:outline-accent"
                />
              </label>
            </div>

            {/* Filtros por Píldoras de Gravedad */}
            <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => changeFilter(setFilterGravedad)('TODAS')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  filterGravedad === 'TODAS'
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-neutral/40 text-muted hover:text-ink'
                }`}
              >
                Todas
              </button>
              {GRAVEDADES.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => changeFilter(setFilterGravedad)(g.value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    filterGravedad === g.value
                      ? `${g.badgeClass} ring-2 shadow-xs font-black`
                      : 'bg-neutral/40 text-muted hover:text-ink'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Tarjetas de Incidencias */}
          {historyLoading ? (
            <p className="p-6 text-center text-xs text-muted flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              <span>Cargando historial...</span>
            </p>
          ) : historyError ? (
            <div role="alert" className="p-4 my-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{historyError}</span>
              </span>
              <button
                type="button"
                onClick={() => setHistoryRevision(n => n + 1)}
                className="px-3 py-1 rounded-lg border border-rose-300 bg-white text-rose-800 font-bold hover:bg-rose-100"
              >
                Reintentar
              </button>
            </div>
          ) : incidencias.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted border border-dashed border-line rounded-xl my-4">
              <ShieldAlert size={28} className="mx-auto text-muted/60 mb-2" />
              <p className="font-semibold text-ink">No se encontraron incidencias registradas</p>
              <p className="mt-1 text-[11px]">
                {hasFilters
                  ? 'Prueba cambiando los filtros de sección, fecha o gravedad.'
                  : 'Usa el formulario para registrar la primera incidencia del aula.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {incidencias.map((inc: IncidenciaResponse) => {
                const gravedadInfo = GRAVEDADES.find(g => g.value === inc.severity) || GRAVEDADES[1];
                const curso = cursos.find(c => c.sectionCourseId === inc.sectionCourseId);

                return (
                  <article
                    key={inc.id}
                    className="p-4 rounded-xl border border-line bg-white hover:bg-neutral/10 transition-all shadow-2xs flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink truncate">
                          {inc.studentName}
                          {inc.studentCode && <span className="ml-1.5 text-[10px] font-mono text-muted">{inc.studentCode}</span>}
                        </h3>
                        <p className="text-[11px] text-muted mt-0.5">
                          {curso
                            ? `${curso.name} • ${curso.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · ${curso.grade}° grado · Sección ${curso.sectionName}`
                            : 'Curso sin asignación vigente'}
                        </p>
                      </div>

                      {/* Badge de Gravedad */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${gravedadInfo.badgeClass}`}>
                        {gravedadInfo.label}
                      </span>
                    </div>

                    {/* Descripción de lo ocurrido */}
                    <div className="p-3 bg-neutral/20 border border-line/60 rounded-lg text-xs text-ink leading-relaxed font-normal whitespace-pre-wrap break-words">
                      <p>{inc.description}</p>
                    </div>

                    {/* Acciones tomadas si existen */}
                    {inc.actionsTaken && (
                      <p className="text-[11px] text-muted font-medium break-words">
                        <strong className="text-ink">Acción tomada:</strong> {inc.actionsTaken}
                      </p>
                    )}

                    {/* Meta Info: Lugar, Fecha/Hora, Autor */}
                    <div className="pt-2 border-t border-line/50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin size={12} className="text-accent shrink-0" />
                          <span className="truncate">{inc.location}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-muted" />
                          <span>{formatLimaDateTime(inc.occurredAt)}</span>
                        </span>
                      </div>

                      <span className="font-semibold text-slate-600">
                        Reportó: {inc.teacherName}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {!historyLoading && !historyError && totalPages > 1 && (
            <nav aria-label="Paginación del historial" className="mt-4 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-line bg-white font-bold text-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-muted">Página {page + 1} de {totalPages}</span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-line bg-white font-bold text-muted hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
