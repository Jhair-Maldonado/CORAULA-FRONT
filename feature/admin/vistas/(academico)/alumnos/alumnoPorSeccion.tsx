'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionErrorStatus } from '@/services/admin/sectionErrors';
import { studentErrorMessage } from '@/services/admin/studentsService';
import type { SectionResponse } from '@/types/sectionApi';
import { Failure, SectionLoading, secondaryButtonClass } from '../secciones/sectionUi';
import { StudentsGrid } from './components/StudentsGrid';

type SectionResult = { revision: number; data?: SectionResponse; error?: string; notFound?: boolean };

export default function AlumnoPorSeccion({ sectionId }: { sectionId: string }) {
  const valid = /^\d+$/.test(sectionId) && Number.isSafeInteger(Number(sectionId)) && Number(sectionId) > 0;
  return <div className="p-6 h-full overflow-y-auto bg-canvas font-sans text-ink">
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <Link href="/administrador/alumnos" className={secondaryButtonClass + ' w-fit'}>Regresar al panel general</Link>
      {valid ? <SectionStudents key={sectionId} sectionId={sectionId} /> : <h1 className="text-xl font-bold">Sección no válida</h1>}
    </div>
  </div>;
}

function SectionStudents({ sectionId }: { sectionId: string }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<SectionResult>();
  const loading = result?.revision !== revision;

  useEffect(() => {
    let current = true;
    sectionsService.getById(sectionId)
      .then(data => { if (current) setResult({ revision, data }); })
      .catch(error => {
        if (current) setResult({ revision, notFound: sectionErrorStatus(error) === 404, error: studentErrorMessage(error) });
      });
    return () => { current = false; };
  }, [sectionId, revision]);

  if (loading) return <SectionLoading>Cargando sección...</SectionLoading>;
  if (result?.notFound) return <><h1 className="text-xl font-bold">Sección no encontrada</h1><p>La sección solicitada no existe.</p></>;
  if (result?.error) return <Failure message={result.error} retry={() => setRevision(n => n + 1)} />;
  return result?.data && <StudentsGrid section={result.data} />;
}
