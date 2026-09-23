'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen01Icon, 
  Add01Icon, 
  Search01Icon, 
  Task01Icon, 
  Calendar01Icon,
  TeacherIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ArrowRight01Icon
} from 'hugeicons-react';
import { MOCK_CURSOS } from '@/data/mockCursos';
import { Curso } from '@/types/cursos';

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>(MOCK_CURSOS);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');
  const [showModalNuevo, setShowModalNuevo] = useState<boolean>(false);

  // Campos para nuevo curso
  const [nombre, setNombre] = useState<string>('');
  const [codigo, setCodigo] = useState<string>('');
  const [nivel, setNivel] = useState<'Primaria' | 'Secundaria'>('Secundaria');
  const [area, setArea] = useState<string>('Matemáticas');
  const [frecuencia, setFrecuencia] = useState<number>(3);
  const [horas, setHoras] = useState<number>(5);
  const [practicas, setPracticas] = useState<number>(4);
  const [docente, setDocente] = useState<string>('Prof. Asignado');

  const filteredCursos = cursos.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNivel = nivelFilter === 'Todos' || c.nivel === nivelFilter;
    return matchesSearch && matchesNivel;
  });

  const handleCrearCurso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const nuevo: Curso = {
      id: nombre.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
      nombre,
      codigo: codigo || `CUR-${Math.floor(100 + Math.random() * 900)}`,
      nivel,
      area,
      frecuenciaSemanal: frecuencia,
      horasTotalesSemana: horas,
      cantPracticasCalificadas: practicas,
      semanasExamenes: ['Semana 8 (Examen Parcial)', 'Semana 16 (Examen Final)'],
      docenteAsignado: docente,
      descripcion: 'Curso registrado dinámicamente en la malla curricular institucional.'
    };

    setCursos(prev => [nuevo, ...prev]);
    setShowModalNuevo(false);

    // Reset
    setNombre('');
    setCodigo('');
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* HEADER & NUEVO CURSO */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
            MALLA CURRICULAR Y SYLLABUS
          </span>
          <h1 className="text-ink text-2xl font-bold mt-0.5 tracking-tight">
            Gestión de Cursos Académicos
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Planifica los cursos, syllabus, frecuencia semanal y calendario de exámenes.
          </p>
        </div>

        <button 
          onClick={() => setShowModalNuevo(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-colors shadow-sm w-fit shrink-0 cursor-pointer"
        >
          <Add01Icon size={16} />
          <span>Agregar Nuevo Curso</span>
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 w-full md:w-80 bg-neutral/50 border border-line rounded-lg px-3 py-1.5">
          <Search01Icon size={16} className="text-muted shrink-0" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o código del curso..."
            className="w-full bg-transparent text-xs font-medium text-ink outline-none placeholder:text-muted"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-bold">Nivel:</span>
          <select 
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
            className="bg-neutral border border-line rounded-lg px-3 py-1.5 text-xs font-bold text-ink outline-none cursor-pointer"
          >
            <option value="Todos">Todos los Niveles</option>
            <option value="Primaria">Primaria</option>
            <option value="Secundaria">Secundaria</option>
          </select>
        </div>
      </div>

      {/* GRID DE CURSOS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
        {filteredCursos.map(curso => (
          <Link
            key={curso.id}
            href={`/administrador/cursos/${curso.id}`}
            className="bg-white rounded-2xl border border-line p-4 shadow-xs hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm border border-accent/20 shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen01Icon size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral text-ink px-2 py-0.5 rounded-md border border-line/60">
                  {curso.codigo}
                </span>
              </div>

              {/* Título y Nivel */}
              <h2 className="text-sm font-bold text-ink group-hover:text-accent transition-colors leading-tight mb-1">
                {curso.nombre}
              </h2>
              <p className="text-[11px] font-bold text-muted mb-3">
                {curso.nivel} • {curso.area}
              </p>

              {/* Info de frecuencia y prácticas */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral/40 border border-line/60 mb-3 text-[11px] font-bold">
                <div>
                  <span className="text-[9px] text-muted uppercase tracking-wider block">Frecuencia</span>
                  <span className="text-ink">{curso.frecuenciaSemanal} veces/sem</span>
                </div>
                <div className="border-l border-line/60 pl-2">
                  <span className="text-[9px] text-muted uppercase tracking-wider block">Prácticas</span>
                  <span className="text-accent">{curso.cantPracticasCalificadas} Prácticas</span>
                </div>
              </div>
            </div>

            {/* Syllabus badge y Flecha */}
            <div className="pt-2 border-t border-line/50 flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                curso.syllabusArchivo 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {curso.syllabusArchivo ? '✓ Syllabus Adjunto' : '! Sin Syllabus'}
              </span>

              <div className="w-7 h-7 rounded-lg bg-neutral group-hover:bg-accent group-hover:text-white text-muted flex items-center justify-center transition-colors">
                <ArrowRight01Icon size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* MODAL PARA AGREGAR CURSO NUEVO */}
      {showModalNuevo && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-line p-6 max-w-md w-full shadow-xl animate-fade-in flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <BookOpen01Icon size={18} className="text-accent" /> Registrar Nuevo Curso
              </h3>
              <button 
                onClick={() => setShowModalNuevo(false)}
                className="text-muted hover:text-ink transition-colors p-1"
              >
                <Cancel01Icon size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearCurso} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Nombre del Curso</label>
                <input 
                  type="text" 
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Física Cuántica I"
                  className="w-full px-3 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Código</label>
                  <input 
                    type="text" 
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ej. FIS-201"
                    className="w-full px-3 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Nivel</label>
                  <select 
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value as 'Primaria' | 'Secundaria')}
                    className="w-full px-3 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent bg-white"
                  >
                    <option value="Primaria">Primaria</option>
                    <option value="Secundaria">Secundaria</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-1">Frecuencia / Sem</label>
                  <input 
                    type="number" 
                    value={frecuencia}
                    onChange={(e) => setFrecuencia(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-1">Horas Totales</label>
                  <input 
                    type="number" 
                    value={horas}
                    onChange={(e) => setHoras(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted uppercase tracking-wider block mb-1">Prácticas</label>
                  <input 
                    type="number" 
                    value={practicas}
                    onChange={(e) => setPracticas(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">Docente Asignado</label>
                <input 
                  type="text" 
                  value={docente}
                  onChange={(e) => setDocente(e.target.value)}
                  placeholder="Profesor a cargo"
                  className="w-full px-3 py-1.5 rounded-lg border border-line text-xs font-bold text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-line">
                <button 
                  type="button" 
                  onClick={() => setShowModalNuevo(false)}
                  className="px-4 py-2 rounded-xl bg-neutral text-ink text-xs font-bold hover:bg-neutral/80 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm"
                >
                  <CheckmarkCircle01Icon size={16} /> Guardar Curso
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
