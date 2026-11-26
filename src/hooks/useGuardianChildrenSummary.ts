'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { childGradeSummary, latestPublishedBimester, type ChildGradeSummary } from '@/adapters/guardianChildSummaryAdapter';
import { guardianPortalErrorCode } from '@/services/padres/guardianErrors';
import { guardianReportErrorMessage, guardianReportService } from '@/services/padres/guardianReportService';

export type ChildSummaryState =
  | { status: 'loading' }
  | { status: 'ok'; summary: ChildGradeSummary }
  | { status: 'sin_libreta' }
  | { status: 'error'; message: string };

export interface ChildrenSummary {
  /** Estado por id de hijo; un hijo sin entrada aún está cargando. */
  byId: Record<string, ChildSummaryState>;
  /** Vuelve a pedir solo el resumen de ese hijo. */
  retry: (id: string) => void;
}

export const CHILD_SUMMARY_LOADING: ChildSummaryState = { status: 'loading' };

/** Libreta del bimestre más reciente publicado; sin bimestres, o con 409 REPORT_NOT_PUBLISHED, no hay libreta. */
async function loadSummary(id: string, signal: AbortSignal): Promise<ChildSummaryState> {
  const latest = latestPublishedBimester(await guardianReportService.published(id, signal));
  if (!latest) return { status: 'sin_libreta' };
  try {
    return { status: 'ok', summary: childGradeSummary(await guardianReportService.report(id, latest.bimesterId, signal)) };
  } catch (cause) {
    if (guardianPortalErrorCode(cause) === 'REPORT_NOT_PUBLISHED') return { status: 'sin_libreta' };
    throw cause;
  }
}

/**
 * Resumen de rendimiento de cada hijo: `published` y, si hay al menos un bimestre, `report` del `[0]` (D6).
 * Un solo `AbortController` cubre todas las peticiones y se cancela al desmontar o al cambiar los ids. Los hijos
 * se resuelven con `Promise.allSettled`: el error de uno no afecta a los demás.
 */
export function useGuardianChildrenSummary(ids: string[]): ChildrenSummary {
  const idsKey = ids.join(',');
  const [store, setStore] = useState<{ idsKey: string; map: Record<string, ChildSummaryState> }>({ idsKey: '', map: {} });
  const controllerRef = useRef<AbortController | null>(null);

  const settle = useCallback((key: string, id: string, state: ChildSummaryState) => {
    setStore(prev => (prev.idsKey === key ? { idsKey: key, map: { ...prev.map, [id]: state } } : { idsKey: key, map: { [id]: state } }));
  }, []);

  useEffect(() => {
    const list = idsKey ? idsKey.split(',') : [];
    if (list.length === 0) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    Promise.allSettled(list.map(id => loadSummary(id, controller.signal))).then(results => {
      if (controller.signal.aborted) return;
      setStore({
        idsKey,
        map: Object.fromEntries(list.map((id, index) => {
          const result = results[index];
          const state: ChildSummaryState = result.status === 'fulfilled'
            ? result.value
            : { status: 'error', message: guardianReportErrorMessage(result.reason, 'report') };
          return [id, state];
        })),
      });
    });
    return () => { controller.abort(); if (controllerRef.current === controller) controllerRef.current = null; };
  }, [idsKey]);

  const retry = useCallback((id: string) => {
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) return;
    settle(idsKey, id, CHILD_SUMMARY_LOADING);
    loadSummary(id, controller.signal).then(
      state => { if (!controller.signal.aborted) settle(idsKey, id, state); },
      cause => { if (!controller.signal.aborted) settle(idsKey, id, { status: 'error', message: guardianReportErrorMessage(cause, 'report') }); },
    );
  }, [idsKey, settle]);

  return { byId: store.idsKey === idsKey ? store.map : {}, retry };
}
