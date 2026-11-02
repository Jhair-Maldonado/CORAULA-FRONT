'use client';

// Tarjeta de un hijo vinculado según el contrato de GET /v1/guardian/students: studentCode, grade y
// sectionName pueden ser null; sin periodo fijo ni id interno.
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Alert02Icon,
  AlertCircleIcon,
  BookOpen01Icon,
  Calendar01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  IdentityCardIcon,
  PencilEdit02Icon,
} from 'hugeicons-react';
import type { HijoResumen } from '@/types/padre';
import { formatGradoSeccion } from '@/components/padres/hijoFormat';

// Solo rutas existentes en src/app/padre/* (lo verifica tests/padreBase.test.tsx).
export const ACCESOS_HIJO = [
  { href: '/padre/asistencia', label: 'Asistencia', icon: Calendar01Icon },
  { href: '/padre/libreta', label: 'Libreta', icon: BookOpen01Icon },
  { href: '/padre/justificacion', label: 'Justificar inasistencia', icon: AlertCircleIcon },
  { href: '/padre/incidencias', label: 'Incidencias', icon: Alert02Icon },
] as const;

interface TarjetaHijoVinculadoProps {
  hijo: HijoResumen;
  seleccionado: boolean;
  onSeleccionar: () => void;
  /** Solo en modo demostración: no existe endpoint para que el apoderado edite la ficha. */
  onEditar?: () => void;
}

function iniciales(nombre: string): string {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'ES';
}

export function TarjetaHijoVinculado({ hijo, seleccionado, onSeleccionar, onEditar }: TarjetaHijoVinculadoProps) {
  const [copiado, setCopiado] = useState(false);
  const codigo = hijo.codigoEstudiante?.trim() || '';

  const copiarCodigo = () => {
    if (!codigo || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(codigo).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      },
      () => setCopiado(false),
    );
  };

  return (
    <article
      aria-label={hijo.nombreCompleto}
      className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
        seleccionado ? 'border-accent/40 ring-2 ring-accent/10' : 'border-line hover:border-muted'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 overflow-hidden border ${
              seleccionado ? 'bg-rose-50 text-accent border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {hijo.fotoUrl ? (
              <img src={hijo.fotoUrl} alt={hijo.nombreCompleto} className="w-full h-full object-cover" />
            ) : (
              iniciales(hijo.nombreCompleto)
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-ink tracking-tight truncate">{hijo.nombreCompleto}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {codigo ? (
                <button
                  type="button"
                  onClick={copiarCodigo}
                  title="Copiar código de estudiante"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-muted bg-neutral hover:bg-line/40 px-2 py-0.5 rounded-md border border-line transition-colors"
                >
                  <IdentityCardIcon size={12} aria-hidden="true" />
                  <span>{codigo}</span>
                  {copiado ? <CheckmarkCircle01Icon size={12} className="text-success-ink" /> : <Copy01Icon size={12} aria-hidden="true" />}
                </button>
              ) : (
                <span className="text-[11px] font-bold text-muted">Sin código</span>
              )}
              <span className="text-[11px] font-bold text-muted">{formatGradoSeccion(hijo)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckmarkBadge01Icon size={14} aria-hidden="true" />
            <span>Vínculo activo</span>
          </span>
          <button
            type="button"
            onClick={onSeleccionar}
            aria-pressed={seleccionado}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              seleccionado ? 'bg-accent text-white border-accent' : 'bg-neutral text-ink border-line hover:bg-line/40'
            }`}
          >
            {seleccionado ? 'Seleccionado' : 'Seleccionar'}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-line/60">
        <div className="bg-neutral/60 p-3 rounded-xl border border-line/60">
          <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">Grado</dt>
          <dd className="text-xs sm:text-sm font-black text-ink mt-0.5">{hijo.grado?.trim() || 'Sin datos'}</dd>
        </div>
        <div className="bg-neutral/60 p-3 rounded-xl border border-line/60">
          <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">Sección</dt>
          <dd className="text-xs sm:text-sm font-black text-ink mt-0.5">{hijo.seccion?.trim() || 'Sin datos'}</dd>
        </div>
        <div className="bg-neutral/60 p-3 rounded-xl border border-line/60">
          <dt className="text-[10px] font-bold text-muted uppercase tracking-wider">Código de estudiante</dt>
          <dd className="text-xs sm:text-sm font-mono font-bold text-ink mt-0.5">{codigo || 'Sin datos'}</dd>
        </div>
      </dl>

      <div className="pt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-muted mr-1">Consultar:</span>
        {ACCESOS_HIJO.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onSeleccionar}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-ink bg-neutral hover:bg-line/40 border border-line transition-colors"
          >
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-neutral text-ink border border-line hover:bg-line/40 transition-colors"
          >
            <PencilEdit02Icon size={14} /> Editar Ficha
          </button>
        )}
      </div>
    </article>
  );
}
