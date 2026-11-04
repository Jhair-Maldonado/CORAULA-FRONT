'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestGuard } from '@/components/GuestGuard';
import {
  Mail01Icon,
  LockKeyIcon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  SecurityCheckIcon,
  LockPasswordIcon,
} from 'hugeicons-react';
import { GlobalLoader } from '@/components/GlobalLoader';
import { ModalRecuperacionContrasena } from '../component/modalRecuperacionContrasena';

import { authService } from '@/services/authService';
import { AuthContext } from '@/contexts/AuthContext';
import { postLoginPath } from '@/utils/authRoutes';
import { isAxiosError } from 'axios';

export default function LoginAdministrador() {
  const router = useRouter();
  const authContext = React.useContext(AuthContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Modal informativo de recuperación de contraseña: no hay flujo por correo (RF-03 fuera de alcance).
  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cargando) return;

    let hasError = false;
    const trimmed = email.trim();

    if (!trimmed) {
      setEmailError('El correo es obligatorio.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('El formato de correo no es válido.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('La contraseña es obligatoria.');
      hasError = true;
    }

    if (hasError) return;

    setCargando(true);
    setErrorMsg(null);
    
    try {
      const response = await authService.login(email, password);
      
      if (response.role === 'ESTUDIANTE' || response.role === 'APODERADO') {
        setErrorMsg('Esta cuenta corresponde al portal de estudiantes y familias.');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      
      if (authContext) {
        authContext.login(response.token, response.role, response.passwordChangeRequired);
        if (response.role === 'ADMINISTRADOR' || response.role === 'DIRECTIVO' || response.role === 'DOCENTE') {
          router.push(postLoginPath(response.role, response.passwordChangeRequired === true));
        }
      }
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 400) setErrorMsg('Revisa los datos ingresados.');
        else if (status === 401) setErrorMsg('Credenciales inválidas.');
        else if (status === 403) setErrorMsg('Tu cuenta se encuentra deshabilitada.');
        else if (status === 423) setErrorMsg('Cuenta temporalmente bloqueada. Inténtalo más tarde.');
        else setErrorMsg('Error al intentar iniciar sesión. Inténtalo más tarde.');
      } else {
        setErrorMsg('Error de red o servidor no disponible.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <GuestGuard>
      <div className="w-screen h-screen min-h-screen bg-[#FAF9F6] flex flex-col font-sans overflow-hidden relative justify-center items-center">

        {/* ── CÍRCULOS DECORATIVOS ───────────────────────── */}
      <div className="absolute -top-14 -right-14 w-36 h-36 rounded-full border-[16px] border-accent/80 z-0 pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-accent/90 z-0 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-44 h-44 rounded-full border border-ink/20 z-0 pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-56 h-56 rounded-full bg-ink z-0 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-40 h-40 rounded-full border border-accent/80 z-0 pointer-events-none" />

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────── */}
      <main className="relative z-10 w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-6 flex flex-col items-center justify-center h-full">
        
        <div className="w-full mb-6 flex justify-start">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold text-muted hover:text-accent transition-colors bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-line/50 shadow-sm">
            &larr; Volver a selección de usuarios
          </Link>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 bg-white/40 lg:bg-transparent backdrop-blur-xs p-6 lg:p-0 rounded-3xl border border-line/30 lg:border-none shadow-sm lg:shadow-none">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div className="hidden lg:flex lg:col-span-7 flex-col items-center justify-center gap-5 pr-6 border-r border-line/40">
            <div className="relative w-full max-w-sm">
              <Image
                src="/security.png"
                alt="Ilustración CORAULA Gestión"
                width={440}
                height={440}
                priority
                className="object-contain w-full h-auto drop-shadow-md"
              />
            </div>

            <div className="text-center max-w-md">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink/5 text-ink text-[11px] font-bold tracking-wider uppercase mb-2">
                <SecurityCheckIcon size={14} className="text-accent" /> Panel Administrativo & Docente
              </span>
              <h2 className="text-[26px] font-bold text-ink leading-tight tracking-tight">
                Gestión eficiente, <span className="text-accent">mejores resultados</span>
              </h2>
              <p className="text-[13px] text-muted font-medium mt-2 leading-relaxed max-w-sm mx-auto">
                Coordina la información institucional, realiza el seguimiento académico y administra vacantes en tiempo real.
              </p>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: Tarjeta de Login compacta ────── */}
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-start">
            <div className="w-full max-w-[360px] bg-white p-7 sm:p-8 rounded-2xl border border-line/70 shadow-xl shadow-ink/5 flex flex-col">

              {/* Header de tarjeta */}
              <div className="mb-6 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-accent">
                    CORAULA
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-md">
                    <SecurityCheckIcon size={12} /> Gestión
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-bold text-ink tracking-tight">
                    Acceso Institucional
                  </h1>
                  <LockPasswordIcon size={20} className="text-accent" />
                </div>
                <p className="text-[12.5px] text-muted font-medium mt-1">
                  Ingresa credenciales de personal autorizado.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                      <Mail01Icon size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? 'login-admin-email-error' : undefined}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="Correo de gestión / docente"
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-neutral/30 border ${emailError ? 'border-red-400 bg-red-50/20' : 'border-line/80'} rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-accent focus:ring-3 focus:ring-accent/10 transition-all placeholder:text-muted/60 placeholder:font-normal`}
                    />
                  </div>
                  {emailError && (
                    <span id="login-admin-email-error" className="text-red-500 text-[11px] font-medium text-left ml-1">
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                      <LockKeyIcon size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      aria-invalid={passwordError ? true : undefined}
                      aria-describedby={passwordError ? 'login-admin-password-error' : undefined}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Contraseña de seguridad"
                      className={`w-full pl-10 pr-10 py-2.5 bg-neutral/30 border ${passwordError ? 'border-red-400 bg-red-50/20' : 'border-line/80'} rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-accent focus:ring-3 focus:ring-accent/10 transition-all placeholder:text-muted/60 placeholder:font-normal`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-6 min-h-6 p-1 text-muted/70 hover:text-ink transition-colors cursor-pointer"
                    >
                      {showPassword ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <span id="login-admin-password-error" className="text-red-500 text-[11px] font-medium text-left ml-1">
                      {passwordError}
                    </span>
                  )}
                </div>

                {/* Olvidaste */}
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="text-[11.5px] font-semibold text-accent hover:underline cursor-pointer bg-transparent border-0"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {errorMsg && (
                  <div role="alert" aria-live="assertive" className="text-center bg-red-50 text-red-600 text-xs py-2 px-3 rounded-xl border border-red-100 font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="group w-full py-2.5 rounded-xl bg-ink text-white font-bold text-[13px] tracking-wide hover:bg-ink/90 active:scale-[0.99] transition-all shadow-md shadow-ink/15 flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>Iniciar Sesión de Control</span>
                  <ArrowRight01Icon
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5 text-accent"
                  />
                </button>
              </form>

            </div>
          </div>

        </div>
      </main>

      <ModalRecuperacionContrasena open={modalOpen} onClose={() => setModalOpen(false)} />

        {cargando && <GlobalLoader />}
      </div>
    </GuestGuard>
  );
}
