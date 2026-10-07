'use client';

import { useRef, useState } from 'react';
import { studentImportService, studentImportErrorMessage, studentImportErrorPreview } from '@/services/admin/studentImportService';
import type { StudentImportConfirmation, StudentImportIssue, StudentImportPreview } from '@/types/studentImport';

function Issues({ issues, warning = false }: { issues: StudentImportIssue[]; warning?: boolean }) {
  return <ul className="flex flex-col gap-2">{issues.map((issue, index) => (
    <li key={`${issue.code}-${issue.field}-${index}`} className={`rounded-lg p-2 ${warning ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'}`}>
      <span className="text-xs font-bold rounded border border-current px-1" data-issue-code={issue.code}>{issue.code}</span>
      <p className="mt-1">{issue.field}: {issue.message}</p>
    </li>
  ))}</ul>;
}

/** Single implementation; backend owns structure and business validation. */
export default function ImportadorMatricula() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<StudentImportConfirmation | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [needsNewPreview, setNeedsNewPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Synchronous locks prevent repeated clicks before React updates state.
  const requestInProgress = useRef(false);
  const confirmed = useRef(false);
  const busy = previewLoading || confirmLoading;
  const canConfirm = !!selectedFile && !!preview && previewFile === selectedFile &&
    preview.totalRows > 0 && preview.invalidRows === 0 && preview.validRows === preview.totalRows &&
    preview.rows.length === preview.totalRows &&
    preview.rows.every(row => row.valid === true && row.errors.length === 0) &&
    !busy && !confirmation && !needsNewPreview;

  const selectFile = (file: File) => {
    if (requestInProgress.current) return;
    setPreview(null);
    setPreviewFile(null);
    setConfirmation(null);
    setPreviewError(null);
    setConfirmError(null);
    setNeedsNewPreview(false);
    confirmed.current = false;
    if (!/\.xlsx$/i.test(file.name)) {
      setSelectedFile(null);
      setPreviewError('Solo se permiten archivos .XLSX.');
      return;
    }
    setSelectedFile(file);
  };

  const requestPreview = async () => {
    if (!selectedFile || requestInProgress.current || confirmed.current) return;
    const file = selectedFile;
    requestInProgress.current = true;
    setPreviewLoading(true);
    setPreview(null);
    setPreviewFile(null);
    setPreviewError(null);
    setConfirmError(null);
    setNeedsNewPreview(false);
    try {
      setPreview(await studentImportService.preview(file));
      setPreviewFile(file);
    } catch (error) {
      const refreshedPreview = studentImportErrorPreview(error);
      if (refreshedPreview) {
        setPreview(refreshedPreview);
        setPreviewFile(file);
        setNeedsNewPreview(true);
      }
      setPreviewError(studentImportErrorMessage(error));
    } finally {
      requestInProgress.current = false;
      setPreviewLoading(false);
    }
  };

  const requestConfirmation = async () => {
    if (!canConfirm || !selectedFile || requestInProgress.current || confirmed.current) return;
    const file = selectedFile;
    requestInProgress.current = true;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const result = await studentImportService.confirm(file);
      confirmed.current = true;
      setConfirmation(result);
    } catch (error) {
      const refreshedPreview = studentImportErrorPreview(error);
      if (refreshedPreview) {
        setPreview(refreshedPreview);
        setPreviewFile(file);
        // An error response never re-enables confirmation, even if counters look valid.
        setNeedsNewPreview(true);
      }
      setConfirmError(studentImportErrorMessage(error));
    } finally {
      requestInProgress.current = false;
      setConfirmLoading(false);
    }
  };

  const buttonClass = 'px-4 py-2 rounded-xl bg-accent text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed';
  const display = (value: string | number | null) => value ?? '—';
  return (
    <section className="w-full bg-white rounded-2xl border border-line p-6 flex flex-col gap-5" aria-busy={busy}>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) selectFile(file);
        }}
        className="border-2 border-dashed border-line rounded-xl p-8 text-center"
      >
        <p className="text-ink font-bold">Selecciona o arrastra un archivo .XLSX</p>
        <p className="text-sm text-muted mt-2">Usa la hoja ESTUDIANTES. El servidor revisará su estructura y la validez de cada fila.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          disabled={busy}
          aria-label="Seleccionar archivo de matrícula .XLSX"
          className="mt-4 max-w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) selectFile(file);
            event.target.value = '';
          }}
        />
        {confirmation && <button type="button" className={`${buttonClass} mt-4`} onClick={() => fileInputRef.current?.click()}>Cargar otro archivo</button>}
      </div>
      {selectedFile && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink">Archivo: {selectedFile.name}</p>
          <button type="button" className={buttonClass} disabled={busy || !!confirmation} onClick={requestPreview}>
            {previewLoading ? 'Validando en servidor...' : 'Obtener preview'}
          </button>
          <button type="button" className={buttonClass} disabled={!canConfirm} onClick={requestConfirmation}>
            {confirmLoading ? 'Confirmando...' : 'Confirmar matrícula'}
          </button>
        </div>
      )}
      {selectedFile && !preview && !confirmation && !previewLoading && !previewError && (
        <p className="text-sm text-muted">Archivo seleccionado. Pendiente de validación por el servidor.</p>
      )}
      {previewError && <p role="alert" className="text-sm text-red-700">{previewError}</p>}
      {confirmError && <p role="alert" className="text-sm text-red-700">{confirmError}</p>}
      {needsNewPreview && <p className="text-sm text-muted">Revisa el resultado actualizado. Obtén un nuevo preview antes de volver a confirmar.</p>}
      {preview && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">Total: {preview.totalRows} · Válidas: {preview.validRows} · Inválidas: {preview.invalidRows}</p>
          {preview.invalidRows > 0 && <p className="text-sm text-red-700">Corrige el archivo y vuelve a validarlo antes de confirmar.</p>}
          {preview.validRows === 0 && <p className="text-sm text-muted">No hay filas válidas para confirmar.</p>}
          <div className="max-h-[36rem] overflow-auto border border-line rounded-xl">
            <table className="w-full text-left text-sm">
              <caption className="p-3 text-muted text-left">Resultado de validación por fila. Las advertencias no bloquean la confirmación.</caption>
              <thead><tr>{['Fila / Estado', 'Estudiante', 'Apoderado', 'Académico', 'Errores / Advertencias'].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${row.rowNumber}-${index}`} className="border-t border-line align-top">
                    <td className="p-3">
                      <p>Fila {row.rowNumber}</p>
                      <span className={`inline-block rounded px-2 py-1 mt-1 ${row.valid && row.errors.length === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{row.valid && row.errors.length === 0 ? 'Válida' : 'Inválida'}</span>
                      {row.warnings.length > 0 && <span className="inline-block rounded px-2 py-1 mt-1 bg-amber-50 text-amber-900">{row.warnings.length} advertencias</span>}
                    </td>
                    <td className="p-3">
                      <p>{display(row.data.firstNames)} {display(row.data.lastNames)}</p>
                      <p>DNI: {display(row.data.studentDni)}</p>
                      <p className="break-all">Email: {display(row.data.studentEmail)}</p>
                    </td>
                    <td className="p-3">
                      <p>{display(row.data.guardianFirstNames)} {display(row.data.guardianLastNames)}</p>
                      <p>DNI: {display(row.data.guardianDni)}</p>
                      <p>Relación: {display(row.data.guardianRelationship)}</p>
                      {row.data.guardianEmail && <p className="break-all">Email: {row.data.guardianEmail}</p>}
                    </td>
                    <td className="p-3">
                      <p>Periodo: {display(row.data.academicPeriod)}</p>
                      <p>Nivel: {display(row.data.level)}</p>
                      <p>Grado: {display(row.data.grade)}</p>
                      <p>Sección: {display(row.data.section)}</p>
                      <p>Fecha: {display(row.data.enrollmentDate)}</p>
                    </td>
                    <td className="p-3 min-w-64">
                      {row.errors.length > 0 ? <><p className="font-bold mb-1">Errores</p><Issues issues={row.errors} /></> : <p>Sin errores</p>}
                      {row.warnings.length > 0 && <div className="mt-3"><p className="font-bold mb-1">Advertencias</p><Issues issues={row.warnings} warning /></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {confirmation && (
        <div role="status" className="rounded-xl p-4 bg-emerald-50 text-emerald-800 text-sm">
          <p className="font-bold">Confirmación recibida del servidor</p>
          <ul className="mt-2">
            <li>Filas procesadas: {confirmation.totalRows}</li>
            <li>Estudiantes creados: {confirmation.studentsCreated}</li>
            <li>Apoderados creados: {confirmation.guardiansCreated}</li>
            <li>Apoderados reutilizados por relación: {confirmation.guardiansReused}</li>
            <li>Usuarios creados: {confirmation.usersCreated}</li>
            <li>Relaciones creadas: {confirmation.relationshipsCreated}</li>
            <li>Matrículas creadas: {confirmation.enrollmentsCreated}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
