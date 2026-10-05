'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea } from 'recharts';
import Link from 'next/link';
import { getResumenDashboardAlumno } from '@/lib/api';
import { ResumenDashboardAlumno } from '@/types/alumno';
import { AlumnoHeader } from '@/components/alumno/AlumnoHeader';
import { AlumnoFilterBar } from '@/components/alumno/AlumnoFilterBar';
import { CardSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Award, CalendarCheck, CheckCircle2, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { KpiCard } from './component/kpiCard';

export default function VistaPrincipalAlumno() {
  const [data, setData] = useState<ResumenDashboardAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getResumenDashboardAlumno();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el resumen del alumno');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="No pudimos cargar tu resumen académico"
        message={error || 'Hubo un inconveniente al conectar con el servidor.'}
        onRetry={fetchData}
      />
    );
  }

  const { perfil, kpis, cursos, proximasActividades } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <AlumnoHeader
        title="Resumen Académico"
        subtitle={`Bienvenido a tu ciclo escolar · ${perfil.grado} Sección ${perfil.seccion}`}
        actionRight={
          <div className="bg-[#111827] text-white px-4 py-2 rounded-xl flex items-center justify-center font-bold shadow-sm">
            Año Académico {perfil.anioLectivo}
          </div>
        }
      />

      {/* Filter / Context Bar */}
      <AlumnoFilterBar
        filters={[
          { label: 'Estudiante', value: `${perfil.nombreCompleto} ▾` },
          { label: 'Año Académico', value: `${perfil.anioLectivo} · Regular ▾` }
        ]}
        badgeText={perfil.estadoMatricula}
        badgeVariant="success"
      />

      {/* 4 KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Promedio Ponderado"
          value={`${kpis.promedioPonderado.toFixed(1)} / 20`}
          subtitle={<span className="text-[11px] font-bold text-[#15803D]">+0.5 vs. ciclo previo</span>}
          icon={Award}
          iconBgColor="bg-[#FFE4E6]"
          iconColor="text-[#BE123C]"
          valueColor="text-[#BE123C]"
        />
        <KpiCard
          title="Asistencia General"
          value={`${kpis.asistenciaGeneral}%`}
          subtitle={<span className="text-[11px] font-medium text-[#6B7280]">0 inasistencias injustificadas</span>}
          icon={CalendarCheck}
          iconBgColor="bg-emerald-50"
          iconColor="text-[#15803D]"
        />
        <KpiCard
          title="Tareas Completadas"
          value={`${kpis.tareasCompletadas} de ${kpis.tareasTotales}`}
          subtitle={<span className="text-[11px] font-bold text-[#A16207]">2 pendientes esta semana</span>}
          icon={CheckCircle2}
          iconBgColor="bg-amber-50"
          iconColor="text-[#A16207]"
        />
        <KpiCard
          title="Cursos Inscritos"
          value={`${kpis.cursosInscritos} Cursos`}
          subtitle={<span className="text-[11px] font-bold text-[#15803D]">Todos en estado regular</span>}
          icon={BookOpen}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Courses Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Estado General de Asignaturas
              </h3>
              <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
                Cursos matriculados en {perfil.grado} · Sección {perfil.seccion}
              </p>
            </div>
            <Link
              href="/alumno/calificaciones"
              className="text-xs font-bold text-[#BE123C] hover:underline flex items-center gap-1"
            >
              Ver detalle <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-[250px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cursos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="curso" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 20]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#111827] text-white text-xs p-3 rounded-lg shadow-lg border border-gray-700">
                          <p className="font-bold mb-1">{data.curso}</p>
                          <p className="text-gray-300">Promedio: <span className={data.promedio >= 12 ? "text-emerald-400 font-black" : "text-[#FECDD3] font-black"}>{data.promedio.toFixed(1)}</span></p>
                          <p className="text-gray-300">Estado: <span className={data.promedio >= 12 ? "text-emerald-400 font-bold" : "text-[#FECDD3] font-bold"}>{data.promedio >= 12 ? 'Aprobado' : 'Desaprobado'}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceArea y1={0} y2={12} fill="#FFE4E6" fillOpacity={0.5} />
                <ReferenceLine y={12} stroke="#BE123C" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Mínimo: 12', fill: '#BE123C', fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="promedio" stroke="#111827" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Next Activities (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E5E7EB] p-5 sm:p-6 shadow-xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">
              Próximas Evaluaciones
            </h3>
            <span className="text-[11px] text-[#6B7280]">Esta semana</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {proximasActividades.map((act) => (
              <div
                key={act.id}
                className={`p-3 rounded-lg border transition-all ${
                  act.urgente
                    ? 'bg-[#FFE4E6] border-[#FECDD3]'
                    : 'bg-slate-50/70 border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                      act.urgente ? 'text-[#BE123C]' : 'text-[#111827]'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {act.fechaLimite}
                  </span>
                  {act.urgente && (
                    <Badge variant="accent" size="sm">
                      Prioritario
                    </Badge>
                  )}
                </div>
                <h4 className="text-[12px] font-bold text-[#111827] leading-snug">
                  {act.titulo}
                </h4>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  {act.curso} · {act.docente}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/alumno/horario"
            className="w-full mt-2 py-2 px-3 text-center text-xs font-bold text-[#BE123C] bg-[#FFE4E6]/50 hover:bg-[#FFE4E6] rounded-lg transition-colors"
          >
            Ver horario y calendario completo
          </Link>
        </div>
      </div>
    </div>
  );
}
