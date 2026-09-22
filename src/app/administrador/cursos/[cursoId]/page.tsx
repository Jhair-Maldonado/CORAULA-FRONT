'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { 
  ArrowLeft01Icon, 
  BookOpen01Icon, 
  Calendar01Icon, 
  Task01Icon, 
  TeacherIcon, 
  CheckmarkCircle01Icon, 
  Folder01Icon,
  Download01Icon,
  Delete01Icon,
  Upload01Icon
} from 'hugeicons-react';
import { MOCK_CURSOS } from '@/data/mockCursos';
import { ArchivoSyllabus, Curso } from '@/types/cursos';

export default function CursoDetallePage() {
  const params = useParams();
  const cursoId = params?.cursoId as string;

  const cursoOriginal = MOCK_CURSOS.find(c => c.id === cursoId) || MOCK_CURSOS[0];
  const [curso, setCurso] = useState<Curso>(cursoOriginal);
  const [archivo, setArchivo] = useState<ArchivoSyllabus | undefined>(cursoOriginal.syllabusArchivo);

  const [subiendo, setSubiendo] = useState<boolean>(false);
  const [exitoSubida, setExitoSubida] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubiendo(true);
      setTimeout(() => {
        const extension = file.name.endsWith('.pdf') ? 'pdf' : 'doc';
        const nuevoArchivo: ArchivoSyllabus = {
          nombre: file.name,
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fechaSubida: new Date().toLocaleDateString('es-PE'),
          tipo: extension
        };
        setArchivo(nuevoArchivo);
        setSubiendo(false);
        setExitoSubida(true);
        setTimeout(() => setExitoSubida(false), 3500);
      }, 1000);
    }
  };

  const handleEliminarSyllabus = () => {
    setArchivo(undefined);
  };

  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto font-sans">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".pdf, .doc, .docx" 
        className="hidden" 
      />

      {/* Header Banner */}
      <div className="h-28 bg-accent relative shrink-0">
        <div className="absolute top-6 left-6 md:left-8 z-10 flex gap-2">
          <Link 
            href="/administrador/cursos"
            className="flex items-center gap-2 px-3.5 py-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white rounded-xl text-xs font-bold transition-all"
          >
            <ArrowLeft01Icon size={16} /> Volver a cursos
          </Link>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 md:px-8 pb-12 -mt-12 relative z-20 flex-1 flex flex-col gap-6">
        
        {/* Header Principal del Curso */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center font-black text-xl shrink-0">
              <BookOpen01Icon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-neutral text-ink px-2 py-0.5 rounded border border-line">
                  {curso.codigo}
                </span>
                <span className="text-xs font-bold text-accent">
                  {curso.nivel} • {curso.area}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-ink tracking-tight mt-1">
                {curso.nombre}
              </h1>
              <p className="text-xs font-bold text-muted mt-0.5 flex items-center gap-1.5">
                <TeacherIcon size={14} className="text-muted" /> Docente: {curso.docenteAsignado || 'No asignado'}
              </p>
            </div>
          </div>
        </div>

        {/* ALERTA DE EXITO AL SUBIR SYLLABUS */}
        {exitoSubida && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-xs animate-fade-in">
            <CheckmarkCircle01Icon size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">¡Syllabus guardado correctamente!</p>
              <p className="text-[11px] text-emerald-700 font-medium">El archivo PDF / DOC ha sido vinculado a este curso y se ha extraído la estructura académica.</p>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL: 2 COLUMNAS (IZQ: SYLLABUS Y ARCHIVO, DER: INFORMACIÓN Y CALENDARIO) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA (5 COLS): CARGA DE SYLLABUS PDF / DOC */}
          <div className="md:col-span-5 flex flex-col gap-6">
            
            <div className="bg-white rounded-2xl border border-line p-5 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-black text-ink uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2"><Folder01Icon size={18} className="text-accent" /> Syllabus Institucional</span>
              </h2>

              {archivo ? (
                <div className="p-4 rounded-xl bg-neutral/40 border border-line flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent text-white font-black text-xs flex items-center justify-center shrink-0 uppercase">
                        {archivo.tipo}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-ink truncate">{archivo.nombre}</p>
                        <p className="text-[10px] font-bold text-muted">{archivo.tamanio} • Subido el {archivo.fechaSubida}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 rounded-lg bg-neutral hover:bg-neutral/80 text-ink text-xs font-bold transition-colors border border-line flex items-center justify-center gap-1.5"
                    >
                      Reemplazar
                    </button>
                    <button 
                      onClick={handleEliminarSyllabus}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors border border-rose-100"
                      title="Eliminar syllabus"
                    >
                      <Delete01Icon size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed border-line hover:border-accent bg-neutral/20 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload01Icon size={24} />
                  </div>
                  {subiendo ? (
                    <p className="text-xs font-bold text-ink">Subiendo archivo...</p>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-ink mb-0.5">Haz clic para subir Syllabus (.PDF o .DOC)</p>
                      <p className="text-[10px] font-medium text-muted">Documento oficial con la estructura del curso</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* TEMARIO RESUMEN EXTRACTO */}
            {curso.temarioResumen && (
              <div className="bg-white rounded-2xl border border-line p-5 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-black text-ink uppercase tracking-wider">Unidades Temáticas</h3>
                <div className="flex flex-col gap-2">
                  {curso.temarioResumen.map((tema, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral/30 border border-line/40 text-xs font-bold text-ink">
                      <span className="w-5 h-5 rounded bg-accent/10 text-accent text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{tema}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA DERECHA (7 COLS): INFORMACIÓN ACADÉMICA DETALLADA */}
          <div className="md:col-span-7 flex flex-col gap-6">
            
            {/* ESTADÍSTICAS Y CARGA HORARIA */}
            <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-2">
                <Calendar01Icon size={18} className="text-accent" /> Estructura y Horas Semanales
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral/40 border border-line/60 flex flex-col">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Frecuencia</span>
                  <span className="text-lg font-black text-ink mt-0.5">{curso.frecuenciaSemanal} días/sem</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral/40 border border-line/60 flex flex-col">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Horas Lectivas</span>
                  <span className="text-lg font-black text-ink mt-0.5">{curso.horasTotalesSemana} hrs/sem</span>
                </div>

                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 flex flex-col">
                  <span className="text-[9px] font-bold text-accent uppercase tracking-wider">Prácticas Calificadas</span>
                  <span className="text-lg font-black text-accent mt-0.5">{curso.cantPracticasCalificadas} Prácticas</span>
                </div>
              </div>

              {/* Descripción corta */}
              {curso.descripcion && (
                <div className="p-3 rounded-xl bg-neutral/30 border border-line/40 text-xs font-medium text-ink/80 leading-relaxed mt-1">
                  {curso.descripcion}
                </div>
              )}
            </div>

            {/* CALENDARIO DE EXÁMENES Y EVALUACIONES */}
            <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
              <h2 className="text-xs font-black text-ink uppercase tracking-wider flex items-center gap-2">
                <Task01Icon size={18} className="text-rose-600" /> Cronograma de Exámenes
              </h2>

              <div className="flex flex-col gap-2.5">
                {curso.semanasExamenes.map((examen, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                        E{idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-ink">{examen}</p>
                        <p className="text-[10px] font-bold text-rose-600">Evaluación Oficial Programada</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-white text-ink px-2.5 py-1 rounded-md border border-rose-200">
                      Obligatorio
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
