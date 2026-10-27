'use client';

import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { LockKeyIcon, ViewIcon, ViewOffIcon, Logout01Icon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';
import { GlobalLoader } from '@/components/GlobalLoader';
import { authService } from '@/services/authService';
import { portalPathForRole, postLoginPath } from '@/utils/authRoutes';

export const PASSWORD_MIN_CHARS = 12;
export const PASSWORD_MAX_BYTES = 72;

/** Puntos de código Unicode, como los cuenta el backend (no unidades UTF-16). */
export function passwordCharCount(value: string): number {
  return Array.from(value).length;
}

export function passwordByteCount(value: string): number {
  return new TextEncoder().encode(value).length;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
}

/** Traduce los errores del contrato SEC-CAMBIO-CONTRASENA a mensajes de pantalla. */
export function passwordChangeErrorMessage(error: unknown): string {
  if (!isAxiosError(error) || !error.response) {
    return 'Error de red o servidor no disponible. Inténtalo nuevamente.';
  }
  const { status, data, headers } = error.response;
  const code: string | undefined = data?.code;
  const backendMessage: string | undefined = typeof data?.message === 'string' ? data.message : undefined;

  if (code === 'CURRENT_PASSWORD_INVALID') return 'La contraseña actual es incorrecta.';
  if (code === 'PASSWORD_POLICY_VIOLATION') {
    return backendMessage ?? 'La nueva contraseña no cumple la política de seguridad.';
  }
  if (code === 'ACCOUNT_IDENTITY_INCOMPLETE' || status === 409) {
    return 'Tu cuenta no tiene los datos de identidad completos. Comunícate con la administración del colegio.';
  }
  if (code === 'ACCOUNT_LOCKED' || status === 423) {
    return 'Tu cuenta está bloqueada temporalmente. Inténtalo más tarde.';
  }
  if (code === 'RATE_LIMITED' || status === 429) {
    const retryAfter = Number.parseInt(String(headers?.['retry-after'] ?? ''), 10);
    return Number.isFinite(retryAfter) && retryAfter > 0
      ? `Demasiados intentos. Espera ${formatWait(retryAfter)} antes de volver a intentarlo.`
      : 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }
  if (code === 'INVALID_AUTHENTICATION' || status === 401) {
    return 'Tu sesión ya no es válida. Inicia sesión nuevamente.';
  }
  if (status === 400) return backendMessage ?? 'Revisa los datos ingresados.';
  return 'No se pudo cambiar la contraseña. Inténtalo más tarde.';
}

const inputClass =
  'w-full pl-10 pr-10 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-accent focus:ring-3 focus:ring-accent/10 transition-all placeholder:text-muted/60 placeholder:font-normal';

export default function CambioContrasena() {
  const router = useRouter();
  const authContext = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const status = authContext?.status;
  const required = authContext?.passwordChangeRequired === true;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/');
  }, [status, router]);

  if (!authContext || status !== 'authenticated') {
    return <GlobalLoader />;
  }

  const chars = passwordCharCount(newPassword);
  const bytes = passwordByteCount(newPassword);
  const tooShort = chars < PASSWORD_MIN_CHARS;
  const tooLong = bytes > PASSWORD_MAX_BYTES;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Ingresa tu contraseña actual.');
      return;
    }
    if (tooShort) {
      setErrorMsg(`La nueva contraseña debe tener al menos ${PASSWORD_MIN_CHARS} caracteres.`);
      return;
    }
    if (tooLong) {
      setErrorMsg('La nueva contraseña es demasiado larga. Usa menos caracteres o menos símbolos especiales.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setEnviando(true);
    try {
      const response = await authService.changePassword({ currentPassword, newPassword });
      if (!response?.token || !response.role) {
        setErrorMsg('No se pudo cambiar la contraseña. Inténtalo más tarde.');
        return;
      }
      const stillRequired = response.passwordChangeRequired === true;
      authContext.login(response.token, response.role, stillRequired);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.replace(postLoginPath(response.role, stillRequired));
    } catch (error) {
      setErrorMsg(passwordChangeErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  };

  const toggleLabel = showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas';

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-[420px] bg-white p-7 sm:p-8 rounded-2xl border border-line/70 shadow-xl shadow-ink/5 flex flex-col">
        <div className="mb-6">
          <span className="text-[11px] font-bold tracking-widest uppercase text-accent">CORAULA</span>
          <h1 className="text-[22px] font-bold text-ink tracking-tight mt-2">Cambiar contraseña</h1>
          <p className="text-[12.5px] text-muted font-medium mt-1">
            {required
              ? 'Por seguridad, debes definir una contraseña propia antes de continuar.'
              : 'Actualiza la contraseña de tu cuenta.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="current-password" className="text-[12px] font-semibold text-ink">Contraseña actual</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                <LockKeyIcon size={16} />
              </div>
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-password" className="text-[12px] font-semibold text-ink">Nueva contraseña</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                <LockKeyIcon size={16} />
              </div>
              <input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby="new-password-counter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                aria-label={toggleLabel}
                title={toggleLabel}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/70 hover:text-ink transition-colors cursor-pointer"
              >
                {showPasswords ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
              </button>
            </div>
            <p
              id="new-password-counter"
              aria-live="polite"
              className={`text-[11.5px] font-medium ${newPassword && (tooShort || tooLong) ? 'text-red-600' : 'text-muted'}`}
            >
              {tooLong
                ? `${chars} caracteres: supera el tamaño máximo permitido.`
                : `${chars} de ${PASSWORD_MIN_CHARS} caracteres mínimos.`}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="confirm-password" className="text-[12px] font-semibold text-ink">Confirmar nueva contraseña</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                <LockKeyIcon size={16} />
              </div>
              <input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {mismatch && (
              <p className="text-[11.5px] font-medium text-red-600">La confirmación no coincide.</p>
            )}
          </div>

          <p className="text-[11.5px] text-muted leading-relaxed">
            Debe ser distinta de tu DNI y de tu contraseña actual. Evita contraseñas comunes o secuencias.
          </p>

          {errorMsg && (
            <div role="alert" className="text-center bg-red-50 text-red-600 text-xs py-2 px-3 rounded-xl border border-red-100 font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-[13px] tracking-wide hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer mt-1 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {enviando ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3">
          {!required ? (
            <Link href={portalPathForRole(authContext.role)} className="text-[12px] font-semibold text-accent hover:underline">
              Volver al portal
            </Link>
          ) : <span />}
          <button
            type="button"
            onClick={() => authContext.logout()}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-ink cursor-pointer"
          >
            <Logout01Icon size={14} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
