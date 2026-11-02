'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { PlusSignIcon, UserMultiple02Icon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';
import { staffAccountsService, staffLoadErrorMessage } from '@/services/admin/staffAccountsService';
import { accountStateActionFor, accountStateActionLabels, accountStateChangeReloads, accountStateErrorMessage, accountStateService, accountStateSuccessMessage } from '@/services/admin/accountStateService';
import type { AccountStateAction, ChangeAccountStateRequest, CreateStaffAccountResponse, StaffAccountStatusFilter, StaffAccountSummary, StaffListParams } from '@/types/staffAccountApi';
import { Failure, SectionBadge, SectionEmpty, SectionLoading, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, destructiveButtonClass } from '../../(academico)/secciones/sectionUi';
import StaffAccountForm from './StaffAccountForm';
import AccountStateDialog from './AccountStateDialog';

const legacyName = 'Cuenta sin datos personales';

// Front #41 criterion 1: only ADMINISTRADOR sees the view, even through a direct URL.
export default function VistaPersonal() {
  const auth = useContext(AuthContext);
  if (auth?.status !== 'authenticated' || !auth.sessionValid || auth.role !== 'ADMINISTRADOR') {
    return <p role="alert" className="m-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">No tienes acceso a la gestión de personal.</p>;
  }
  return <StaffAccounts />;
}

function StaffAccounts() {
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState<StaffListParams>({});
  const [draftStatus, setDraftStatus] = useState<'' | StaffAccountStatusFilter>('');
  const [draftQuery, setDraftQuery] = useState('');
  const [result, setResult] = useState<{ revision: number; data?: StaffAccountSummary[]; error?: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [changing, setChanging] = useState<{ account: StaffAccountSummary; action: AccountStateAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const sending = useRef(false);
  const loading = result?.revision !== revision;

  useEffect(() => {
    let current = true;
    staffAccountsService.list(filters)
      .then(data => { if (current) setResult({ revision, data }); })
      .catch(error => { if (current) setResult({ revision, error: staffLoadErrorMessage(error) }); });
    return () => { current = false; };
  }, [revision, filters]);

  const reload = () => setRevision(n => n + 1);

  function handleCreated(created: CreateStaffAccountResponse) {
    setCreating(false);
    setFailure('');
    setNotice(`Cuenta de Secretaría creada para ${created.email}. La contraseña inicial es su DNI; deberá cambiarla en el primer acceso.`);
    reload();
  }

  async function changeState(request: ChangeAccountStateRequest) {
    if (!changing || sending.current) return;
    sending.current = true;
    setBusy(true);
    setDialogError('');
    try {
      const change = await accountStateService.change(changing.account.userId, changing.action, request);
      setChanging(null);
      setFailure('');
      setNotice(accountStateSuccessMessage(change));
      reload();
    } catch (error) {
      if (accountStateChangeReloads(error)) {
        setChanging(null);
        setNotice('');
        setFailure(accountStateErrorMessage(error));
        reload();
      } else {
        setDialogError(accountStateErrorMessage(error));
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const rows = loading ? undefined : result?.data;
  return <div className="w-full min-h-full bg-canvas p-6 md:p-8 font-sans flex flex-col gap-6">
    <header className="bg-white rounded-2xl border border-line p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl md:text-2xl font-bold text-ink flex items-center gap-3"><UserMultiple02Icon className="text-accent" aria-hidden="true" />Personal de Secretaría</h1><p className="text-xs text-muted mt-2">Cuentas de acceso con rol Secretaría. No se eliminan: la baja deshabilita la cuenta y conserva su historial.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={() => { setNotice(''); setFailure(''); reload(); }} className={secondaryButtonClass}>Actualizar</button>
        <button type="button" onClick={() => { setNotice(''); setFailure(''); setCreating(true); }} className={`${primaryButtonClass} flex items-center gap-2`}><PlusSignIcon size={16} aria-hidden="true" />Registrar personal</button>
      </div>
    </header>

    <form className="bg-white rounded-2xl border border-line p-4 shadow-sm flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      setFilters({ status: draftStatus || undefined, q: draftQuery.trim() || undefined });
      reload();
    }}>
      <label className={`${labelClass} flex-1 min-w-48`}>Buscar<input aria-label="Buscar personal" value={draftQuery} maxLength={120} onChange={event => setDraftQuery(event.target.value)} placeholder="Nombre, DNI o correo" className={inputClass} /></label>
      <label className={labelClass}>Estado<select aria-label="Estado de la cuenta" value={draftStatus} onChange={event => setDraftStatus(event.target.value as '' | StaffAccountStatusFilter)} className={inputClass}>
        <option value="">Todas</option><option value="ACTIVE">Habilitadas</option><option value="DISABLED">Deshabilitadas</option>
      </select></label>
      <button type="submit" className={secondaryButtonClass}>Filtrar</button>
    </form>

    {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm break-words">{notice}</p>}
    {failure && <Failure message={failure} />}
    {loading && <SectionLoading>Cargando personal...</SectionLoading>}
    {!loading && result?.error && <Failure message={result.error} retry={reload} />}
    {rows && rows.length === 0 && <SectionEmpty title="Sin cuentas de Secretaría">No hay cuentas que coincidan con los filtros. Registra al personal con «Registrar personal».</SectionEmpty>}
    {rows && rows.length > 0 && <div className="bg-white rounded-2xl border border-line shadow-sm overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral/50 text-muted uppercase tracking-wider text-[10px]"><tr>
          <th scope="col" className="text-left p-3">Nombre</th><th scope="col" className="text-left p-3">DNI</th><th scope="col" className="text-left p-3">Correo</th>
          <th scope="col" className="text-left p-3">Estado</th><th scope="col" className="text-right p-3">Acción</th>
        </tr></thead>
        <tbody>{rows.map(account => {
          const action = accountStateActionFor(account.active);
          return <tr key={account.userId} className="border-t border-line">
            <td className="p-3 font-bold break-words">{account.fullName ?? <span className="text-muted font-medium">{legacyName}</span>}</td>
            <td className="p-3">{account.dni ?? '—'}</td>
            <td className="p-3 break-all">{account.email}</td>
            <td className="p-3"><SectionBadge positive={account.active}>{account.active ? 'Habilitada' : 'Deshabilitada'}</SectionBadge></td>
            <td className="p-3 text-right"><button type="button" disabled={busy}
              aria-label={`${accountStateActionLabels[action].button}: ${account.email}`}
              onClick={() => { setNotice(''); setFailure(''); setDialogError(''); setChanging({ account, action }); }}
              className={action === 'DEACTIVATE' ? destructiveButtonClass : secondaryButtonClass}>{accountStateActionLabels[action].button}</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}

    {creating && <StaffAccountForm onCancel={() => setCreating(false)} onCreated={handleCreated}
      onUncertain={message => { setCreating(false); setNotice(''); setFailure(message); reload(); }} />}
    {changing && <AccountStateDialog action={changing.action} name={changing.account.fullName ?? legacyName} email={changing.account.email}
      busy={busy} error={dialogError} onCancel={() => { if (!busy) setChanging(null); }} onConfirm={request => void changeState(request)} />}
  </div>;
}
