// src/app/(padres)/padre/justificaciones/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePadre } from '@/components/padres/PadreContext';
import {
  getAlertasAsistencia,
  getJustificaciones,
  getIncidenciasAsistencia,
  resolverAlerta,
} from '@/services/padres/padreService';
import {
  AlertaAsistencia,
  JustificacionInasistencia,
  IncidenciaAsistencia,
} from '@/types/padre';
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
import { JustificacionModal } from '@/components/padres/JustificacionModal';
import {
  AlertCircleIcon,
  Clock01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  PlusSignIcon,
  CallIcon,
  TeacherIcon,
  Location01Icon,
  UserGroupIcon,
} from 'hugeicons-react';

export default function JustificacionesAlertasPage() {
  const { selectedHijo, selectedHijoId, hijos } = usePadre();
  const [alertas, setAlertas] = useState<AlertaAsistencia[]>([]);
  const [justificaciones, setJustificaciones] = useState<JustificacionInasistencia[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaAsistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState('alertas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertasData, justData, incData] = await Promise.all([
        getAlertasAsistencia(selectedHijoId || undefined),
        getJustificaciones(selectedHijoId || (hijos[0]?.id ?? '')),
        getIncidenciasAsistencia(selectedHijoId || undefined),
      ]);
      setAlertas(alertasData);
      setJustificaciones(justData);
      setIncidencias(incData);
    } catch (err) {
      console.error('Error cargando alertas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las alertas de asistencia');
    } finally {
      setLoading(false);
    }
  }, [selectedHijoId, hijos]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const handleResolverAlerta = async (alertaId: string) => {
    try {
      await resolverAlerta(alertaId);
      setAlertas((prev) =>
        prev.map((a) => (a.id === alertaId ? { ...a, estado: 'Regularizada' } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const alertasActivas = alertas.filter((a) => a.estado === 'Activa');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar las alertas"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
            SEGURIDAD ESCOLAR Y PUNTUALIDAD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
            Justificaciones y Alertas en Vivo
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Supervisión automática de tolerancia (15 min) y gestión de justificaciones de inasistencia.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<PlusSignIcon size={18} />}
        >
          Nueva Justificación
        </Button>
      </div>

      {/* BANNER DE ALERTA CRÍTICA: +15 MINUTOS SIN LLEGAR A CLASE */}
      {alertasActivas.length > 0 ? (
        <div className="bg-red-50/90 border-2 border-red-300 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertCircleIcon size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-red-600 text-white text-[11px] font-black uppercase rounded-full tracking-wider">
                    ALERTA EN VIVO · TOLERANCIA 15 MIN SUPERADA
                  </span>
                  <span className="text-xs text-red-700 font-bold font-mono">
                    {alertasActivas[0].fechaNotificacion}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-red-950 mt-1">
                  El alumno no llegó a clase tras 15 minutos del horario de ingreso
                </h3>
                <p className="text-xs sm:text-sm text-red-800 leading-relaxed max-w-2xl mt-1">
                  {alertasActivas[0].mensaje}
                </p>
              </div>
            </div>

            {/* Quick Actions for Parent */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <Button
                variant="danger"
                size="md"
                onClick={() => setIsModalOpen(true)}
                leftIcon={<PlusSignIcon size={16} />}
              >
                Justificar Ahora
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => handleResolverAlerta(alertasActivas[0].id)}
              >
                Ya está en camino
              </Button>
            </div>
          </div>

          {/* Details Bar of the Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-red-200/80 text-xs">
            <div className="p-2.5 bg-white/80 rounded-xl">
              <span className="text-[#6B7280] block font-medium">Estudiante Afectado:</span>
              <strong className="text-[#111827]">{alertasActivas[0].hijoNombre}</strong>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl">
              <span className="text-[#6B7280] block font-medium">Primera Clase:</span>
              <strong className="text-[#111827]">{alertasActivas[0].materia}</strong>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl">
              <span className="text-[#6B7280] block font-medium">Docente a Cargo:</span>
              <strong className="text-[#111827]">{alertasActivas[0].docente}</strong>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl">
              <span className="text-[#6B7280] block font-medium">Tiempo Transcurrido:</span>
              <strong className="text-red-700 font-black">
                {alertasActivas[0].minutosRetraso} minutos de retraso
              </strong>
            </div>
          </div>
        </div>
      ) : (
        /* Estado Normal: Sin alertas en vivo */
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
              <CheckmarkCircle02Icon size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111827]">
                Ingresos y Asistencia al Día
              </h4>
              <p className="text-xs text-[#6B7280]">
                No hay alertas activas de retraso o inasistencia sin marcar para hoy.
              </p>
            </div>
          </div>
          <Badge variant="success">Todo Conforme</Badge>
        </div>
      )}

      {/* METRICAS DE ASISTENCIA E INCIDENCIAS (Basadas en cary.pen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI Asistencia % */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Asistencia Mensual
              </span>
              <p className="text-2xl font-black text-[#15803D]">
                {selectedHijo ? `${selectedHijo.porcentajeAsistencia}%` : '95%'}
              </p>
              <p className="text-[11px] text-[#6B7280]">Conforme a cary.pen</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <CheckmarkCircle02Icon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* KPI Faltas % */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Faltas Acumuladas
              </span>
              <p className="text-2xl font-black text-[#BE123C]">
                {selectedHijo ? `${(100 - selectedHijo.porcentajeAsistencia).toFixed(1)}%` : '5%'}
              </p>
              <p className="text-[11px] text-[#6B7280]">Total días hábiles</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
              <Clock01Icon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* KPI Incidencias (Estilo badge cary.pen: 0 Incidencias / 1 Incidencia) */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Incidencias de Aula
              </span>
              <div className="mt-1">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black inline-block">
                  {selectedHijo?.incidenciasCount === 0
                    ? '0 Incidencias'
                    : `${selectedHijo?.incidenciasCount || 1} Incidencia`}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">Reportadas por tutores</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircleIcon size={24} />
            </div>
          </CardContent>
        </Card>

        {/* KPI Justificaciones Aprobadas */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Justificaciones
              </span>
              <p className="text-2xl font-black text-blue-700">
                {justificaciones.length} Trámites
              </p>
              <p className="text-[11px] text-[#6B7280]">Aprobadas por dirección</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Calendar01Icon size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'alertas', label: 'Alertas y Protocolo 15 Min', count: alertas.length },
          { id: 'justificaciones', label: 'Justificaciones Presentadas', count: justificaciones.length },
          { id: 'incidencias', label: 'Incidencias Escolares', count: incidencias.length },
        ]}
        activeTab={tabActiva}
        onChange={setTabActiva}
      />

      {/* CONTENIDO DE PESTAÑAS */}

      {/* Pestaña 1: Alertas y Protocolo */}
      {tabActiva === 'alertas' && (
        <div className="space-y-6">
          {/* Tarjeta explicativa de la regla de los 15 minutos */}
          <Card className="bg-slate-50 border border-[#E5E7EB]">
            <CardContent className="p-6">
              <h4 className="text-sm font-bold text-[#111827] mb-2 flex items-center gap-2">
                <span>⏱️</span> Protocolo Institucional de Retrasos y Faltas (15 Minutos)
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                El horario regular de inicio de clases matutino es a las <strong>08:00 AM</strong>.
                Los estudiantes cuentan con una tolerancia máxima de <strong>15 minutos</strong> (hasta las 08:15 AM).
                Transcurrido dicho periodo, si el alumno no registra lectura de su fotocheck o huella biométrica,
                el sistema emite automáticamente una notificación prioritaria a los apoderados para salvaguardar
                la integridad del menor e iniciar el proceso de justificación inmediata.
              </p>
            </CardContent>
          </Card>

          {/* Lista de Alertas */}
          <div className="space-y-4">
            {alertas.map((alr) => (
              <Card key={alr.id} className="hover:border-slate-300">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={alr.estado === 'Activa' ? 'danger' : 'neutral'}
                        size="sm"
                      >
                        {alr.estado === 'Activa' ? '⚠️ Alerta Activa' : '✓ Regularizada'}
                      </Badge>
                      <span className="text-xs font-bold text-[#111827]">
                        {alr.tipo} · {alr.hijoNombre}
                      </span>
                    </div>
                    <span className="text-xs text-[#6B7280] font-mono">
                      {alr.fechaNotificacion}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#111827] leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {alr.mensaje}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-4">
                      <span>Docente: <strong className="text-[#111827]">{alr.docente}</strong></span>
                      <span>Aula: <strong className="text-[#111827]">{alr.salon}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsModalOpen(true)}
                      >
                        Enviar Justificación
                      </Button>
                      <Link href="/padre/chat">
                        <Button variant="outline" size="sm">
                          Chat con Tutor
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pestaña 2: Justificaciones */}
      {tabActiva === 'justificaciones' && (
        <div className="space-y-4">
          {justificaciones.length === 0 ? (
            <EmptyState
              title="No hay justificaciones registradas"
              description="Cuando envíe una justificación médica o familiar, podrá hacer seguimiento a su aprobación aquí."
              actionText="Crear Justificación"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            justificaciones.map((just) => (
              <Card key={just.id}>
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          just.estado === 'Aprobada'
                            ? 'success'
                            : just.estado === 'Rechazada'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {just.estado}
                      </Badge>
                      <span className="text-xs font-bold text-[#111827]">
                        Inasistencia del {just.fechaInasistencia}
                      </span>
                      <span className="text-xs text-[#6B7280]">· Motivo: {just.motivo}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Enviado: {just.fechaEnvio}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#111827] bg-slate-50 p-4 rounded-xl border border-slate-200">
                    &quot;{just.descripcion}&quot;
                  </p>

                  {just.archivoAdjuntoNombre && (
                    <div className="flex items-center gap-2 text-xs text-[#BE123C] font-semibold">
                      <span>📎 Documento adjunto:</span>
                      <span className="underline font-mono text-[11px]">
                        {just.archivoAdjuntoNombre}
                      </span>
                    </div>
                  )}

                  {just.respuestaTutor && (
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                      <strong>Respuesta de Tutoría ({just.fechaRespuesta}):</strong> &quot;
                      {just.respuestaTutor}&quot;
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pestaña 3: Incidencias Escolares */}
      {tabActiva === 'incidencias' && (
        <div className="space-y-4">
          {incidencias.length === 0 ? (
            <EmptyState
              title="Sin incidencias registradas"
              description="El estudiante mantiene una conducta y puntualidad intachable."
            />
          ) : (
            incidencias.map((inc) => (
              <Card key={inc.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                        {inc.gravedad}
                      </span>
                      <h4 className="text-sm font-bold text-[#111827]">{inc.tipo}</h4>
                    </div>
                    <p className="text-xs text-[#6B7280]">{inc.descripcion}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Fecha: {inc.fecha}
                    </span>
                  </div>
                  <Badge variant={inc.estado === 'Resuelta' ? 'success' : 'warning'}>
                    {inc.estado}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal para Registrar Nueva Justificación */}
      <JustificacionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
