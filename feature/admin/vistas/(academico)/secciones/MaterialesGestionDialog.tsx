'use client';

import { useEffect, useRef, useState } from 'react';
import ElementoMaterial from '@/components/materials/ElementoMaterial';
import { DOWNLOAD_POPUP_BLOCKED_MESSAGE, deliverToPendingTab, openPendingDownloadTab } from '@/lib/classMaterialsContract';
import {
  MANAGEMENT_MATERIALS_EMPTY_MESSAGE, managementMaterialsErrorMessage, managementMaterialsRequireReload, managementMaterialsService,
} from '@/services/admin/managementMaterialsService';
import type { ClassMaterial } from '@/types/teacherMaterialsApi';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import { Failure, SectionDialog, SectionEmpty, SectionLoading, secondaryButtonClass } from './sectionUi';

type Load = { key: string; data?: ClassMaterial[]; error?: string };

// Class materials of a course-section for management (BACK #53). Read-only for ADMINISTRADOR and DIRECTIVO:
// no publishing or withdrawal. Only published materials can be downloaded.
export default function MaterialesGestionDialog({ relation, sectionLabel, onClose }: {
  relation: SectionCourseResponse; sectionLabel: string; onClose: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [load, setLoad] = useState<Load>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const key = String(revision);
  const loading = load?.key !== key;
  const materials = loading ? undefined : load?.data;

  useEffect(() => {
    const abort = new AbortController();
    managementMaterialsService.list(relation.id, abort.signal)
      .then(data => { if (!abort.signal.aborted) setLoad({ key, data }); })
      .catch(failure => { if (!abort.signal.aborted) setLoad({ key, error: managementMaterialsErrorMessage(failure, 'list') }); });
    return () => abort.abort();
  }, [relation.id, key]);

  const reload = () => setRevision(n => n + 1);

  // The tab opens synchronously inside the click (pop-up blockers) and receives the signed URL when it arrives.
  // The URL lives only in this closure: it is not stored in state, shown or logged.
  function download(material: ClassMaterial) {
    if (lock.current) return;
    const tab = openPendingDownloadTab();
    if (!tab) { setError(DOWNLOAD_POPUP_BLOCKED_MESSAGE); return; }
    lock.current = true; setBusy(true); setError(null);
    deliverToPendingTab(tab, () => managementMaterialsService.downloadUrl(relation.id, material.id))
      .catch(failure => {
        setError(managementMaterialsErrorMessage(failure, 'download'));
        if (managementMaterialsRequireReload(failure)) reload();
      })
      .finally(() => { lock.current = false; setBusy(false); });
  }

  return <SectionDialog title="Materiales del curso" busy={false} onClose={onClose}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold break-words">{relation.courseName}</p>
          <p className="text-xs text-muted">{sectionLabel}</p>
          <p className="text-xs text-muted mt-1">Consulta de materiales publicados y retirados. La publicación y el retiro los realiza el docente.</p>
        </div>
        <button type="button" className={secondaryButtonClass} disabled={loading || busy} onClick={reload}>Actualizar materiales</button>
      </div>
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">{error}</p>}
      {loading ? <SectionLoading>Cargando materiales...</SectionLoading>
        : load?.error ? <Failure message={load.error} retry={reload} />
        : !materials?.length ? <SectionEmpty title="Sin materiales">{MANAGEMENT_MATERIALS_EMPTY_MESSAGE}</SectionEmpty>
        : <ul className="flex flex-col gap-2" aria-label="Materiales del curso">
          {materials.map(m => <ElementoMaterial key={m.id} material={m} actions={m.status === 'PUBLICADO' &&
            <button type="button" aria-label={`Descargar ${m.title}`} className={secondaryButtonClass} disabled={busy} onClick={() => download(m)}>Descargar</button>} />)}
        </ul>}
      <div className="flex justify-end border-t border-line pt-4">
        <button type="button" className={secondaryButtonClass} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  </SectionDialog>;
}
