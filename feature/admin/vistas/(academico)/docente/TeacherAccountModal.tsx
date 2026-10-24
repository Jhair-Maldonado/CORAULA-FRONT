'use client';

import { useRef, useState, type FormEvent } from 'react';
import { UserCircleIcon } from 'hugeicons-react';
import { accountEmailError, maxAccountEmailLength, normalizeAccountEmail, teacherAccountErrorMessage, teachersService } from '@/services/admin/teachersService';
import type { TeacherAccountResponse } from '@/types/teacherApi';

type Props = {
  teacherId: string;
  onCancel: () => void;
  onCreated: (account: TeacherAccountResponse) => void;
};

const primaryClass = 'px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';
const secondaryClass = 'px-4 py-2 bg-white border border-line rounded-xl text-xs font-bold min-h-10 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

export default function TeacherAccountModal({ teacherId, onCancel, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [validation, setValidation] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const normalized = normalizeAccountEmail(email);

  function review(event: FormEvent) {
    event.preventDefault();
    const problem = accountEmailError(email);
    setValidation(problem ?? '');
    setError('');
    if (!problem) setConfirming(true);
  }

  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      onCreated(await teachersService.createAccount(teacherId, { email: normalized }));
    } catch (failure) {
      setError(teacherAccountErrorMessage(failure));
      setConfirming(false);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="teacher-account-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-5 sm:p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="teacher-account-title" className="text-base font-bold tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2"><UserCircleIcon size={18} aria-hidden="true" className="text-accent" />Crear cuenta de acceso</h2>
        {error && <p role="alert" className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm break-words">{error}</p>}
        {confirming ? <div className="flex flex-col gap-4">
          <p className="text-sm text-ink break-words">Se creará la cuenta de acceso para <strong>{normalized}</strong>. ¿Confirmar?</p>
          {busy && <p role="status" className="text-xs text-muted">Creando cuenta...</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={secondaryClass}>Cancelar</button>
            <button type="button" disabled={busy} onClick={confirm} className={primaryClass}>{busy ? 'Creando...' : 'Confirmar'}</button>
          </div>
        </div> : <form noValidate onSubmit={review} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-bold text-ink">
            Correo del docente
            <input type="email" aria-label="Correo del docente" autoComplete="off" maxLength={maxAccountEmailLength} value={email}
              aria-invalid={validation ? true : undefined} aria-describedby={validation ? 'teacher-account-email-error' : undefined}
              onChange={event => { setEmail(event.target.value); setValidation(''); }}
              className="px-3 py-2 border border-line rounded-xl text-sm font-normal min-h-10 focus-visible:outline-2 focus-visible:outline-accent" />
          </label>
          {validation && <p id="teacher-account-email-error" role="alert" className="text-xs text-rose-700">{validation}</p>}
          <p className="text-xs text-muted">La contraseña inicial será el DNI del docente.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onCancel} className={secondaryClass}>Cancelar</button>
            <button type="submit" className={primaryClass}>Continuar</button>
          </div>
        </form>}
      </div>
    </div>
  );
}
