'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import MaterialesDocente from './MaterialesDocente';
import { ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import type { CreateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import type { Bimester } from '@/types/evaluationApi';

const button =
  'min-h-10 px-3 py-2 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors cursor-pointer';
const input =
  'w-full mt-1.5 p-2.5 rounded-lg border border-line bg-neutral/30 text-ink focus-visible:outline-accent text-xs';

interface ModalNuevaActividadProps {
  isOpen: boolean;
  onClose: () => void;
  disabled: boolean;
  form: CreateAcademicActivityRequest;
  setForm: (f: CreateAcademicActivityRequest | ((prev: CreateAcademicActivityRequest) => CreateAcademicActivityRequest)) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onSubmit: () => Promise<void>;
  sectionCourseId: number;
  bimester?: Bimester;
  titleError?: string | null;
}

export default function ModalNuevaActividad({
  isOpen,
  onClose,
  disabled,
  form,
  setForm,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSubmit,
  sectionCourseId,
  bimester,
  titleError
}: ModalNuevaActividadProps) {
  const [creationMode, setCreationMode] = useState<'actividad' | 'material'>('actividad');
  const [sePresentaraEnClase, setSePresentaraEnClase] = useState(true);

  return (
    <div
      className={
        isOpen
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs'
          : 'hidden'
      }
      role="dialog"
      aria-modal={isOpen}
      aria-labelledby="create-modal-title"
    >
      <div className="bg-white rounded-2xl border border-line shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative flex flex-col gap-4">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 id="create-modal-title" className="font-bold text-base text-ink">
              Nueva Actividad o Material
            </h3>
            {bimester && (
              <p className="text-xs text-muted mt-0.5">
                Para {bimester.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-neutral transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas: Actividad académica vs Subir material */}
        <div className="flex border-b border-line gap-2">
          <button
            type="button"
            onClick={() => setCreationMode('actividad')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              creationMode === 'actividad'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Actividad académica
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('material')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              creationMode === 'material'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Subir material
          </button>
        </div>

        {/* Contenido según pestaña */}
        {creationMode === 'material' ? (
          <MaterialesDocente sectionCourseId={sectionCourseId} />
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem('pending_activity_delivery_mode', sePresentaraEnClase ? 'revisa_en_clase' : 'sube_imagen');
              }
              void onSubmit();
            }}
            className="flex flex-col gap-4"
            aria-label="Crear actividad académica"
          >
            <fieldset disabled={disabled} className="flex flex-col gap-3 text-xs font-bold text-muted">
              <label>
                Título
                <input
                  aria-label="Título de actividad"
                  required
                  maxLength={255}
                  className={input}
                  placeholder="Ej. Práctica calificada de cinemática"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  aria-invalid={!!form.title && !!titleError}
                />
              </label>
              {form.title && titleError && <p role="alert" className="text-rose-700 text-xs">{titleError}</p>}

              {/* Fechas de inicio y finalización de la actividad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label>
                  Fecha de inicio
                  <input
                    type="date"
                    className={input}
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </label>
                <label>
                  Fecha de finalización
                  <input
                    type="date"
                    className={input}
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Tipo
                <select
                  aria-label="Tipo de actividad"
                  className={input}
                  value={form.type}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      type: e.target.value as CreateAcademicActivityRequest['type']
                    }))
                  }
                >
                  {ACADEMIC_ACTIVITY_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Descripción (opcional)
                <textarea
                  aria-label="Descripción de actividad"
                  rows={3}
                  className={input}
                  placeholder="Instrucciones o detalles de la actividad..."
                  value={form.description ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </label>

              {/* Switch: ¿Se presentará en clase? */}
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-line bg-neutral/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-ink">¿Se presentará en clase?</span>
                    <span className="text-[11px] font-normal text-muted">
                      {sePresentaraEnClase
                        ? 'La actividad se expondrá, entregará o evaluará de manera presencial en el aula.'
                        : 'No se presentará en clase presencial.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sePresentaraEnClase}
                    aria-label="¿Se presentará en clase?"
                    onClick={() => setSePresentaraEnClase(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      sePresentaraEnClase ? 'bg-emerald-600' : 'bg-neutral border-line'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        sePresentaraEnClase ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Alerta condicional si NO se presentará en clase */}
                {!sePresentaraEnClase && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs animate-in fade-in duration-200 mt-1"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-amber-950">Entrega virtual requerida</span>
                      <p className="text-[11px] text-amber-900/90 font-normal leading-relaxed">
                        En esta actividad el estudiante debe subir su tarea a la plataforma para su revisión.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 min-h-8 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.cuentaParaPa}
                  onChange={e => setForm(prev => ({ ...prev, cuentaParaPa: e.target.checked }))}
                />
                Cuenta para PA
              </label>

              <p className="font-normal text-[11px] text-muted">
                La actividad se crea en estado Borrador. Publícala desde su detalle para registrar notas.
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className={`${button} bg-white hover:bg-neutral`}
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={disabled || !!titleError}
                className={`${button} bg-accent text-white disabled:bg-neutral/60 disabled:text-muted disabled:border-line disabled:opacity-100`}
              >
                Crear actividad
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}