// src/app/(padres)/padre/hijos/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getHijoById } from '@/lib/api';
import { HijoResumen } from '@/types/padre';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
} from '@/components/ui';
import {
  ArrowLeft01Icon,
  Task01Icon,
  Calendar01Icon,
  Clock01Icon,
  Comment01Icon,
  UserIcon,
  Shield01Icon,
  CallIcon,
  Mail01Icon,
} from 'hugeicons-react';

export default function FichaEstudiantePage() {
  const params = useParams();
  const id = params?.id as string;
  const [hijo, setHijo] = useState<HijoResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getHijoById(id);
        setHijo(data);
      } catch (err) {
        console.error('Error cargando ficha del estudiante:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!hijo) {
    return (
      <div className="py-12">
        <EmptyState
          title="Estudiante no encontrado"
          description="El identificador de estudiante no coincide con ningún alumno a su cargo."
          actionText="Volver a la lista de hijos"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Back button and breadcrumb */}
      <div>
        <Link
          href="/padre/hijos"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#111827] mb-3 transition-colors"
        >
          <ArrowLeft01Icon size={16} />
          Volver a Mis Hijos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
              FICHA DEL ESTUDIANTE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
              {hijo.nombreCompleto}
            </h1>
          </div>
          <Badge
            variant={
              hijo.estado === 'Activo'
                ? 'success'
                : hijo.estado === 'Suspendido'
                ? 'danger'
                : 'neutral'
            }
          >
            Estado: {hijo.estado}
          </Badge>
        </div>
      </div>

      {/* Profile Overview Banner */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-slate-100 border-2 border-[#E5E7EB] shrink-0 shadow-xs">
              {hijo.fotoUrl ? (
                <Image
                  src={hijo.fotoUrl}
                  alt={hijo.nombreCompleto}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-3xl text-slate-400">
                  {hijo.nombres.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-xl font-black text-[#111827]">
                {hijo.nombreCompleto}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {hijo.grado} de {hijo.nivel} · Sección &quot;{hijo.seccion}&quot;
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">
                  DNI: {hijo.dni}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">
                  CÓDIGO: {hijo.codigoEstudiante}
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-[#BE123C] rounded-lg text-xs font-bold">
                  Promedio: {hijo.promedioGeneral.toFixed(1)} / 20
                </span>
              </div>
            </div>

            {/* Quick Links Group */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <Link href="/padre/calificaciones" className="w-full">
                <Button variant="outline" size="sm" className="w-full justify-start" leftIcon={<Task01Icon size={16} />}>
                  Calificaciones
                </Button>
              </Link>
              <Link href="/padre/asistencia" className="w-full">
                <Button variant="outline" size="sm" className="w-full justify-start" leftIcon={<Calendar01Icon size={16} />}>
                  Asistencia
                </Button>
              </Link>
              <Link href="/padre/horario" className="w-full">
                <Button variant="outline" size="sm" className="w-full justify-start" leftIcon={<Clock01Icon size={16} />}>
                  Horario
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Cards 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Datos Académicos y Tutor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <UserIcon size={20} />
              <CardTitle className="text-base">Información Académica y Tutor</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#6B7280] font-medium block">Nivel Escolar</span>
                <strong className="text-sm font-bold text-[#111827]">{hijo.nivel}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#6B7280] font-medium block">Grado y Sección</span>
                <strong className="text-sm font-bold text-[#111827]">{hijo.grado} &quot;{hijo.seccion}&quot;</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#6B7280] font-medium block">Fecha de Nacimiento</span>
                <strong className="text-sm font-bold text-[#111827]">{hijo.fechaNacimiento || 'No registrada'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[#6B7280] font-medium block">Estado de Matrícula</span>
                <strong className="text-sm font-bold text-[#15803D]">{hijo.estado} 2026</strong>
              </div>
            </div>

            {/* Tutor box */}
            <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-2xl space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#BE123C] block">
                DOCENTE TUTOR ASIGNADO
              </span>
              <p className="text-sm font-bold text-[#111827]">{hijo.tutor}</p>
              <div className="space-y-1.5 text-xs text-[#6B7280]">
                {hijo.tutorEmail && (
                  <p className="flex items-center gap-2">
                    <Mail01Icon size={14} className="text-[#BE123C]" />
                    <span>{hijo.tutorEmail}</span>
                  </p>
                )}
                {hijo.tutorTelefono && (
                  <p className="flex items-center gap-2">
                    <CallIcon size={14} className="text-[#BE123C]" />
                    <span>{hijo.tutorTelefono}</span>
                  </p>
                )}
              </div>
              <div className="pt-2">
                <Link href="/padre/chat">
                  <Button variant="secondary" size="sm" leftIcon={<Comment01Icon size={16} />}>
                    Abrir Chat con el Tutor
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Ficha Médica y Seguro Escolar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-800">
              <Shield01Icon size={20} />
              <CardTitle className="text-base">Ficha Médica y Seguro Escolar</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Grupo Sanguíneo</span>
              <p className="text-sm font-bold text-[#111827]">
                {hijo.tipoSangre || 'O Positivo (O+)'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Alergias o Restricciones Médicas</span>
              <p className="text-sm font-bold text-[#111827]">
                {hijo.alergias || 'Ninguna alergia registrada'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Seguro Médico Escolar Vigente</span>
              <p className="text-sm font-bold text-[#111827]">
                {hijo.seguroMedico || 'Póliza Institucional CORAULA'}
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Nota para los padres:</strong> Si el estudiante presenta alguna nueva indicación
              médica o requiere administración de medicamentos en horario escolar, favor de reportarlo
              directamente al departamento de enfermería y a su tutor.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
