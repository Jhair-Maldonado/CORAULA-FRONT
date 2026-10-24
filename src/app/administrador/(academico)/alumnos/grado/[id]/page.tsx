import AlumnoPorSeccion from '../../../../../../../feature/admin/vistas/(academico)/alumnos/alumnoPorSeccion';

export const metadata = {
  title: 'Alumnos por Sección - CORAULA',
};

export default async function SeccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AlumnoPorSeccion sectionId={id} />;
}
