// src/app/(padres)/padre/asistencia/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { getAsistencia, getJustificaciones } from '@/services/padres/padreService';
import { RegistroAsistenciaDia, JustificacionInasistencia } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { JustificacionModal } from '@/components/padres/JustificacionModal';
import {
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  AlertCircleIcon,
  PlusSignIcon,
} from 'hugeicons-react';

export default function AsistenciaPage() {
  const { selectedHijo, selectedHijoId } = usePadre();
  const [registros, setRegistros] = useState<RegistroAsistenciaDia[]>([]);
  const [justificaciones, setJustificaciones] = useState<JustificacionInasistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mesFiltro, setMesFiltro] = useState('2026-04');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedHijoId) return;
    try {
      setLoading(true);
      setError(null);
      const [asistData, justData] = await Promise.all([
        getAsistencia(selectedHijoId, mesFiltro),
        getJustificaciones(selectedHijoId),
      ]);
      setRegistros(asistData);
      setJustificaciones(justData);
    } catch (err) {
      console.error('Error cargando asistencia:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los registros de asistencia');
    } finally {
      setLoading(false);
    }
  }, [selectedHijoId, mesFiltro]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const totalAsistencias = registros.filter((r) => r.estado === 'Presente').length;
  const totalTardanzas = registros.filter((r) => r.estado === 'Tardanza').length;
  const totalJustificadas = registros.filter((r) => r.estado === 'Falta Justificada').length;
  const totalInjustificadas = registros.filter((r) => r.estado === 'Falta Injustificada').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar los registros de asistencia"
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
          description="Seleccione a su hijo para revisar su control biométrico y asistencias."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
            CONTROL DE ASISTENCIA Y PUNTUALIDAD
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
            Asistencia y Justificaciones
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Registro diario de ingresos escolares de{' '}
            <strong className="text-[#111827]">{selectedHijo.nombreCompleto}</strong> ({selectedHijo.grado}).
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<PlusSignIcon size={18} />}
        >
          Justificar Inasistencia
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Asistencias
              </span>
              <p className="text-2xl font-black text-[#15803D]">{totalAsistencias} Días</p>
              <p className="text-[11px] text-[#6B7280]">Puntuales a la hora</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <CheckmarkCircle02Icon size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Tardanzas
              </span>
              <p className="text-2xl font-black text-[#A16207]">{totalTardanzas}</p>
              <p className="text-[11px] text-[#6B7280]">Ingresos posteriores a 08:00</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#A16207] flex items-center justify-center shrink-0">
              <Clock01Icon size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Faltas Justificadas
              </span>
              <p className="text-2xl font-black text-blue-700">{totalJustificadas}</p>
              <p className="text-[11px] text-[#6B7280]">Validadas por coordinación</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Calendar01Icon size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                Sin Justificar
              </span>
              <p className="text-2xl font-black text-[#BE123C]">{totalInjustificadas}</p>
              <p className="text-[11px] text-[#6B7280]">Pendientes de descargo</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#BE123C] flex items-center justify-center shrink-0">
              <AlertCircleIcon size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Records Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>Registro Diario de Asistencia</CardTitle>
            <CardDescription>
              Marcaciones biométricas registradas en los molinetes de entrada
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280] font-semibold">Filtrar Mes:</span>
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="bg-slate-100 text-xs font-bold text-[#111827] px-3 py-1.5 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#BE123C]"
            >
              <option value="2026-04">Abril 2026</option>
              <option value="2026-03">Marzo 2026</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {registros.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No hay registros en este mes"
                description="No se han registrado asistencias en el periodo seleccionado."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#6B7280] font-bold border-y border-[#E5E7EB]">
                <tr>
                  <th className="py-3 px-5">Fecha</th>
                  <th className="py-3 px-5">Día</th>
                  <th className="py-3 px-5">Hora Ingreso</th>
                  <th className="py-3 px-5">Estado</th>
                  <th className="py-3 px-5">Observación / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {registros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-[#111827]">
                      {reg.fecha}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-700">
                      {reg.diaSemana}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-slate-600">
                      {reg.horaLlegada || '---'}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge
                        variant={
                          reg.estado === 'Presente'
                            ? 'success'
                            : reg.estado === 'Tardanza'
                            ? 'warning'
                            : reg.estado === 'Falta Justificada'
                            ? 'info'
                            : 'danger'
                        }
                      >
                        {reg.estado}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-[#6B7280]">
                      {reg.observacion || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Sent Justifications History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Justificaciones Enviadas</CardTitle>
          <CardDescription>
            Estado de las solicitudes de justificación presentadas ante el colegio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {justificaciones.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-4 text-center">
              No cuenta con justificaciones enviadas recientemente.
            </p>
          ) : (
            <div className="space-y-4">
              {justificaciones.map((just) => (
                <div
                  key={just.id}
                  className="p-4 bg-slate-50 border border-[#E5E7EB] rounded-2xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                        Falta del {just.fechaInasistencia}
                      </span>
                      <span className="text-xs text-[#6B7280]">· Motivo: {just.motivo}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Enviado: {just.fechaEnvio}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                    &quot;{just.descripcion}&quot;
                  </p>

                  {just.respuestaTutor && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                      <strong>Respuesta de Tutoría ({just.fechaRespuesta}):</strong> &quot;
                      {just.respuestaTutor}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Justificación */}
      <JustificacionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
