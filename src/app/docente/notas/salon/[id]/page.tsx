import { notFound } from 'next/navigation';
import VistaNotasDocente from '../../../../../../feature/docente/vistas/notas/vistaNotasDocente';

const positiveInteger = /^[1-9]\d*$/;

/** Planilla de un salón: `/docente/notas/salon/<sectionCourseId>?bimestre=<id>`. */
export default async function DocenteNotasSalonPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bimestre?: string | string[] }>;
}) {
  const { id } = await params;
  if (!positiveInteger.test(id)) notFound();
  const { bimestre } = await searchParams;
  const value = Array.isArray(bimestre) ? bimestre[0] : bimestre;
  return <VistaNotasDocente sectionCourseId={Number(id)} initialBimesterId={value && positiveInteger.test(value) ? value : undefined} />;
}
