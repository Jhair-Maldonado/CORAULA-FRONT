// src/components/padres/HijoCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HijoResumen } from '@/types/padre';
import { Task01Icon, Calendar01Icon, Clock01Icon } from 'hugeicons-react';

interface HijoCardProps {
  hijo: HijoResumen;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const HijoCard: React.FC<HijoCardProps> = ({
  hijo,
  isSelected = false,
  onSelect,
}) => {
  return (
    <Card
      hoverable
      className={`transition-all duration-200 ${
        isSelected ? 'ring-2 ring-[#BE123C] border-transparent shadow-md' : ''
      }`}
    >
      <div className="p-6">
        {/* Header Row: Avatar, Names, Level Badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-[#E5E7EB] shrink-0">
              {hijo.fotoUrl ? (
                <Image
                  src={hijo.fotoUrl}
                  alt={hijo.nombreCompleto}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-500">
                  {hijo.nombres.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#111827]">
                  {hijo.nombreCompleto}
                </h4>
                {isSelected && (
                  <Badge variant="accent" size="sm">
                    Activo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#6B7280]">
                {hijo.grado} Sección &quot;{hijo.seccion}&quot; · {hijo.nivel}
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Cód: {hijo.codigoEstudiante}
              </p>
            </div>
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
            {hijo.estado}
          </Badge>
        </div>

        {/* Tutor info */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-[#E5E7EB] flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Tutor de Aula
            </span>
            <p className="font-semibold text-[#111827]">{hijo.tutor}</p>
          </div>
          {hijo.tutorEmail && (
            <Link
              href={`/padre/chat`}
              className="text-[#BE123C] hover:underline font-bold text-xs"
            >
              Contactar
            </Link>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E5E7EB] text-center">
          <div className="p-2 bg-slate-50/70 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
              Promedio
            </span>
            <span className="text-base font-black text-[#111827]">
              {hijo.promedioGeneral.toFixed(1)}
            </span>
          </div>

          <div className="p-2 bg-slate-50/70 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
              Asistencia
            </span>
            <span className="text-base font-black text-[#15803D]">
              {hijo.porcentajeAsistencia}%
            </span>
          </div>

          <div className="p-2 bg-slate-50/70 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
              Pensión
            </span>
            <span
              className={`text-xs font-bold block mt-1 ${
                hijo.estadoPension === 'Al Día'
                  ? 'text-[#15803D]'
                  : 'text-[#BE123C]'
              }`}
            >
              {hijo.estadoPension}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between gap-2">
          {onSelect && !isSelected && (
            <Button variant="secondary" size="sm" onClick={onSelect}>
              Seleccionar
            </Button>
          )}

          <Link href={`/padre/hijos/${hijo.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Ficha Detallada
            </Button>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/padre/calificaciones"
              title="Ver calificaciones"
              className="p-2 rounded-xl text-slate-600 hover:text-[#BE123C] hover:bg-[#FFE4E6] transition-colors"
            >
              <Task01Icon size={18} />
            </Link>
            <Link
              href="/padre/asistencia"
              title="Ver asistencia"
              className="p-2 rounded-xl text-slate-600 hover:text-[#BE123C] hover:bg-[#FFE4E6] transition-colors"
            >
              <Calendar01Icon size={18} />
            </Link>
            <Link
              href="/padre/horario"
              title="Ver horario"
              className="p-2 rounded-xl text-slate-600 hover:text-[#BE123C] hover:bg-[#FFE4E6] transition-colors"
            >
              <Clock01Icon size={18} />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
};
