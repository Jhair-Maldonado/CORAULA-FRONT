'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';
import type { EvaluationResultsResponse } from '@/types/evaluationResultsApi';
import type { RegistrationPending, TeacherCourseRegistration } from '@/types/teacherCourseRegistrationApi';
import { teacherGradesService } from '@/services/teacher/teacherGradesService';
import {
  REGISTRATION_NOT_APPLICABLE_MESSAGE, registrationActionErrorMessage, registrationPendingsFromError, registrationPendingsFromResults,
  registrationReadErrorMessage, registrationReasonLabel, teacherCourseRegistrationErrorCode, teacherCourseRegistrationService,
} from '@/services/teacher/teacherCourseRegistrationService';

type Load = { key: string; registration?: TeacherCourseRegistration; error?: string; results?: EvaluationResultsResponse; resultsError?: boolean };
const button = 'min-h-10 px-3 py-2 rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';
const secondary = `${button} bg-white border border-line hover:bg-neutral`;
const primary = `${button} bg-accent text-white hover:bg-accent/90`;

function dateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(value));
}

// #106: the teacher registers the course-section for the bimester publication. Without a current
// registration the Director cannot publish (#111). The backend always decides; the UI never assumes success.
export default function RegistroCursoDocente({ sectionCourseId, bimester }: { sectionCourseId: number; bimester: Bimester }) {
  const bimesterId = bimester.id;
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  // Details of a 409 RESULTS_PENDING replace the pre-check until the teacher refreshes on purpose.
  const [authoritative, setAuthoritative] = useState<RegistrationPending[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lock = useRef(false);
  const key = String(revision);
  const loading = load?.key !== key;

  useEffect(() => {
    const abort = new AbortController();
    Promise.allSettled([
      teacherCourseRegistrationService.get(sectionCourseId, bimesterId, abort.signal),
      teacherGradesService.getResults(sectionCourseId, bimesterId, abort.signal),
    ]).then(([registration, results]) => {
      if (abort.signal.aborted) return;
      if (registration.status === 'rejected') { setLoad({ key, error: registrationReadErrorMessage(registration.reason) }); return; }
      setLoad({ key, registration: registration.value, results: results.status === 'fulfilled' ? results.value : undefined, resultsError: results.status === 'rejected' });
    });
    return () => abort.abort();
  }, [sectionCourseId, bimesterId, key]);

  const registration = loading ? undefined : load?.registration;
  const canRegister = !!registration && registration.status === 'ABIERTO' && registration.applicable && !registration.registered;
  const precheck = load?.results ? registrationPendingsFromResults(load.results) : null;
  const pendings = authoritative ?? precheck;
  const studentName = (enrollmentId: number | null) => {
    if (enrollmentId === null) return 'Curso';
    return load?.results?.students.find(s => s.enrollmentId === enrollmentId)?.fullName ?? `Matrícula #${enrollmentId}`;
  };

  function refresh() {
    setAuthoritative(null); setNotice(null); setActionError(null); setRevision(n => n + 1);
  }

  async function register() {
    if (lock.current || !canRegister) return;
    lock.current = true; setSending(true); setNotice(null); setActionError(null);
    try {
      const view = await teacherCourseRegistrationService.register(sectionCourseId, bimesterId);
      setAuthoritative(null);
      setLoad(current => current && { ...current, key, registration: view, error: undefined });
      if (view.registered) setNotice('Curso registrado. Ya puede incluirse en la publicación del bimestre.');
      else if (view.applicable) setActionError('El servidor no confirmó el registro. Actualiza el estado e inténtalo de nuevo.');
    } catch (failure) {
      setActionError(registrationActionErrorMessage(failure));
      if (teacherCourseRegistrationErrorCode(failure) === 'RESULTS_PENDING') {
        const details = registrationPendingsFromError(failure);
        if (details) setAuthoritative(details);
      }
      setRevision(n => n + 1);
    } finally {
      lock.current = false; setSending(false); setConfirming(false);
    }
  }

  return (
    <section aria-labelledby={`registro-${bimesterId}`} className="p-5 bg-white border border-line rounded-xl flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`registro-${bimesterId}`} className="text-base font-bold text-ink">Registro del curso · {bimester.name}</h2>
        <button type="button" className={secondary} disabled={loading || sending} onClick={refresh}>Actualizar estado</button>
      </div>

      {loading ? <p role="status" className="text-muted">Consultando el registro del curso...</p>
        : load?.error ? <p role="alert" className="text-rose-700">{load.error}</p>
        : registration && <>
          <p className="text-muted">Bimestre: <strong className="text-ink">{bimesterStatusLabels[registration.status]}</strong>
            {registration.publishedAt && <> · Publicado el <time dateTime={registration.publishedAt}>{dateTime(registration.publishedAt)}</time></>}</p>

          {!registration.applicable ? <p role="status" className="text-muted">{REGISTRATION_NOT_APPLICABLE_MESSAGE}</p>
            : registration.registered && registration.registeredAt ? <p role="status" className="text-emerald-700 font-bold">
                Curso registrado el <time dateTime={registration.registeredAt}>{dateTime(registration.registeredAt)}</time>.
                <span className="block font-normal text-muted">Si modificas una nota mientras el bimestre siga Abierto, deberás registrarlo de nuevo.</span></p>
            : <p className="text-amber-700 font-bold">Curso sin registrar. Sin este registro el Director no puede publicar el bimestre.</p>}

          {registration.applicable && !registration.registered && (
            pendings === null ? (load?.resultsError && <p className="text-muted">No se pudieron revisar los pendientes; el registro los validará igualmente.</p>)
              : pendings.length === 0 ? (authoritative === null && <p className="text-muted">No se detectaron resultados pendientes.</p>)
              : <div>
                  <p className="font-bold text-ink">{authoritative ? 'Pendientes que impiden el registro:' : 'Pendientes detectados en los resultados:'}</p>
                  <ul aria-label="Pendientes del registro" className="mt-2 flex flex-col gap-1">
                    {pendings.map((p, index) => <li key={`${p.enrollmentId ?? 'curso'}-${index}`} className="text-rose-700">
                      <strong>{studentName(p.enrollmentId)}</strong>: {p.reasons.map(registrationReasonLabel).join('; ')}
                    </li>)}
                  </ul>
                </div>
          )}

          {canRegister && <div>
            <button type="button" className={primary} disabled={sending} onClick={() => { setNotice(null); setActionError(null); setConfirming(true); }}>
              {sending ? 'Registrando...' : 'Registrar curso'}
            </button>
          </div>}
        </>}

      {notice && <p role="status" className="text-emerald-700">{notice}</p>}
      {actionError && <p role="alert" className="text-rose-700">{actionError}</p>}

      <Modal isOpen={confirming} onClose={() => { if (!sending) setConfirming(false); }} title="Registrar curso">
        <div className="flex flex-col gap-4 text-sm">
          <p>Registrarás este curso para la publicación de <strong>{bimester.name}</strong>.</p>
          <p className="text-xs text-muted">El registro deja de estar vigente si después cambian las notas o la matrícula; en ese caso deberás registrarlo otra vez.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondary} disabled={sending} onClick={() => setConfirming(false)}>Cancelar</button>
            <button type="button" className={primary} disabled={sending} onClick={register}>{sending ? 'Registrando...' : 'Confirmar registro'}</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
