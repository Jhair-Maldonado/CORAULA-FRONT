// src/app/(padres)/padre/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePadre } from '@/components/padres/PadreContext';
import { getDashboardResumen } from '@/lib/api';
import { ResumenDashboardPadre } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { JustificacionModal } from '@/components/padres/JustificacionModal';
import { PagoModal } from '@/components/padres/PagoModal';
import { ComunicadoModal } from '@/components/padres/ComunicadoModal';
import {
  Task01Icon,
  Calendar01Icon,
  Clock01Icon,
  CreditCardIcon,
  Notification01Icon,
  ArrowRight01Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from 'hugeicons-react';

export default function PadreDashboardPage() {
  const { padre, selectedHijo, selectedHijoId } = usePadre();
  const [resumen, setResumen] = useState<ResumenDashboardPadre | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isJustificacionOpen, setIsJustificacionOpen] = useState(false);
  const [isPagoOpen, setIsPagoOpen] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<any | null>(null);

  const fetchData = async () => {
    if (!selectedHijoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardResumen(selectedHijoId);
      setResumen(data);
    } catch (err) {
      console.error('Error cargando resumen:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el resumen escolar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHijoId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CardSkeleton />
          </div>
          <div>
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar el resumen escolar"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  if (!resumen || !selectedHijo) {
    return (
      <div className="py-12">
        <EmptyState
          title="No se encontró información del estudiante"
          description="Seleccione un estudiante a su cargo en la parte superior."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-rose-50/60 to-transparent pointer-events-none hidden md:block" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block">
              PORTAL FAMILIAR · VISTA GENERAL
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
              Bienvenido, {padre?.nombres || 'Padre de Familia'}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] max-w-xl leading-relaxed">
              Monitoreo en tiempo real del progreso académico y asistencial de{' '}
              <strong className="text-[#111827] font-bold">{selectedHijo.nombreCompleto}</strong>{' '}
              ({selectedHijo.grado} &quot;{selectedHijo.seccion}&quot; - {selectedHijo.nivel}).
            </p>
          </div>

          {/* Quick Info Chip */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-[#E5E7EB] rounded-2xl shrink-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0">
              {selectedHijo.fotoUrl ? (
                <Image
                  src={selectedHijo.fotoUrl}
                  alt={selectedHijo.nombreCompleto}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-slate-600">
                  {selectedHijo.nombres.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827]">
                Tutor: {selectedHijo.tutor}
              </p>
              <Link
                href="/padre/chat"
                className="text-[11px] font-bold text-[#BE123C] hover:underline flex items-center gap-1"
              >
                Enviar mensaje &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Promedio General */}
        <Card hoverable>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Promedio General
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#111827]">
                  {selectedHijo.promedioGeneral.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                  Sobresaliente
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">Escala vigesimal (0 - 20)</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
              <Task01Icon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Asistencia del Mes */}
        <Card hoverable>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Asistencia Mensual
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#15803D]">
                  {selectedHijo.porcentajeAsistencia}%
                </span>
                <span className="text-xs text-[#6B7280]">asistencia</span>
              </div>
              <p className="text-[11px] text-[#6B7280]">1 tardanza registrada</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <Calendar01Icon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Asistencia de Hoy */}
        <Card hoverable>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Estado Hoy
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] animate-ping" />
                <span className="text-lg font-black text-[#15803D]">
                  {resumen.asistenciaHoy.estado}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Ingreso: {resumen.asistenciaHoy.horaIngreso || '07:45 AM'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <CheckmarkCircle02Icon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* Incidencias & Alertas (cary.pen) */}
        <Card hoverable>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Incidencias y Alertas
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-lg font-black ${
                    selectedHijo.incidenciasCount === 0 ? 'text-[#15803D]' : 'text-[#BE123C]'
                  }`}
                >
                  {selectedHijo.incidenciasCount === 0 ? '0 Incidencias' : '1 Alerta Activa'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Tolerancia de ingreso: 15 min
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              selectedHijo.incidenciasCount === 0 ? 'bg-emerald-50 text-[#15803D]' : 'bg-red-50 text-[#BE123C]'
            }`}>
              <AlertCircleIcon size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsJustificacionOpen(true)}
          leftIcon={<Calendar01Icon size={16} />}
        >
          Justificar Inasistencia
        </Button>
        <Link href="/padre/justificaciones">
          <Button variant="outline" size="sm" leftIcon={<AlertCircleIcon size={16} />}>
            Alertas de Asistencia (15 min)
          </Button>
        </Link>
        <Link href="/padre/calificaciones">
          <Button variant="outline" size="sm" leftIcon={<Task01Icon size={16} />}>
            Ver Libreta de Notas
          </Button>
        </Link>
        <Link href="/padre/horario">
          <Button variant="outline" size="sm" leftIcon={<Clock01Icon size={16} />}>
            Horario de Clases
          </Button>
        </Link>
      </div>

      {/* Main Grid: Próximas Evaluaciones & Avisos / Últimas Notas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (2 spans): Próximas Evaluaciones y Notas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Próximas Evaluaciones y Tareas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Próximas Evaluaciones y Tareas</CardTitle>
                <CardDescription>
                  Fechas importantes programadas por los docentes del grado
                </CardDescription>
              </div>
              <Link href="/padre/calificaciones" className="text-xs font-bold text-[#BE123C] hover:underline flex items-center gap-1">
                Ver todo &rarr;
              </Link>
            </CardHeader>
            <CardContent>
              {resumen.proximasEvaluaciones.length === 0 ? (
                <EmptyState
                  title="No hay evaluaciones próximas"
                  description="El estudiante no tiene exámenes o entregas pendientes para esta semana."
                />
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {resumen.proximasEvaluaciones.map((ev) => (
                    <div
                      key={ev.id}
                      className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-[#BE123C] shrink-0 border border-slate-200">
                          {ev.tipo === 'Examen' ? 'EX' : ev.tipo === 'Práctica' ? 'PC' : 'PR'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#111827]">{ev.titulo}</p>
                          <p className="text-xs text-[#6B7280]">
                            Curso: <strong className="text-[#111827] font-semibold">{ev.curso}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant={
                            ev.tipo === 'Examen'
                              ? 'danger'
                              : ev.tipo === 'Práctica'
                              ? 'accent'
                              : 'info'
                          }
                          size="sm"
                        >
                          {ev.tipo}
                        </Badge>
                        <p className="text-[11px] text-[#6B7280] font-mono mt-1">
                          Fecha: {ev.fecha}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas Calificaciones Publicadas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Últimas Calificaciones Registradas</CardTitle>
                <CardDescription>
                  Notas recientes publicadas en el sistema de evaluación continua
                </CardDescription>
              </div>
              <Link href="/padre/calificaciones" className="text-xs font-bold text-[#BE123C] hover:underline flex items-center gap-1">
                Detalle por Competencias &rarr;
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {resumen.ultimasNotas.map((nota, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-50/70 border border-[#E5E7EB] rounded-2xl flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                        {nota.curso}
                      </span>
                      <p className="text-xs font-bold text-[#111827] line-clamp-1">
                        {nota.evaluacion}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-[#6B7280]">{nota.fecha}</span>
                      <span
                        className={`text-base font-black px-2 py-0.5 rounded-lg ${
                          nota.nota >= 17
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : nota.nota >= 14
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {nota.nota} / 20
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha (1 span): Comunicados Urgentes y Finanzas */}
        <div className="space-y-6">
          {/* Comunicados y Avisos Urgentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Notification01Icon size={18} className="text-[#BE123C]" />
                <CardTitle className="text-base">Avisos y Comunicados</CardTitle>
              </div>
              <Link href="/padre/comunicados" className="text-xs font-bold text-[#BE123C] hover:underline">
                Ver todos
              </Link>
            </CardHeader>
            <CardContent>
              {resumen.comunicadosUrgentes.length === 0 ? (
                <p className="text-xs text-[#6B7280] text-center py-4">
                  No hay avisos urgentes pendientes.
                </p>
              ) : (
                <div className="space-y-3">
                  {resumen.comunicadosUrgentes.map((com) => (
                    <div
                      key={com.id}
                      onClick={() => setSelectedComunicado(com)}
                      className="p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-2xl cursor-pointer hover:bg-rose-100/50 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="danger" size="sm">
                          {com.tipo}
                        </Badge>
                        <span className="text-[10px] text-[#6B7280]">{com.fecha}</span>
                      </div>
                      <h5 className="text-xs font-bold text-[#111827] line-clamp-2">
                        {com.titulo}
                      </h5>
                      <p className="text-[11px] text-[#6B7280] line-clamp-2 leading-relaxed">
                        {com.resumen}
                      </p>
                      {com.requiereFirma && !com.firmado && (
                        <span className="inline-block text-[10px] font-bold text-[#BE123C] bg-white px-2 py-0.5 rounded-md border border-rose-300">
                          ✍ Requiere firma del padre
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monitor de Tolerancia 15 Minutos y Alertas */}
          <Card className="border-rose-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircleIcon size={18} className="text-[#BE123C]" />
                <CardTitle className="text-base">Monitor de Asistencia (15 Min)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#BE123C]">
                    Protocolo Matutino
                  </span>
                  <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                    Tolerancia: 15 min
                  </span>
                </div>
                <p className="text-xs font-bold text-[#111827]">
                  Inicio de clases: 08:00 AM · Límite: 08:15 AM
                </p>
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  Si el estudiante no registra ingreso en 15 minutos, el colegio activa la alerta automática preventiva.
                </p>
              </div>

              <Link href="/padre/justificaciones">
                <Button variant="secondary" size="sm" className="w-full" leftIcon={<AlertCircleIcon size={16} />}>
                  Ver Alertas y Justificaciones
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      <JustificacionModal
        isOpen={isJustificacionOpen}
        onClose={() => setIsJustificacionOpen(false)}
        onSuccess={fetchData}
      />

      <ComunicadoModal
        isOpen={Boolean(selectedComunicado)}
        onClose={() => setSelectedComunicado(null)}
        comunicado={selectedComunicado}
        onSuccess={fetchData}
      />
    </div>
  );
}
