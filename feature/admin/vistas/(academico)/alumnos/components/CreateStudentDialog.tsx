'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { StudentCreateValues } from '@/types/adminStudent';
import type { StudentDetailResponse } from '@/types/studentApi';
import type { EnrollmentDetailResponse } from '@/types/enrollmentApi';
import { emptyStudentCreateValues, studentCreateValidation, studentFullName, studentLevelLabels, toCreateStudent } from '@/adapters/studentAdapter';
import { isUncertainStudentCreate, studentCreateErrorMessage, studentsService } from '@/services/admin/studentsService';
import { localToday } from '@/services/admin/enrollmentsService';
import EnrollStudentForm from './EnrollStudentForm';
import { Failure, SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, sectionName } from '../../secciones/sectionUi';

const fields: { key: keyof StudentCreateValues; label: string; maxLength?: number; required?: boolean; type?: string; inputMode?: 'numeric' }[] = [
  { key: 'dni', label: 'DNI', maxLength: 8, required: true, inputMode: 'numeric' },
  { key: 'firstNames', label: 'Nombres', maxLength: 120, required: true },
  { key: 'paternalLastName', label: 'Apellido paterno', maxLength: 120, required: true },
  { key: 'maternalLastName', label: 'Apellido materno', maxLength: 120 },
  { key: 'birthDate', label: 'Fecha de nacimiento', required: true, type: 'date' },
  { key: 'phone', label: 'Teléfono', maxLength: 30 },
];

type Step = { kind: 'form' } | { kind: 'enroll'; student: StudentDetailResponse } | { kind: 'done'; student: StudentDetailResponse; enrollment: EnrollmentDetailResponse };

const profileHref = (student: StudentDetailResponse) => `/administrador/alumnos/estudiante/${student.studentId}`;

// Two steps: the student is created once; a failed enrollment only retries the enrollment POST.
export default function CreateStudentDialog({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [values, setValues] = useState(emptyStudentCreateValues);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const title = step.kind === 'form' ? 'Nuevo alumno' : step.kind === 'enroll' ? 'Matricular en sección' : 'Alumno registrado';

  return <SectionDialog title={title} busy={busy} onClose={onClose}>
    {step.kind === 'form' && <form noValidate className="flex flex-col gap-4" onSubmit={async event => {
      event.preventDefault();
      if (submitting.current) return;
      const invalid = studentCreateValidation(values);
      if (invalid) { setError(invalid); return; }
      submitting.current = true;
      setBusy(true); setError('');
      try {
        const student = await studentsService.create(toCreateStudent(values));
        onChanged();
        setStep({ kind: 'enroll', student });
      } catch (failure) {
        setError(studentCreateErrorMessage(failure));
        if (isUncertainStudentCreate(failure)) onChanged();
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    }}>
      <p className="text-xs text-muted">Se registrará al alumno sin cuenta de acceso. El código de estudiante lo asigna el sistema.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{field.required ? ' *' : ''}
          <input aria-label={field.label} type={field.type ?? 'text'} inputMode={field.inputMode} maxLength={field.maxLength} required={field.required}
            max={field.type === 'date' ? localToday() : undefined} value={values[field.key]} disabled={busy}
            onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} className={inputClass} />
        </label>)}
      </div>
      {error && <Failure message={error} />}
      {busy && <p role="status" className="text-xs text-muted">Registrando alumno...</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
        <button className={primaryButtonClass} disabled={busy}>Registrar alumno</button>
      </div>
    </form>}
    {step.kind === 'enroll' && <div className="flex flex-col gap-4">
      <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">Alumno registrado: {studentFullName(step.student)} · DNI {step.student.dni}. Ahora puedes matricularlo en una sección.</p>
      <EnrollStudentForm studentId={step.student.studentId} studentStatus={step.student.studentStatus} hasActiveEnrollment={false}
        cancelLabel="Matricular después" onBusyChange={setBusy} onCancel={onClose}
        onEnrolled={enrollment => { onChanged(); setStep({ kind: 'done', student: step.student, enrollment }); }} />
      {!busy && <Link href={profileHref(step.student)} className="text-xs font-bold text-accent underline self-end">Ir al perfil del alumno</Link>}
    </div>}
    {step.kind === 'done' && <div className="flex flex-col gap-4">
      <p role="status" className="rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">
        {studentFullName(step.student)} quedó matriculado en {step.enrollment.academicPeriodName} · {studentLevelLabels[step.enrollment.level]} {step.enrollment.grade}° · {sectionName(step.enrollment.sectionName)}.
      </p>
      <div className="flex justify-end gap-2">
        <Link href={profileHref(step.student)} className={secondaryButtonClass}>Ir al perfil del alumno</Link>
        <button type="button" className={primaryButtonClass} onClick={onClose}>Cerrar</button>
      </div>
    </div>}
  </SectionDialog>;
}
