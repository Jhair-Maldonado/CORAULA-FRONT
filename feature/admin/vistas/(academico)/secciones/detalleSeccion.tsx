'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { SectionResponse } from '@/types/sectionApi';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionCoursesService } from '@/services/admin/sectionCoursesService';
import { teachersService } from '@/services/admin/teachersService';
import { teacherAssignmentsService } from '@/services/admin/teacherAssignmentsService';
import { sectionErrorMessage, sectionErrorStatus } from '@/services/admin/sectionErrors';
import { buttonClass, Failure, SectionDialog, SectionIdentity, sectionName } from './sectionUi';
import ResourceSelector from './resourceSelector';

type Result<T> = { revision: number; data?: T; error?: string; notFound?: boolean };
type Action = { kind: 'add' } | { kind: 'assign' | 'unassign' | 'remove' | 'reactivate'; relation: SectionCourseResponse };

export default function DetalleSeccion() {
  const { sectionId } = useParams<{ sectionId: string }>();
  return <SectionDetail key={sectionId} sectionId={sectionId} />;
}

function SectionDetail({ sectionId }: { sectionId: string }) {
  const [sectionRevision, setSectionRevision] = useState(0);
  const [coursesRevision, setCoursesRevision] = useState(0);
  const [sectionResult, setSectionResult] = useState<Result<SectionResponse>>();
  const [coursesResult, setCoursesResult] = useState<Result<SectionCourseResponse[]>>();
  const [action, setAction] = useState<Action | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);
  const sectionLoading = sectionResult?.revision !== sectionRevision;
  const coursesLoading = coursesResult?.revision !== coursesRevision;
  const section = sectionLoading ? undefined : sectionResult?.data;
  const relations = coursesLoading ? undefined : coursesResult?.data;

  useEffect(() => {
    let current = true;
    sectionsService.getById(sectionId).then(data => { if (current) setSectionResult({ revision: sectionRevision, data }); })
      .catch(error => { if (current) setSectionResult({ revision: sectionRevision, error: sectionErrorMessage(error), notFound: sectionErrorStatus(error) === 404 }); });
    return () => { current = false; };
  }, [sectionId, sectionRevision]);

  useEffect(() => {
    let current = true;
    sectionCoursesService.list(sectionId).then(data => { if (current) setCoursesResult({ revision: coursesRevision, data }); })
      .catch(error => { if (current) setCoursesResult({ revision: coursesRevision, error: sectionErrorMessage(error) }); });
    return () => { current = false; };
  }, [sectionId, coursesRevision]);

  function open(next: Action) {
    if (mutation.current) return;
    setSelected(null);
    setActionError('');
    setNotice('');
    setAction(next);
  }

  async function submit() {
    if (!action || mutation.current) return;
    if ((action.kind === 'add' || action.kind === 'assign') && selected === null) return;
    mutation.current = true;
    setBusy(true);
    setActionError('');
    try {
      switch (action.kind) {
        case 'add':
          await sectionCoursesService.add(sectionId, selected!);
          setNotice('Curso asociado. Si la relación estaba inactiva, se reactivó sin restaurar docentes ni horarios anteriores.');
          break;
        case 'reactivate':
          await sectionCoursesService.add(sectionId, action.relation.courseId);
          setNotice('Curso reactivado. No se restauran automáticamente docentes ni horarios anteriores.');
          break;
        case 'remove':
          await sectionCoursesService.remove(sectionId, action.relation.id);
          setNotice('Curso retirado. La asignación docente activa y los horarios activos asociados se desactivaron; se conserva el historial.');
          break;
        case 'assign':
          await teacherAssignmentsService.assign(selected!, action.relation.id);
          setNotice('Docente asignado.');
          break;
        case 'unassign': {
          const teacherId = action.relation.teacherId;
          if (teacherId === null) throw new Error('No se pudo identificar al docente actual. Actualiza los cursos de la sección.');
          const teacher = await teachersService.getById(String(teacherId));
          const matches = teacher.assignments.filter(assignment => assignment.sectionCourseId === action.relation.id && assignment.active);
          if (matches.length !== 1 || matches[0].teacherId !== teacherId) {
            throw new Error('No se encontró una única asignación activa consistente para este docente y curso. No se retiró ninguna asignación. Cancela y actualiza los cursos de la sección.');
          }
          await teacherAssignmentsService.unassign(teacherId, matches[0].id);
          setNotice('Docente retirado de este curso de la sección.');
          break;
        }
      }
      setAction(null);
      setCoursesRevision(n => n + 1);
    } catch (error) {
      const adding = action.kind === 'add' || action.kind === 'reactivate';
      if (adding && sectionErrorStatus(error) === 409) {
        setActionError('El curso ya está asociado activamente a esta sección.');
      } else {
        setActionError(sectionErrorMessage(error, 'No se pudo asignar el docente: ya existe una asignación o un conflicto de horario. Actualiza los cursos y vuelve a intentar.'));
      }
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  const title = action?.kind === 'add' ? 'Agregar curso' : action?.kind === 'assign' ? 'Asignar docente' : action?.kind === 'unassign' ? 'Retirar docente' : action?.kind === 'remove' ? 'Retirar curso' : 'Reactivar curso';
  return <div className="p-6 overflow-y-auto h-full bg-canvas text-ink">
    <div className="max-w-7xl mx-auto flex flex-col gap-5">
      <Link className="text-sm text-accent font-bold w-fit" href="/administrador/secciones">← Regresar a secciones</Link>
      {sectionLoading ? <p role="status">Cargando sección...</p> : sectionResult?.error ? <>
        <h1 className="text-xl font-bold">{sectionResult.notFound ? 'Sección no encontrada' : 'No se pudo cargar la sección'}</h1>
        <Failure message={sectionResult.error} retry={() => setSectionRevision(n => n + 1)} />
      </> : section && <header className="p-5 bg-white rounded-xl border border-line">
        <h1 className="text-2xl font-bold mb-4">{sectionName(section.name)} • {section.grade}° grado</h1>
        <SectionIdentity section={section} />
      </header>}
      {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm">{notice}</p>}
      <section className="flex flex-col gap-4" aria-labelledby="section-courses-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="section-courses-title" className="text-lg font-bold">Cursos de la sección</h2>
          <div className="flex gap-2">
            <button className={buttonClass} disabled={busy || coursesLoading} onClick={() => setCoursesRevision(n => n + 1)}>Actualizar cursos</button>
            <button className={buttonClass} disabled={busy || !section} onClick={() => open({ kind: 'add' })}>Agregar curso</button>
          </div>
        </div>
        {coursesLoading ? <p role="status">Cargando cursos de la sección...</p> : coursesResult?.error ? <Failure message={coursesResult.error} retry={() => setCoursesRevision(n => n + 1)} /> : relations && (
          relations.length === 0 ? <p className="p-8 bg-white rounded-xl text-muted">Sin cursos asociados a esta sección.</p> :
            <div className="overflow-x-auto bg-white border border-line rounded-xl"><table className="w-full text-left text-sm">
              <thead className="bg-neutral text-xs"><tr>{['Código', 'Curso', 'Estado relación', 'Docente', 'Acciones'].map(label => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead>
              <tbody>{relations.map(relation => <tr key={relation.id} className={`border-t border-line ${relation.active ? '' : 'bg-neutral/40 text-muted'}`}>
                <td className="p-3">{relation.courseCode}</td><td className="p-3 font-bold">{relation.courseName}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${relation.active ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral text-muted'}`}>{relation.active ? 'Activa' : 'Inactiva'}</span></td>
                <td className="p-3">{relation.teacherId === null || relation.teacherName === null ? 'Sin docente asignado' : relation.teacherName}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  {relation.active ? <>
                    <button className={buttonClass} disabled={busy || !section} onClick={() => open({ kind: relation.teacherId === null ? 'assign' : 'unassign', relation })}>{relation.teacherId === null ? 'Asignar docente' : 'Retirar docente'}</button>
                    <button className={buttonClass} disabled={busy || !section} onClick={() => open({ kind: 'remove', relation })}>Retirar curso</button>
                  </> : <button className={buttonClass} disabled={busy || !section} onClick={() => open({ kind: 'reactivate', relation })}>Reactivar curso</button>}
                </div></td>
              </tr>)}</tbody>
            </table></div>
        )}
      </section>
      {action && section && <SectionDialog title={title} busy={busy} onClose={() => { if (!mutation.current) setAction(null); }}>
        <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
          {action.kind !== 'add' && <p className="font-bold text-sm">{action.relation.courseCode} • {action.relation.courseName}</p>}
          {(action.kind === 'add' || action.kind === 'assign') && <ResourceSelector kind={action.kind === 'add' ? 'course' : 'teacher'} level={section.level} busy={busy} selected={selected} onSelect={setSelected} />}
          {action.kind === 'add' && <p className="text-xs text-muted">Agregar una relación inactiva la reactiva, sin restaurar docentes ni horarios anteriores.</p>}
          {action.kind === 'remove' && <p className="text-sm">Al retirar este curso de la sección también se desactivará la asignación docente activa y cualquier bloque de horario activo asociado. Esta acción no elimina los registros históricos.</p>}
          {action.kind === 'reactivate' && <p className="text-sm">Reactivar el curso no restaura automáticamente docentes ni horarios anteriores.</p>}
          {action.kind === 'unassign' && <p className="text-sm">¿Deseas retirar a {action.relation.teacherName ?? 'este docente'} de este curso de la sección?</p>}
          {actionError && <Failure message={actionError} />}
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" className={buttonClass} disabled={busy} onClick={() => { if (!mutation.current) setAction(null); }}>Cancelar</button>
            <button className={`${buttonClass} bg-accent text-white`} disabled={busy || ((action.kind === 'add' || action.kind === 'assign') && selected === null)}>{busy ? 'Guardando...' : title}</button>
          </div>
        </form>
      </SectionDialog>}
    </div>
  </div>;
}
