'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VistaAsistenciaDocente from '../../../../feature/docente/vistas/asistencia/vistaAsistenciaDocente';

/** Lee `?curso=<sectionCourseId>&fecha=YYYY-MM-DD` (enlace «Tomar lista» del inicio). La vista valida ambos valores. */
function AsistenciaConParametros() {
  const params = useSearchParams();
  const curso = Number(params.get('curso'));
  return <VistaAsistenciaDocente initialCourseId={Number.isInteger(curso) && curso > 0 ? curso : undefined} initialDate={params.get('fecha') ?? undefined} />;
}

export default function DocenteAsistenciaPage() {
  return <Suspense fallback={<p role="status" className="text-sm text-muted">Cargando asistencia...</p>}><AsistenciaConParametros /></Suspense>;
}
