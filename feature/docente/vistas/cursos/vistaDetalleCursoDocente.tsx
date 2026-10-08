// feature/docente/vistas/cursos/vistaDetalleCursoDocente.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  CheckCircle2,
  Calendar,
  Plus,
  ClipboardCheck,
  Award,
  Upload,
  X,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import {
  getCursoDetalleDocente,
  crearMaterialDocente,
  guardarAsistenciaDocente
} from '@/lib/api';
import { CursoDetalleDocente, ClaseDocente } from '@/types/docentes';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function VistaDetalleCursoDocente() {
  const router = useRouter();
  const params = useParams();
  const cursoId = (params?.id as string) || 'mat-3a';

  const [curso, setCurso] = useState<CursoDetalleDocente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Semanas colapsables
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({
    'sem-1': true,
    'sem-2': false,
    'sem-3': false
  });

  // Modal Crear Material (Frame fYgNB)
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    titulo: '',
    semanaNumero: 1,
    tipo: 'documento' as 'documento' | 'video' | 'ejercicios' | 'evaluacion',
    tieneTarea: true,
    archivoNombre: ''
  });
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Modal Asistencia Rápida (Frame lVoY0)
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [asistenciaRapida, setAsistenciaRapida] = useState([
    { id: 'est-7', nombre: 'Valentina Rojas', presente: true },
    { id: 'est-8', nombre: 'Mateo Salazar', presente: true },
    { id: 'est-9', nombre: 'Luciana Torres', presente: true },
    { id: 'est-10', nombre: 'Diego Mendoza', presente: false }
  ]);
  const [savingAsistencia, setSavingAsistencia] = useState(false);
  const [asistenciaGuardadaMsg, setAsistenciaGuardadaMsg] = useState(false);

  // Mes filtro
  const [mesSeleccionado, setMesSeleccionado] = useState('Septiembre 2026');

  const fetchDetalle = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCursoDetalleDocente(cursoId);
      setCurso(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el detalle del curso');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalle();
  }, [cursoId]);

  const toggleWeek = (weekId: string) => {
    setOpenWeeks((prev) => ({ ...prev, [weekId]: !prev[weekId] }));
  };

  const handleCrearMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.titulo.trim()) return;

    try {
      setSavingMaterial(true);
      await crearMaterialDocente(cursoId, materialForm);
      await fetchDetalle();
      setShowMaterialModal(false);
      setMaterialForm({
        titulo: '',
        semanaNumero: 1,
        tipo: 'documento',
        tieneTarea: true,
        archivoNombre: ''
      });
    } catch (err) {
      console.error('Error al guardar material:', err);
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleGuardarAsistenciaRapida = async () => {
    try {
      setSavingAsistencia(true);
      const registros = asistenciaRapida.map((item) => ({
        estudianteId: item.id,
        estado: (item.presente ? 'Presente' : 'Falta') as 'Presente' | 'Falta'
      }));
      await guardarAsistenciaDocente(cursoId, registros);
      setAsistenciaGuardadaMsg(true);
      setTimeout(() => {
        setAsistenciaGuardadaMsg(false);
        setShowAsistenciaModal(false);
      }, 1200);
    } catch (err) {
      console.error('Error al guardar asistencia:', err);
    } finally {
      setSavingAsistencia(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error || !curso) {
    return (
      <ErrorState
        title="No pudimos cargar la información de este curso"
        message={error || 'Hubo un error al procesar la solicitud.'}
        onRetry={fetchDetalle}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón Volver y Acciones principales (Frame Db3dl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/docente')}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] text-[#64748B] hover:text-[#111827] transition-colors cursor-pointer border border-[#E5E7EB]"
            title="Volver a mis cursos"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                {curso.nombre} - {curso.grado}
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Gestión de unidades, sesiones de clase y materiales de estudio
            </p>
          </div>
        </div>

        {/* Acciones principales del Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Asistencia (Abre modal de asistencia rápida como en cary.pen lVoY0) */}
          <button
            type="button"
            onClick={() => setShowAsistenciaModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#BE123C] text-[#111827] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ClipboardCheck size={16} />
            <span>Asistencia</span>
          </button>

          {/* Botón Ver Notas (Navega a notas como en cary.pen) */}
          <Link
            href="/docente/notas"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F4F6] hover:bg-[#111827] text-[#111827] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Award size={16} />
            <span>Ver Notas</span>
          </Link>

          {/* Botón Crear nuevo Material (Frame fYgNB) */}
          <button
            type="button"
            onClick={() => setShowMaterialModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={16} />
            <span>Crear nuevo Material</span>
          </button>
        </div>
      </div>

      {/* Selector de Mes / Unidad */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-[#E5E7EB]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
          <Calendar size={16} className="text-[#BE123C]" />
          <span>Periodo curricular activo:</span>
        </div>

        <select
          value={mesSeleccionado}
          onChange={(e) => setMesSeleccionado(e.target.value)}
          className="text-xs font-semibold text-[#111827] bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#BE123C] cursor-pointer"
        >
          <option value="Septiembre 2026">Septiembre 2026 (Unidad 3)</option>
          <option value="Octubre 2026">Octubre 2026 (Unidad 4)</option>
          <option value="Noviembre 2026">Noviembre 2026 (Unidad 5)</option>
        </select>
      </div>

      {/* Lista de Semanas y Clases (Acordeón de cary.pen Db3dl) */}
      <div className="flex flex-col gap-3">
        {curso.semanas.map((semana) => {
          const isOpen = openWeeks[semana.id];

          return (
            <div
              key={semana.id}
              className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden transition-all shadow-2xs"
            >
              {/* Header de la semana */}
              <button
                type="button"
                onClick={() => toggleWeek(semana.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#64748B]">
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <span className="font-bold text-sm sm:text-base text-[#111827]">
                    {semana.titulo}
                  </span>
                </div>

                <span className="text-xs font-medium text-[#64748B] bg-[#F3F4F6] px-2.5 py-1 rounded-full">
                  {semana.clases.length} {semana.clases.length === 1 ? 'clase' : 'clases'}
                </span>
              </button>

              {/* Contenedor de Clases */}
              {isOpen && (
                <div className="border-t border-[#E5E7EB] p-4 flex flex-col gap-2.5 bg-[#FAFBFD]">
                  {semana.clases.map((clase) => (
                    <div
                      key={clase.id}
                      className="bg-white p-3.5 rounded-lg border border-[#E5E7EB] flex items-center justify-between hover:border-[#BE123C]/30 hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#111827] shrink-0">
                          {clase.tipo === 'video' ? (
                            <Video size={18} className="text-indigo-600" />
                          ) : (
                            <FileText size={18} className="text-[#BE123C]" />
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-[#111827]">
                            {clase.nombre}
                          </h4>
                          {clase.archivoNombre && (
                            <p className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                              <span>📎 {clase.archivoNombre}</span>
                              {clase.fecha && <span>· {clase.fecha}</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {clase.tieneTarea && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={13} />
                            <span className="hidden sm:inline">Tiene tarea asignada</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: REGISTRAR ASISTENCIA (Frame lVoY0) */}
      {showAsistenciaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Registrar asistencia
                </h3>
                <p className="text-xs text-[#64748B]">
                  Escanea o marca manualmente a tus estudiantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAsistenciaModal(false)}
                className="p-1 rounded-md text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                LISTA RÁPIDA
              </span>

              {asistenciaRapida.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                >
                  <span className="text-xs font-semibold text-[#111827]">
                    {est.nombre}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setAsistenciaRapida((prev) =>
                        prev.map((item) =>
                          item.id === est.id ? { ...item, presente: !item.presente } : item
                        )
                      );
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      est.presente
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {est.presente ? 'Presente' : 'Ausente'}
                  </button>
                </div>
              ))}
            </div>

            {asistenciaGuardadaMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>Asistencia guardada correctamente</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={handleGuardarAsistenciaRapida}
                disabled={savingAsistencia}
                className="flex-1 py-2.5 bg-[#BE123C] hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingAsistencia ? 'Guardando...' : 'Guardar Asistencia'}
              </button>

              <Link
                href="/docente/asistencia"
                className="py-2.5 px-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold transition-all text-center"
              >
                Ver asistencia completa
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREANDO MATERIAL DE CLASE (Frame fYgNB) */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-md p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Creando Material de Clase
                </h3>
                <p className="text-xs text-[#64748B]">
                  Publica guías, videos o tareas para tus estudiantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="p-1 rounded-md text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearMaterial} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Título del material / clase *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clase 7: Integrales y aplicaciones"
                  value={materialForm.titulo}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, titulo: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#BE123C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Semana
                  </label>
                  <select
                    value={materialForm.semanaNumero}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        semanaNumero: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value={1}>Semana 1</option>
                    <option value={2}>Semana 2</option>
                    <option value={3}>Semana 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Tipo de recurso
                  </label>
                  <select
                    value={materialForm.tipo}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        tipo: e.target.value as any
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white"
                  >
                    <option value="documento">📄 Documento / Guía</option>
                    <option value="video">🎥 Grabación / Video</option>
                    <option value="ejercicios">✏️ Ejercicios prácticos</option>
                    <option value="evaluacion">📝 Evaluación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Nombre de archivo simulado / enlace
                </label>
                <input
                  type="text"
                  placeholder="Ej: Guia_Integrales_Calculo.pdf"
                  value={materialForm.archivoNombre}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      archivoNombre: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#BE123C]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={materialForm.tieneTarea}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      tieneTarea: e.target.checked
                    })
                  }
                  className="accent-[#BE123C] rounded-sm"
                />
                <span className="text-xs font-semibold text-[#111827]">
                  Asignar como tarea entregable para los alumnos
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB] mt-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMaterial}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#BE123C] hover:bg-rose-800 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingMaterial ? 'Guardando...' : 'Crear nuevo Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
