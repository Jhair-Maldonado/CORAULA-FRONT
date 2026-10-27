import VistaPlanillaSalonNotasDocente from '@/../feature/docente/vistas/notas/vistaPlanillaSalonNotasDocente';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocenteNotasSalonPage({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <main className="animate-in fade-in flex-1">
      <VistaPlanillaSalonNotasDocente sectionCourseId={resolvedParams.id} />
    </main>
  );
}
