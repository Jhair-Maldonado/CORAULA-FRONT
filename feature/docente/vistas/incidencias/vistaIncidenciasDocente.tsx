'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Search,
  Filter,
  Users,
  PlusCircle,
  Loader2,
  ChevronRight,
  BookOpen,
  X,
  Check
} from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { teacherCoursesService, teacherCoursesErrorMessage } from '@/services/teacher/teacherCoursesService';
import type { TeacherCourseStudentResponse } from '@/types/teacherCoursesApi';
import type { GravedadIncidencia, RegistrarIncidenciaRequest, IncidenciaResponse } from '@/types/incidenciasApi';

export type { GravedadIncidencia };

export interface IncidenciaRegistro {
  id: string;
  studentId: number;
  studentName: string;
  courseName: string;
  gradeSection: string;
  teacherName: string;
  dateTime: string;
  lugar: string;
  gravedad: GravedadIncidencia;
  descripcion: string;
  accionesTomadas: string;
  createdAt: string;
}

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

const LUGARES = [
  'Aula de clases',
  'Patio / Recreo',
  'Chat / Canal virtual',
  'Laboratorio / Taller',
  'Pasillos / Servicios',
  'Entrada / Salida escolar'
];

function getNowDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function VistaIncidenciasDocente() {
  const { cursos, docenteNombre, isLoading: sessionLoading } = useDocenteSession();

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

  const [dateTime, setDateTime] = useState(getNowDateTimeLocal);
  const [lugar, setLugar] = useState(LUGARES[0]);
  const [gravedad, setGravedad] = useState<GravedadIncidencia>('MODERADA');
  const [descripcion, setDescripcion] = useState('');
  const [accionesTomadas, setAccionesTomadas] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Historial de Incidencias registradas
  const [incidencias, setIncidencias] = useState<IncidenciaRegistro[]>([
    {
      id: 'inc-101',
      studentId: 1,
      studentName: 'Flores Quispe, Mateo Sebastián',
      courseName: 'Matemática',
      gradeSection: 'Secundaria · 3° grado · Sección A',
      teacherName: docenteNombre || 'Prof. Juan Docente',
      dateTime: '2026-10-26T10:15',
      lugar: 'Aula de clases',
      gravedad: 'MODERADA',
      descripcion: 'Interrupción reiterada de la sesión y negativa a entregar la práctica asignada.',
      accionesTomadas: 'Llamado de atención verbal y acuerdo de entrega postergada bajo compromiso.',
      createdAt: '2026-10-26T10:20:00Z'
    }
  ]);

  // Filtros de Historial
  const [filterGravedad, setFilterGravedad] = useState<'TODAS' | GravedadIncidencia>('TODAS');
  const [searchHistory, setSearchHistory] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedStudent || !selectedCourse) {
      setFormError('Debes seleccionar un estudiante implicado mediante la búsqueda en vivo.');
      return;
    }
    if (!descripcion.trim()) {
      setFormError('La descripción de lo ocurrido es obligatoria.');
      return;
    }

    setSubmitting(true);

    const gradeSectionText = `${selectedCourse.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · ${selectedCourse.grade}° grado · Sección ${selectedCourse.sectionName}`;

    // Payload tipado con RegistrarIncidenciaRequest
    const payload: RegistrarIncidenciaRequest = {
      sectionCourseId: selectedCourse.sectionCourseId,
      enrollmentId: selectedStudent.enrollmentId,
      dateTime: `${dateTime}:00-05:00`,
      lugar,
      gravedad,
      descripcion: descripcion.trim(),
      accionesTomadas: accionesTomadas.trim() ? accionesTomadas.trim() : null
    };

    const nuevaIncidencia: IncidenciaRegistro = {
      id: `inc-${Date.now()}`,
      studentId: selectedStudent.enrollmentId,
      studentName: selectedStudent.fullName,
      courseName: selectedCourse.name,
      gradeSection: gradeSectionText,
      teacherName: docenteNombre || 'Docente asignado',
      dateTime,
      lugar: payload.lugar,
      gravedad: payload.gravedad,
      descripcion: payload.descripcion,
      accionesTomadas: payload.accionesTomadas || '',
      createdAt: new Date().toISOString()
    };

    setTimeout(() => {
      setIncidencias(prev => [nuevaIncidencia, ...prev]);
      setFormSuccess(`Incidencia disciplinaria registrada con éxito para ${selectedStudent.fullName}.`);
      setDescripcion('');
      setAccionesTomadas('');
      setGravedad('MODERADA');
      setSelectedEnrollmentId('');
      setStudentSearchQuery('');
      setSubmitting(false);

      setTimeout(() => {
        setFormSuccess('');
      }, 3500);
    }, 400);
  };

  // Filtrado de historial
  const incidenciasFiltradas = incidencias.filter(inc => {
    const matchGravedad = filterGravedad === 'TODAS' || inc.gravedad === filterGravedad;
    const matchNombre = inc.studentName.toLowerCase().includes(searchHistory.toLowerCase())
      || inc.courseName.toLowerCase().includes(searchHistory.toLowerCase());
    return matchGravedad && matchNombre;
  });

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
                  onChange={e => setDateTime(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
                />
              </label>

              <label className="block">
                Lugar / Contexto
                <select
                  value={lugar}
                  onChange={e => setLugar(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink text-xs font-semibold focus-visible:outline-accent"
                >
                  {LUGARES.map(l => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
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
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Detalla de forma objetiva los hechos ocurridos, palabras expresadas o transgresión al reglamento..."
                className="w-full mt-1.5 p-3 rounded-xl border border-line bg-white text-xs font-normal text-ink placeholder:text-muted focus-visible:outline-accent resize-none"
              />
              <span className="text-[10px] font-normal text-muted block text-right mt-0.5">
                {descripcion.length} caracteres
              </span>
            </label>

            {/* 7. Acciones tomadas / Compromiso */}
            <label className="block">
              Acciones tomadas / Compromiso (Opcional)
              <input
                type="text"
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

        {/* Columna Derecha: Historial y Búsqueda por Alumno (7 columnas) */}
        <section
          className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-xl border border-line shadow-xs min-w-0"
          aria-labelledby="historial-incidencia-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
            <h2 id="historial-incidencia-title" className="text-sm font-bold text-ink">
              Historial de Incidencias ({incidenciasFiltradas.length})
            </h2>
          </div>

          {/* Filtros: Búsqueda y Gravedad */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 my-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por alumno o curso..."
                value={searchHistory}
                onChange={e => setSearchHistory(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral/20 border border-line rounded-lg text-xs text-ink placeholder:text-muted focus-visible:outline-accent"
              />
            </div>

            {/* Filtros por Píldoras de Gravedad */}
            <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterGravedad('TODAS')}
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
                  onClick={() => setFilterGravedad(g.value)}
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
          {incidenciasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted border border-dashed border-line rounded-xl my-4">
              <ShieldAlert size={28} className="mx-auto text-muted/60 mb-2" />
              <p className="font-semibold text-ink">No se encontraron incidencias registradas</p>
              <p className="mt-1 text-[11px]">
                {incidencias.length === 0
                  ? 'Usa el formulario para registrar la primera incidencia del aula.'
                  : 'Prueba cambiando los filtros de búsqueda o gravedad.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {incidenciasFiltradas.map(inc => {
                const gravedadInfo = GRAVEDADES.find(g => g.value === inc.gravedad) || GRAVEDADES[1];

                return (
                  <article
                    key={inc.id}
                    className="p-4 rounded-xl border border-line bg-white hover:bg-neutral/10 transition-all shadow-2xs flex flex-col gap-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink truncate">
                          {inc.studentName}
                        </h3>
                        <p className="text-[11px] text-muted mt-0.5">
                          {inc.courseName} &bull; {inc.gradeSection}
                        </p>
                      </div>

                      {/* Badge de Gravedad */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${gravedadInfo.badgeClass}`}>
                        {gravedadInfo.label}
                      </span>
                    </div>

                    {/* Descripción de lo ocurrido */}
                    <div className="p-3 bg-neutral/20 border border-line/60 rounded-lg text-xs text-ink leading-relaxed font-normal">
                      <p>{inc.descripcion}</p>
                    </div>

                    {/* Acciones tomadas si existen */}
                    {inc.accionesTomadas && (
                      <p className="text-[11px] text-muted font-medium">
                        <strong className="text-ink">Acción tomada:</strong> {inc.accionesTomadas}
                      </p>
                    )}

                    {/* Meta Info: Lugar, Fecha/Hora, Autor */}
                    <div className="pt-2 border-t border-line/50 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-accent" />
                          <span>{inc.lugar}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-muted" />
                          <span>{inc.dateTime.replace('T', ' ')}</span>
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
        </section>
      </div>
    </div>
  );
}
