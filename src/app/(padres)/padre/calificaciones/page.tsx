// src/app/(padres)/padre/calificaciones/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { getCalificaciones } from '@/lib/api';
import { CursoCalificacion } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Tabs,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import {
  Download01Icon,
  Task01Icon,
  Award01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from 'hugeicons-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CalificacionesPage() {
  const { selectedHijo, selectedHijoId } = usePadre();
  const [cursos, setCursos] = useState<CursoCalificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bimestreActivo, setBimestreActivo] = useState('bim-1');
  const [expandedCurso, setExpandedCurso] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchData = async () => {
    if (!selectedHijoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getCalificaciones(selectedHijoId);
      setCursos(data);
      if (data.length > 0) {
        setExpandedCurso(data[0].cursoId);
      }
    } catch (err) {
      console.error('Error cargando calificaciones:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las calificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHijoId]);

  const toggleExpand = (cursoId: string) => {
    setExpandedCurso((prev) => (prev === cursoId ? null : cursoId));
  };

  // Generador de Libreta Oficial en PDF usando jsPDF y jspdf-autotable
  const handleDescargarLibretaPDF = () => {
    if (!selectedHijo || cursos.length === 0) return;
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF();

      // Encabezado institucional
      doc.setFillColor(190, 18, 60); // #BE123C
      doc.rect(0, 0, 210, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('CORAULA - COLEGIO INTEGRADO', 14, 15);

      doc.setFontSize(10);
      doc.text('REPORTE OFICIAL DE CALIFICACIONES · AÑO 2026', 130, 15);

      // Datos del Estudiante
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(`Estudiante: ${selectedHijo.nombreCompleto}`, 14, 35);
      doc.text(`Código: ${selectedHijo.codigoEstudiante}  |  DNI: ${selectedHijo.dni}`, 14, 42);
      doc.text(`Nivel y Grado: ${selectedHijo.grado} "${selectedHijo.seccion}" - ${selectedHijo.nivel}`, 14, 49);
      doc.text(`Tutor de Aula: ${selectedHijo.tutor}`, 14, 56);

      // Tabla de Calificaciones
      const tableData = cursos.map((c) => [
        c.cursoNombre,
        c.area,
        c.docente,
        c.bimestre1.toString(),
        c.bimestre2 ? c.bimestre2.toString() : '-',
        c.bimestre3 ? c.bimestre3.toString() : '-',
        c.promedioActual.toFixed(1),
        c.nivelLogro,
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Curso', 'Área', 'Docente', 'Bim I', 'Bim II', 'Bim III', 'Prom.', 'Logro']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, font: 'helvetica' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      // Pie con firmas
      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('_____________________________', 30, finalY + 35);
      doc.text('Firma Dirección Académica', 38, finalY + 42);

      doc.text('_____________________________', 130, finalY + 35);
      doc.text(`Firma Tutor: ${selectedHijo.tutor}`, 125, finalY + 42);

      doc.text('Documento oficial generado por la Plataforma Digital CORAULA.', 14, 285);

      // Guardar PDF
      doc.save(`Libreta_Notas_${selectedHijo.nombres.replace(/\s+/g, '_')}_2026.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const promedioCalculado =
    cursos.length > 0
      ? (cursos.reduce((acc, c) => acc + c.promedioActual, 0) / cursos.length).toFixed(1)
      : '0.0';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar las notas"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  if (!selectedHijo) {
    return (
      <div className="py-12">
        <EmptyState
          title="Seleccione un estudiante"
          description="Seleccione a su hijo en la barra superior para ver su historial académico."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header with Title and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
            EVALUACIÓN Y DESEMPEÑO CONTINUO
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
            Calificaciones y Libreta de Notas
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Resultados académicos y competencias de{' '}
            <strong className="text-[#111827]">{selectedHijo.nombreCompleto}</strong> ({selectedHijo.grado}).
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleDescargarLibretaPDF}
          isLoading={downloadingPdf}
          leftIcon={<Download01Icon size={18} />}
        >
          Descargar Libreta Oficial (PDF)
        </Button>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
              <Award01Icon size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Promedio Ponderado
              </span>
              <p className="text-2xl font-black text-[#111827]">{promedioCalculado} / 20</p>
              <span className="text-[11px] font-bold text-[#15803D]">
                Nivel de Logro: Destacado (AD)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <Task01Icon size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Cursos Evaluados
              </span>
              <p className="text-2xl font-black text-[#111827]">{cursos.length} Asignaturas</p>
              <span className="text-[11px] text-[#6B7280]">100% Cursos Aprobados</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1">
              Escala Nacional de Logro
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827]">
              <span className="px-1.5 py-0.5 bg-[#DCFCE7] text-[#15803D] rounded">AD (18-20)</span>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">A (14-17)</span>
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">B (11-13)</span>
              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded">C (0-10)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Bimestres */}
      <Tabs
        tabs={[
          { id: 'bim-1', label: 'I Bimestre (Cerrado)' },
          { id: 'bim-2', label: 'II Bimestre (En Curso)', count: cursos.length },
          { id: 'bim-3', label: 'III Bimestre' },
          { id: 'bim-4', label: 'IV Bimestre' },
        ]}
        activeTab={bimestreActivo}
        onChange={setBimestreActivo}
      />

      {/* Listado de Cursos y Tarjetas Desplegables de Competencias */}
      {cursos.length === 0 ? (
        <EmptyState
          title="No hay calificaciones registradas"
          description="Aún no se han emitido notas para este periodo bimestral."
        />
      ) : (
        <div className="space-y-4">
          {cursos.map((curso) => {
            const isExpanded = expandedCurso === curso.cursoId;
            return (
              <Card key={curso.cursoId} className="transition-all">
                {/* Header row clickable */}
                <div
                  onClick={() => toggleExpand(curso.cursoId)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-[#E5E7EB] flex items-center justify-center font-bold text-sm text-[#BE123C] shrink-0">
                      {curso.codigoCurso.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-[#111827]">
                          {curso.cursoNombre}
                        </h4>
                        <Badge
                          variant={
                            curso.nivelLogro === 'AD'
                              ? 'success'
                              : curso.nivelLogro === 'A'
                              ? 'info'
                              : 'warning'
                          }
                          size="sm"
                        >
                          Logro: {curso.nivelLogro}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        Área: {curso.area} · Docente: <span className="text-[#111827] font-semibold">{curso.docente}</span>
                      </p>
                    </div>
                  </div>

                  {/* Notas Bimestrales y Promedio */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="flex items-center gap-3 text-center">
                      <div className="px-2.5 py-1 bg-slate-100 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Bim I</span>
                        <strong className="text-xs font-bold text-[#111827]">{curso.bimestre1}</strong>
                      </div>
                      <div className="px-2.5 py-1 bg-slate-100 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Bim II</span>
                        <strong className="text-xs font-bold text-[#111827]">{curso.bimestre2 || '-'}</strong>
                      </div>
                      <div className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="text-[9px] font-bold text-[#BE123C] uppercase block">Prom.</span>
                        <strong className="text-sm font-black text-[#BE123C]">{curso.promedioActual.toFixed(1)}</strong>
                      </div>
                    </div>

                    <button
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                      aria-label={isExpanded ? 'Contraer detalle' : 'Expandir detalle'}
                    >
                      {isExpanded ? <ArrowUp01Icon size={20} /> : <ArrowDown01Icon size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Competencies & Evaluations Detail */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 pt-0 border-t border-[#E5E7EB] bg-slate-50/40 space-y-5 animate-in fade-in duration-150">
                    {/* Criterios / Competencias */}
                    <div className="space-y-3 pt-4">
                      <h5 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                        Competencias del Currículo Nacional Evaluadas
                      </h5>
                      <div className="space-y-2">
                        {curso.criterios.map((criterio, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-[#E5E7EB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#111827]">{criterio.nombre}</p>
                              {criterio.comentario && (
                                <p className="text-[11px] text-[#6B7280] italic">
                                  &quot;{criterio.comentario}&quot;
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={criterio.nivelLogro === 'AD' ? 'success' : 'info'}
                                size="sm"
                              >
                                {criterio.nivelLogro}
                              </Badge>
                              <span className="font-black text-sm text-[#111827] w-8 text-right">
                                {criterio.nota}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evaluaciones parciales continuas */}
                    {curso.evaluaciones && curso.evaluaciones.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                          Registro de Evaluaciones Continuas
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {curso.evaluaciones.map((ev) => (
                            <div
                              key={ev.id}
                              className="p-3 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#111827] truncate">
                                  {ev.titulo}
                                </p>
                                <span className="text-[10px] text-[#6B7280]">
                                  {ev.tipo} · Peso {ev.peso}%
                                </span>
                              </div>
                              <span className="text-sm font-black text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-lg shrink-0">
                                {ev.nota}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observación del Docente */}
                    {curso.observacionDocente && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                        <strong>Comentario pedagógico del docente:</strong> &quot;{curso.observacionDocente}&quot;
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
