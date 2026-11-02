'use client';

import { usePathname } from 'next/navigation';
import { rutaPadreMuestraAvisoSimulado } from '@/services/padres/guardianModules';
import { AvisoModuloSimulado } from '@/components/ui/AvisoModuloSimulado';

export function PadreSimulationNotice() {
  const pathname = usePathname();
  return (
    <AvisoModuloSimulado
      activo={rutaPadreMuestraAvisoSimulado(pathname)}
      detalle="la información que ves es de demostración y no corresponde a tus hijos vinculados."
    />
  );
}
