import VistaCatalogoNotasDocente from '../../../../feature/docente/vistas/notas/vistaCatalogoNotasDocente';

/** Catálogo de salones; `?bimestre=<id>` se conserva en los enlaces a la planilla. */
export default async function DocenteNotasPage({ searchParams }: { searchParams: Promise<{ bimestre?: string | string[] }> }) {
  const { bimestre } = await searchParams;
  const value = Array.isArray(bimestre) ? bimestre[0] : bimestre;
  return <VistaCatalogoNotasDocente bimestre={value && /^[1-9]\d*$/.test(value) ? value : undefined} />;
}
