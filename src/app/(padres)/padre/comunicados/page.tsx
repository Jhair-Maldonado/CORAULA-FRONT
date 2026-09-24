// src/app/(padres)/padre/comunicados/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getComunicados } from '@/services/padres/padreService';
import { ComunicadoPadre, TipoComunicado } from '@/types/padre';
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
import { ComunicadoModal } from '@/components/padres/ComunicadoModal';
import {
  Notification01Icon,
  Calendar01Icon,
  FileAttachmentIcon,
  Edit01Icon,
} from 'hugeicons-react';

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<ComunicadoPadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [modalComunicado, setModalComunicado] = useState<ComunicadoPadre | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getComunicados();
      setComunicados(data);
    } catch (err) {
      console.error('Error cargando comunicados:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los comunicados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
  }, [fetchData]);

  const filteredComunicados = comunicados.filter((c) => {
    if (filtroTipo === 'todos') return true;
    return c.tipo.toLowerCase() === filtroTipo.toLowerCase();
  });

  const noLeidosCount = comunicados.filter((c) => !c.leido).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="No pudimos cargar los comunicados"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#BE123C] bg-[#FFE4E6] px-2.5 py-1 rounded-full inline-block mb-1">
          CIRCULARES Y NOTIFICACIONES
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
          Comunicados Oficiales
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Avisos de dirección, coordinación académica y autorizaciones para salidas y eventos.
        </p>
      </div>

      {/* Tabs Filter */}
      <Tabs
        tabs={[
          { id: 'todos', label: 'Todos los Comunicados', count: comunicados.length },
          { id: 'urgente', label: 'Urgentes' },
          { id: 'evento', label: 'Eventos y Salidas' },
          { id: 'académico', label: 'Académicos' },
        ]}
        activeTab={filtroTipo}
        onChange={setFiltroTipo}
      />

      {/* List of Notices */}
      {filteredComunicados.length === 0 ? (
        <EmptyState
          title="No hay comunicados en esta categoría"
          description="Todos los avisos de esta sección se encuentran al día."
        />
      ) : (
        <div className="space-y-4">
          {filteredComunicados.map((item) => (
            <Card
              key={item.id}
              hoverable
              onClick={() => setModalComunicado(item)}
              className={`cursor-pointer transition-all duration-200 ${
                !item.leido ? 'border-l-4 border-l-[#BE123C]' : ''
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.tipo === 'Urgente'
                          ? 'danger'
                          : item.tipo === 'Evento'
                          ? 'accent'
                          : 'info'
                      }
                      size="sm"
                    >
                      {item.tipo}
                    </Badge>
                    {!item.leido && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#BE123C] text-white">
                        Nuevo
                      </span>
                    )}
                    {item.requiereFirma && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.firmado
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.firmado ? '✓ Autorización Firmada' : '✍ Requiere Firma Digital'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6B7280] font-mono flex items-center gap-1">
                    <Calendar01Icon size={14} />
                    {item.fecha}
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                    {item.titulo}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B7280] mt-1 line-clamp-2 leading-relaxed">
                    {item.resumen}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280]">
                  <span>
                    Emitido por: <strong className="text-[#111827]">{item.emisor}</strong> ({item.emisorCargo})
                  </span>

                  <div className="flex items-center gap-2">
                    {item.adjuntos && item.adjuntos.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <FileAttachmentIcon size={14} />
                        {item.adjuntos.length} adjunto(s)
                      </span>
                    )}
                    <span className="text-[#BE123C] font-bold text-xs hover:underline">
                      Leer comunicado &rarr;
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Lectura y Firma */}
      <ComunicadoModal
        isOpen={Boolean(modalComunicado)}
        onClose={() => setModalComunicado(null)}
        comunicado={modalComunicado}
        onSuccess={fetchData}
      />
    </div>
  );
}
