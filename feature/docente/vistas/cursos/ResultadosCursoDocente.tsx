'use client';

import { useCallback, useEffect, useState } from 'react';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import ResultadosBimestre from '@/components/evaluation/ResultadosBimestre';

type Result = { key: string; data?: Bimester[]; error?: string };
const button = 'min-h-10 px-3 py-2 rounded-lg border border-line bg-white text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent';

// #45 course-detail section: bimester selector plus the read-only results table.
export default function ResultadosCursoDocente({ sectionCourseId }: { sectionCourseId: number }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState('');
  const key = String(revision);
  const loading = result?.key !== key;
  const bimesters = loading ? undefined : result?.data;
  const bimester = bimesters?.find(b => String(b.id) === selected && b.status !== 'ANULADO');

  useEffect(() => {
    const abort = new AbortController();
    teacherGradesService.getBimesters(sectionCourseId, abort.signal)
      .then(data => {
        if (abort.signal.aborted) return;
        setResult({ key, data });
        const current = data.find(b => b.status === 'ABIERTO') ?? data.find(b => b.status !== 'ANULADO');
        setSelected(current ? String(current.id) : '');
      })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: teacherGradesErrorMessage(error) }); });
    return () => abort.abort();
  }, [sectionCourseId, key]);

  const bimesterId = bimester?.id;
  const load = useCallback((signal: AbortSignal) => {
    if (!bimesterId) return Promise.reject(new Error('Selecciona un bimestre.'));
    return teacherGradesService.getResults(sectionCourseId, bimesterId, signal);
  }, [sectionCourseId, bimesterId]);

  return (
    <div className="flex flex-col gap-3">
      {loading ? <p role="status" className="p-5 bg-white border border-line rounded-xl text-sm text-muted">Cargando bimestres de resultados...</p>
        : result?.error ? <div role="alert" className="p-5 bg-white border border-line rounded-xl text-sm text-rose-700"><p>{result.error}</p><button type="button" className={`${button} mt-3`} onClick={() => setRevision(n => n + 1)}>Reintentar bimestres</button></div>
        : !bimesters?.some(b => b.status !== 'ANULADO') ? <p className="p-5 bg-white border border-line rounded-xl text-sm text-muted">No hay bimestres disponibles para consultar resultados.</p>
        : <label className="flex items-center gap-2 w-fit text-xs font-bold text-ink bg-white px-3 py-2 rounded-lg border border-line">
            <span className="text-muted font-medium">Bimestre de resultados:</span>
            <select aria-label="Bimestre de resultados" value={selected} onChange={e => setSelected(e.target.value)} className="bg-transparent font-bold text-xs text-ink focus-visible:outline-accent cursor-pointer py-1">
              <option value="">Selecciona un bimestre</option>
              {bimesters.map(b => <option key={b.id} value={b.id} disabled={b.status === 'ANULADO'}>{b.name} · {bimesterStatusLabels[b.status]}</option>)}
            </select>
          </label>}
      {bimester && <ResultadosBimestre key={bimester.id} load={load} />}
    </div>
  );
}
