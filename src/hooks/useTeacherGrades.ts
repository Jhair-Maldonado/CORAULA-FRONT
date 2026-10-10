'use client';

import { useEffect, useRef, useState } from 'react';
import type { Bimester, TeacherEvaluationData } from '@/types/evaluationApi';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import { teacherGradesService, teacherGradesErrorMessage } from '@/services/teacher/teacherGradesService';
import { adaptCriterionGradesSheet, prepareFirstGrades, registerFirstGrades } from '@/lib/manualGrades';

type Result<T> = { key: string; data?: T; error?: string };

// Mounted with a sectionCourseId key by the view: switching course cancels reads
// and discards all selection/drafts. No grading request survives in the next UI.
export function useTeacherGrades(sectionCourseId: number | undefined, courseId: number | undefined) {
  const [bimesterRevision, setBimesterRevision] = useState(0);
  const [sheetRevision, setSheetRevision] = useState(0);
  const [selectedBimesterId, setSelectedBimesterId] = useState('');
  const [bimesterResult, setBimesterResult] = useState<Result<Bimester[]> | null>(null);
  const [sheetResult, setSheetResult] = useState<Result<{ evaluation: TeacherEvaluationData; bimester: Bimester }> | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const mutation = useRef(false);
  const mounted = useRef(true);
  const selectionGeneration = useRef(0);
  const bimesterKey = JSON.stringify([sectionCourseId, bimesterRevision]);
  const bimestersLoading = !!sectionCourseId && bimesterResult?.key !== bimesterKey;
  const bimesters = !bimestersLoading && bimesterResult?.key === bimesterKey ? bimesterResult.data ?? [] : [];
  const bimestersError = !bimestersLoading ? bimesterResult?.error : undefined;
  const selected = bimesters.find(b => String(b.id) === selectedBimesterId);
  const sheetKey = JSON.stringify([sectionCourseId, selected?.id, selected?.academicPeriodId, sheetRevision]);
  const evaluationLoading = !!selected && sheetResult?.key !== sheetKey;
  const current = selected && sheetResult?.key === sheetKey ? sheetResult.data : undefined;
  const evaluationError = selected && !evaluationLoading ? sheetResult?.error : undefined;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!sectionCourseId) return;
    const abort = new AbortController();
    teacherGradesService.getBimesters(sectionCourseId, abort.signal)
      .then(data => { if (!abort.signal.aborted) setBimesterResult({ key: bimesterKey, data }); })
      .catch(error => { if (!abort.signal.aborted) setBimesterResult({ key: bimesterKey, error: teacherGradesErrorMessage(error) }); });
    return () => abort.abort();
  }, [sectionCourseId, bimesterKey]);

  const selectedId = selected?.id, periodId = selected?.academicPeriodId;
  useEffect(() => {
    if (!sectionCourseId || !courseId || !selectedId || !periodId) return;
    const abort = new AbortController();
    teacherGradesService.getSheet({ sectionCourseId, courseId, bimesterId: selectedId, academicPeriodId: periodId }, abort.signal)
      .then(sheet => {
        if (!abort.signal.aborted) { setSheetResult({ key: sheetKey, data: { evaluation: adaptCriterionGradesSheet(sheet), bimester: sheet.bimester } }); setRefreshRequired(false); }
      })
      .catch(error => { if (!abort.signal.aborted) setSheetResult({ key: sheetKey, error: teacherGradesErrorMessage(error) }); });
    return () => abort.abort();
  }, [sectionCourseId, courseId, selectedId, periodId, sheetKey]);

  function selectBimester(id: string) {
    if (mutation.current) return;
    selectionGeneration.current++;
    setSelectedBimesterId(id); setSheetRevision(n => n + 1);
    setDrafts({}); setSaveMessage(null); setSaveError(null); setRefreshRequired(false);
  }

  function refreshSheet() { if (!mutation.current) { setSaveMessage(null); setDrafts({}); setSheetRevision(n => n + 1); } }
  function changeDraft(enrollmentId: number, criterionId: number, value: string) {
    if (mutation.current || refreshRequired) return;
    setDrafts(prev => ({ ...prev, [`${enrollmentId}:${criterionId}`]: value }));
    setSaveMessage(null); setSaveError(null);
  }

  async function save() {
    if (mutation.current || !MANUAL_GRADES_CONTRACT_VERIFIED || !current || !sectionCourseId || !courseId || refreshRequired) return;
    let commands;
    try { commands = prepareFirstGrades(current.evaluation, current.bimester, drafts); }
    catch (error) { setSaveError(teacherGradesErrorMessage(error)); return; }
    if (!commands.length) return;
    mutation.current = true;
    const generation = selectionGeneration.current;
    setSaving(true); setSaveError(null); setSaveMessage(null); setRefreshRequired(true);
    const stillCurrent = () => mounted.current && generation === selectionGeneration.current;
    try {
      const count = await registerFirstGrades(commands, command => {
        if (!stillCurrent()) throw new Error('El contexto cambió; no se enviarán más notas.');
        return teacherGradesService.registerGrade(sectionCourseId, current.bimester.id, command);
      }, async () => {
        const sheet = await teacherGradesService.getSheet({ sectionCourseId, courseId, bimesterId: current.bimester.id, academicPeriodId: current.bimester.academicPeriodId });
        if (stillCurrent()) { setSheetResult({ key: sheetKey, data: { evaluation: adaptCriterionGradesSheet(sheet), bimester: sheet.bimester } }); setDrafts({}); setRefreshRequired(false); }
      });
      if (stillCurrent()) setSaveMessage(`Se registraron ${count} notas y se volvió a consultar la planilla.`);
    } catch (error) {
      if (stillCurrent()) setSaveError(`${teacherGradesErrorMessage(error)} El envío es individual; las notas ya registradas no se revierten.`);
    } finally { mutation.current = false; if (stillCurrent()) setSaving(false); }
  }

  return {
    bimesters, bimestersLoading, bimestersError, selectedBimesterId, selectBimester,
    evaluation: current?.evaluation, bimester: current?.bimester ?? selected,
    evaluationLoading, evaluationError, refreshSheet,
    refreshBimesters: () => { if (!mutation.current) { selectionGeneration.current++; setDrafts({}); setSelectedBimesterId(''); setBimesterRevision(n => n + 1); setSheetRevision(n => n + 1); } },
    drafts, changeDraft, saving, save, saveError, saveMessage, refreshRequired,
  };
}
