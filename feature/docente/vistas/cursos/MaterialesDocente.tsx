'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, FileText, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { ClassMaterial } from '@/types/teacherMaterialsApi';
import {
  DOWNLOAD_POPUP_BLOCKED_MESSAGE, MATERIAL_ACCEPT, MATERIAL_DESCRIPTION_MAX_LENGTH, MATERIAL_TITLE_MAX_LENGTH, MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH, isUncertainPublish,
  materialDescriptionError, materialFileError, materialTitleError, materialsRequireReload, openPendingDownloadTab, teacherMaterialsErrorMessage,
  teacherMaterialsService, withdrawalReasonError,
} from '@/services/teacher/teacherMaterialsService';

type Load = { key: string; data?: ClassMaterial[]; error?: string };
const input = 'w-full mt-1.5 p-2.5 rounded-lg border border-line bg-white text-ink focus-visible:outline-accent text-xs disabled:opacity-50';
const button = 'min-h-10 px-3 py-2 rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';
const secondary = `${button} bg-white border border-line hover:bg-neutral`;
const primary = `${button} bg-accent text-white hover:bg-accent/90`;
const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const formatLabel: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
};

// FRONT #52: class materials of the course-section (BACK #53). Published directly by the teacher; the backend
// decides every result. No local or simulated material is ever listed.
export default function MaterialesDocente({ sectionCourseId }: { sectionCourseId: number }) {
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A publish without a confirmed answer: another one could duplicate it until the teacher reviews the list.
  const [uncertain, setUncertain] = useState(false);
  const [withdrawing, setWithdrawing] = useState<ClassMaterial | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const lock = useRef(false);
  const key = String(revision);
  const loading = load?.key !== key;
  const materials = loading ? undefined : load?.data;
  const formError = materialTitleError(title) ?? materialDescriptionError(description) ?? fileError ?? (file ? null : 'Selecciona un archivo.');

  useEffect(() => {
    const abort = new AbortController();
    teacherMaterialsService.list(sectionCourseId, abort.signal)
      .then(data => { if (!abort.signal.aborted) setLoad({ key, data }); })
      .catch(failure => { if (!abort.signal.aborted) setLoad({ key, error: teacherMaterialsErrorMessage(failure, 'list') }); });
    return () => abort.abort();
  }, [sectionCourseId, key]);

  const reload = () => setRevision(n => n + 1);

  function chooseFile(selected: File | null) {
    setNotice(null);
    setFile(selected);
    setFileError(selected ? materialFileError(selected) : null);
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice(null); setError(null);
    try { await action(); } finally { lock.current = false; setBusy(false); }
  }

  const publish = () => run(async () => {
    if (uncertain || formError || !file) return;
    try {
      const saved = await teacherMaterialsService.publish(sectionCourseId, { title, description, file });
      setLoad(current => current?.data ? { ...current, data: [saved, ...current.data.filter(m => m.id !== saved.id)] } : current);
      setTitle(''); setDescription(''); setFile(null); setFileError(null); setFileInput(n => n + 1);
      setNotice(`Material «${saved.title}» publicado. Ya está disponible para los alumnos del curso.`);
    } catch (failure) {
      setError(teacherMaterialsErrorMessage(failure, 'publish'));
      if (isUncertainPublish(failure)) { setUncertain(true); reload(); }
      else if (materialsRequireReload(failure)) reload();
    }
  });

  // The tab opens synchronously inside the click (pop-up blockers) and receives the signed URL when it arrives.
  // The URL lives only in this closure: it is not stored in state, shown or logged.
  function download(material: ClassMaterial) {
    if (lock.current) return;
    const tab = openPendingDownloadTab();
    if (!tab) { setNotice(null); setError(DOWNLOAD_POPUP_BLOCKED_MESSAGE); return; }
    void run(async () => {
      try {
        // parseDownloadUrl rejects anything that is not an http/https URL.
        const { url } = await teacherMaterialsService.downloadUrl(sectionCourseId, material.id);
        tab.location.replace(url);
      } catch (failure) {
        tab.close();
        setError(teacherMaterialsErrorMessage(failure, 'download'));
        if (materialsRequireReload(failure)) reload();
      }
    });
  }

  const withdraw = () => run(async () => {
    if (!withdrawing) return;
    const invalid = withdrawalReasonError(reason);
    if (invalid) { setReasonError(invalid); return; }
    try {
      const saved = await teacherMaterialsService.withdraw(sectionCourseId, withdrawing.id, reason);
      setLoad(current => current?.data ? { ...current, data: current.data.map(m => m.id === saved.id ? saved : m) } : current);
      setWithdrawing(null); setReason(''); setReasonError(null);
      setNotice(`Material «${saved.title}» retirado. Los alumnos ya no pueden verlo.`);
    } catch (failure) {
      const message = teacherMaterialsErrorMessage(failure, 'withdraw');
      if (materialsRequireReload(failure)) { setWithdrawing(null); setError(message); reload(); }
      else setReasonError(message);
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <form aria-label="Publicar material de clase" noValidate className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); void publish(); }}>
        <fieldset disabled={busy || uncertain} className="flex flex-col gap-3 text-xs font-bold text-muted">
          <label>Título del material
            <input aria-label="Título del material" required maxLength={MATERIAL_TITLE_MAX_LENGTH} className={input} placeholder="Ej. Diapositivas - Módulo 2" value={title} onChange={e => { setNotice(null); setTitle(e.target.value); }} />
          </label>
          <label>Descripción (opcional)
            <textarea aria-label="Descripción del material" rows={3} maxLength={MATERIAL_DESCRIPTION_MAX_LENGTH} className={input} value={description} onChange={e => setDescription(e.target.value)} />
          </label>
          <div>
            <span className="text-xs font-bold text-muted">Archivo</span>
            <div className={`mt-1.5 flex justify-center px-4 pt-4 pb-5 border-2 border-dashed rounded-lg bg-white ${fileError ? 'border-rose-300' : 'border-line'}`}>
              <div className="space-y-1 text-center">
                <Upload className={`mx-auto h-7 w-7 ${fileError ? 'text-rose-500' : 'text-muted'}`} aria-hidden="true" />
                <label className="relative cursor-pointer rounded-md font-bold text-accent hover:underline">
                  <span>Seleccionar archivo</span>
                  <input key={fileInput} aria-label="Archivo del material" type="file" className="sr-only" accept={MATERIAL_ACCEPT} onChange={e => chooseFile(e.target.files?.[0] ?? null)} />
                </label>
                {file ? <p className="text-xs text-ink font-semibold truncate max-w-xs">{file.name} <span className="text-muted font-normal">({size(file.size)})</span></p>
                  : <p className="text-[11px] text-muted font-normal">PDF, Word (.docx) o PowerPoint (.pptx). Máximo 15 MB.</p>}
              </div>
            </div>
            {fileError && <p role="alert" className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />{fileError}</p>}
          </div>
        </fieldset>
        <p className="font-normal text-[11px] text-muted">El material se publica de inmediato para los alumnos del curso. Puedes retirarlo después indicando el motivo.</p>
        <button type="submit" disabled={busy || uncertain || !!formError} className={`${primary} w-full sm:w-auto`}>{busy ? 'Procesando...' : 'Publicar material'}</button>
      </form>

      {notice && <p role="status" className="text-xs font-medium text-emerald-700 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">{notice}</p>}
      {error && <p role="alert" className="text-xs font-medium text-rose-700 p-3 bg-rose-50 border border-rose-200 rounded-lg">{error}</p>}
      {uncertain && <div role="alert" className="p-3 bg-neutral/40 border border-line rounded-lg text-xs text-ink">
        <p>La publicación no está confirmada. Revisa el listado antes de enviar otra; repetirla podría duplicar el material.</p>
        <button type="button" disabled={busy || loading} className={`${secondary} mt-2`} onClick={() => { setUncertain(false); setError(null); }}>Revisé el listado; permitir otra publicación</button>
      </div>}

      <section aria-label="Materiales del curso" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
          <h4 className="text-xs font-bold text-ink">Materiales del curso</h4>
          <button type="button" className={secondary} disabled={busy || loading} onClick={reload}>Actualizar materiales</button>
        </div>
        {loading ? <p role="status" className="text-xs text-muted">Cargando materiales...</p>
          : load?.error ? <div role="alert" className="text-xs text-rose-700"><p>{load.error}</p><button type="button" className={`${secondary} mt-2`} onClick={reload}>Reintentar materiales</button></div>
          : !materials?.length ? <p className="text-xs text-muted">Este curso aún no tiene materiales publicados.</p>
          : <ul className="flex flex-col gap-2">
              {materials.map(m => <li key={m.id} className={`p-3 rounded-lg border text-xs ${m.status === 'RETIRADO' ? 'border-line bg-neutral/30' : 'border-line bg-white'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-sm text-ink break-words"><FileText size={14} aria-hidden="true" />{m.title}</p>
                    <p className="text-muted mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.status === 'RETIRADO' ? 'bg-neutral text-muted border-line' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{m.status === 'RETIRADO' ? 'Retirado' : 'Publicado'}</span>
                      {' '}{formatLabel[m.file.mimeType] ?? m.file.mimeType} · {size(m.file.sizeBytes)} · {m.authorTeacherName} · <time dateTime={m.publishedAt}>{dateTime.format(new Date(m.publishedAt))}</time>
                    </p>
                    <p className="text-[11px] text-muted font-mono mt-1 break-all">{m.file.originalName}</p>
                    {m.description && <p className="text-muted mt-1 whitespace-pre-line break-words">{m.description}</p>}
                    {m.status === 'RETIRADO' && <p className="mt-1 text-amber-800">Retirado{m.withdrawnAt && <> el <time dateTime={m.withdrawnAt}>{dateTime.format(new Date(m.withdrawnAt))}</time></>}. Motivo: {m.withdrawalReason}</p>}
                  </div>
                  {m.status === 'PUBLICADO' && <div className="flex gap-2 shrink-0">
                    <button type="button" aria-label={`Descargar ${m.title}`} className={secondary} disabled={busy} onClick={() => download(m)}>Descargar</button>
                    <button type="button" aria-label={`Retirar ${m.title}`} className={`${secondary} text-rose-700`} disabled={busy} onClick={() => { setWithdrawing(m); setReason(''); setReasonError(null); setNotice(null); setError(null); }}>Retirar</button>
                  </div>}
                </div>
              </li>)}
            </ul>}
      </section>

      {withdrawing && <Modal isOpen onClose={() => { if (!busy) setWithdrawing(null); }} title="Retirar material">
        <form aria-label="Retiro del material" noValidate className="flex flex-col gap-4 text-sm" onSubmit={e => { e.preventDefault(); void withdraw(); }}>
          <p>Retirarás <strong>{withdrawing.title}</strong>. Los alumnos dejarán de verlo y no se puede reactivar.</p>
          <label className="flex flex-col gap-1 font-bold text-ink">Motivo del retiro
            <textarea aria-label="Motivo del retiro" rows={3} maxLength={MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} className={input} />
            <span className="text-xs font-normal text-muted">{reason.trim().length}/{MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH}</span>
          </label>
          {reasonError && <p role="alert" className="text-rose-700">{reasonError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={secondary} disabled={busy} onClick={() => setWithdrawing(null)}>Cancelar</button>
            <button type="submit" className={`${button} bg-rose-700 text-white hover:bg-rose-800`} disabled={busy}>{busy ? 'Retirando...' : 'Confirmar retiro'}</button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
