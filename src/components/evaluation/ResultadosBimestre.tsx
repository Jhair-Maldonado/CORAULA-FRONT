'use client';

import { useEffect, useState } from 'react';
import type { EvaluationResultRow, EvaluationResultsResponse } from '@/types/evaluationResultsApi';
import { evaluationResultReasonLabel, evaluationResultsErrorMessage } from '@/lib/evaluationResultsContract';

type Load = (signal: AbortSignal) => Promise<EvaluationResultsResponse>;
type Result = { load: Load; key: string; data?: EvaluationResultsResponse; error?: string };

const button = 'min-h-10 px-3 py-2 rounded-lg border border-line bg-white text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';

// Read-only #45 results. `load` must be memoized per context; `reloadKey` changes
// after a grade mutation so the table is read again from the backend sources.
export default function ResultadosBimestre({ load, reloadKey = '', criterionName }: { load: Load; reloadKey?: string | number; criterionName?: (criterionId: number) => string | undefined }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = JSON.stringify([reloadKey, revision]);
  const loading = result?.load !== load || result.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    const abort = new AbortController();
    load(abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ load, key, data }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ load, key, error: evaluationResultsErrorMessage(error) }); });
    return () => abort.abort();
  }, [load, key]);

  return (
    <section aria-labelledby="bimester-results-title" className="bg-white p-5 sm:p-6 rounded-xl border border-line shadow-sm flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="bimester-results-title" className="text-base font-bold text-ink">Resultados del bimestre</h2>
          <p className="text-xs text-muted mt-0.5">Solo lectura. Aprobado con nota del curso de 11 o más.</p>
        </div>
        <button type="button" className={button} disabled={loading} onClick={() => setRevision(n => n + 1)}>Actualizar resultados</button>
      </div>
      <p role="note" className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">Calculado, aún no publicado. La publicación de resultados es un paso posterior.</p>
      {loading ? <p role="status" className="text-sm text-muted">Cargando resultados...</p>
        : error ? <div role="alert" className="text-sm text-rose-700"><p>{error}</p><button type="button" className={`${button} mt-3`} onClick={() => setRevision(n => n + 1)}>Reintentar resultados</button></div>
        : data && (data.students.length === 0 ? <p className="text-sm text-muted">No hay estudiantes con matrícula activa.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-neutral/40 text-muted uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="p-3">Estudiante</th>
                  <th scope="col" className="p-3 text-center">PA</th>
                  <th scope="col" className="p-3 text-center">Indicador MANUAL</th>
                  <th scope="col" className="p-3 text-center">Nota del curso</th>
                  <th scope="col" className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.students.map(row => <ResultRow key={row.enrollmentId} row={row} criterionName={criterionName} />)}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}

function ResultRow({ row, criterionName }: { row: EvaluationResultRow; criterionName?: (criterionId: number) => string | undefined }) {
  // Only course-level reasons explain a missing course grade; the area is outside this table.
  const reasons = row.courseGrade === null ? row.reasons.filter(r => r !== 'AREA_INCOMPLETE') : [];
  return (
    <tr>
      <th scope="row" className="p-3 font-bold text-ink">{row.fullName}</th>
      <td className="p-3 text-center">{row.pa === null ? <span className="text-muted">Sin PA</span> : row.pa.toFixed(1)}</td>
      <td className="p-3 text-center" title="Promedio informativo de los criterios MANUAL">{row.criteriaIndicator === null ? <span className="text-muted">—</span> : row.criteriaIndicator.toFixed(2)}</td>
      <td className="p-3 text-center font-extrabold">{row.courseGrade === null ? <span className="text-muted font-normal">Sin nota</span> : row.courseGrade.toFixed(0)}</td>
      <td className="p-3">
        {row.courseApproved === null
          ? <div><span className="font-bold text-muted">Pendiente</span><ul aria-label={`Motivos, ${row.fullName}`} className="mt-1 list-disc pl-4 text-muted">{reasons.map(r => <li key={r}>{evaluationResultReasonLabel(r, criterionName)}</li>)}</ul></div>
          : row.courseApproved
            ? <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold">Aprobado</span>
            : <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-800 font-bold">Desaprobado</span>}
      </td>
    </tr>
  );
}
