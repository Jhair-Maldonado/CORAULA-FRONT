'use client';

import { usePathname } from 'next/navigation';
import { isMockDataEnabled } from '@/lib/mockMode';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';

export function PadreSimulationNotice() {
  const pathname = usePathname();
  const usesRealData = pathname === '/padre/hijos' || pathname === '/padre/asistencia';
  return (
    <AvisoModuloSimulado
      activo={!usesRealData || isMockDataEnabled()}
      detalle="la información que ves es de demostración y no corresponde a tus hijos vinculados."
    />
  );
}
