// src/components/ui/AvisoModuloSimulado.tsx
import React from 'react';
import { AlertCircleIcon } from 'hugeicons-react';
import { isMockDataEnabled } from '@/lib/mockMode';

interface AvisoModuloSimuladoProps {
  activo?: boolean;
  detalle?: string;
  className?: string;
}

export const AvisoModuloSimulado: React.FC<AvisoModuloSimuladoProps> = ({
  activo = isMockDataEnabled(),
  detalle = 'la información que ves es de demostración y no corresponde a tu cuenta.',
  className = '',
}) => {
  if (!activo) return null;

  return (
    <div
      role="status"
      className={`mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-2 ${className}`}
    >
      <AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />
      <p>
        <strong className="font-bold">Módulo en construcción:</strong> {detalle}
      </p>
    </div>
  );
};
