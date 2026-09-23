'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail01Icon,
  LockKeyIcon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  SecurityCheckIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
} from 'hugeicons-react';
import { GlobalLoader } from '@/components/GlobalLoader';

export default function AdminSecurityLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Estado para el modal de recuperación de contraseña
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setTimeout(() => {
      setCargando(false);
      router.push('/administrador');
    }, 2500);
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setLoadingRecovery(true);
    setTimeout(() => {
      setLoadingRecovery(false);
      setStep(2);
    }, 1000);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingRecovery(true);
    setTimeout(() => {
      setLoadingRecovery(false);
      setStep(3);
    }, 1000);
  };

  const closeResetModal = () => {
    setModalOpen(false);
    setStep(1);
    setRecoveryEmail('');
    setCode(['', '', '', '', '', '']);
  };

  return (
    <div className="w-screen h-screen min-h-screen bg-[#FAF9F6] flex flex-col font-sans overflow-hidden relative justify-center items-center">

      {/* ── CÍRCULOS DECORATIVOS ───────────────────────── */}
      <div className="absolute -top-14 -right-14 w-36 h-36 rounded-full border-[16px] border-accent/80 z-0 pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-accent/90 z-0 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-44 h-44 rounded-full border border-ink/20 z-0 pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-56 h-56 rounded-full bg-ink z-0 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-40 h-40 rounded-full border border-accent/80 z-0 pointer-events-none" />

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────── */}
      <main className="relative z-10 w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-6 flex items-center justify-center">
        
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
              <h2 className="text-[26px] font-black text-ink leading-tight tracking-tight">
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
                  <span className="text-[11px] font-extrabold tracking-widest uppercase text-accent">
                    CORAULA
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-md">
                    <SecurityCheckIcon size={12} /> Gestión
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-black text-ink tracking-tight">
                    Acceso Institucional
                  </h1>
                  <LockPasswordIcon size={20} className="text-accent" />
                </div>
                <p className="text-[12.5px] text-muted font-medium mt-1">
                  Ingresa credenciales de personal autorizado.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

                {/* Email */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                    <Mail01Icon size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo de gestión / docente"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-accent focus:ring-3 focus:ring-accent/10 transition-all placeholder:text-muted/60 placeholder:font-normal"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                    <LockKeyIcon size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de seguridad"
                    className="w-full pl-10 pr-10 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-accent focus:ring-3 focus:ring-accent/10 transition-all placeholder:text-muted/60 placeholder:font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/70 hover:text-ink transition-colors cursor-pointer"
                  >
                    {showPassword ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                  </button>
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

              {/* Divisor */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line/60" />
                </div>
                <span className="relative bg-white px-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                  o autenticar con
                </span>
              </div>

              {/* Sociales compactos */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral/20 border border-line/60 rounded-lg hover:bg-neutral/50 transition-all text-[11px] font-semibold text-ink cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral/20 border border-line/60 rounded-lg hover:bg-neutral/50 transition-all text-[11px] font-semibold text-ink cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.16-1.9-14.49-6.09-3.26-2.63-7.14-7.27-11.64-13.94-6.42-9.5-11.41-19.98-14.97-31.42-3.56-11.45-5.34-22.18-5.34-32.19 0-14.2 3.63-25.96 10.9-35.27 7.27-9.32 16.5-14.07 27.69-14.26 4.82 0 10.05 1.25 15.68 3.75 5.63 2.5 9.53 3.75 11.7 3.75 1.95 0 5.92-1.3 11.91-3.9 5.99-2.6 11.13-3.8 15.42-3.6 12.28.6 22.25 5.17 29.91 13.72-10.97 6.64-16.32 15.82-16.05 27.54.27 9.17 3.86 16.77 10.77 22.81 6.91 6.04 15.08 9.38 24.51 10.02-2.39 7.15-5.61 14.37-9.66 21.66zM119.22 31.84c0-7.07 2.59-13.88 7.78-20.43 5.19-6.55 11.75-10.7 19.68-12.44.11.98.16 1.85.16 2.61 0 6.96-2.66 13.77-7.98 20.43-5.32 6.66-11.83 10.84-19.53 12.55-.05-.76-.11-1.67-.11-2.72z" />
                  </svg>
                  Apple
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 py-2 px-2 bg-neutral/20 border border-line/60 rounded-lg hover:bg-neutral/50 transition-all text-[11px] font-semibold text-ink cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H1z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Microsoft
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── MODAL RECUPERACIÓN DE CONTRASEÑA ─────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-line/80 shadow-2xl p-6 relative">
            <button
              onClick={closeResetModal}
              className="absolute right-4 top-4 text-muted hover:text-ink cursor-pointer"
            >
              <Cancel01Icon size={18} />
            </button>

            {step === 1 && (
              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                    <SecurityCheckIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink">Recuperar acceso</h3>
                    <p className="text-[12px] text-muted font-medium">Paso 1 de 2: Ingresa tu correo</p>
                  </div>
                </div>

                <p className="text-[12.5px] text-muted leading-relaxed">
                  Te enviaremos un código de seguridad de 6 dígitos a tu casilla registrada.
                </p>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70">
                    <Mail01Icon size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Correo de gestión / docente"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:border-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingRecovery}
                  className="w-full py-2.5 bg-ink text-white font-bold text-[13px] rounded-xl shadow-md hover:bg-ink/90 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loadingRecovery ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Enviar código de seguridad</span>
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                    <SecurityCheckIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-ink">Código enviado</h3>
                    <p className="text-[12px] text-muted font-medium">Paso 2 de 2: Verifica el código</p>
                  </div>
                </div>

                <p className="text-[12.5px] text-muted leading-relaxed">
                  Ingresa el código enviado a <strong className="text-ink">{recoveryEmail}</strong>.
                </p>

                {/* Slots de código de verificación */}
                <div className="flex justify-between gap-1.5 my-1">
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newCode = [...code];
                        newCode[idx] = val;
                        setCode(newCode);
                        if (val && e.target.nextElementSibling) {
                          (e.target.nextElementSibling as HTMLInputElement).focus();
                        }
                      }}
                      className="w-10 h-11 text-center bg-neutral/30 border border-line rounded-xl text-base font-black text-ink outline-none focus:border-accent focus:bg-white"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loadingRecovery}
                  className="w-full py-2.5 bg-ink text-white font-bold text-[13px] rounded-xl shadow-md hover:bg-ink/90 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {loadingRecovery ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Verificar código</span>
                  )}
                </button>
              </form>
            )}

            {step === 3 && (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckmarkCircle02Icon size={28} />
                </div>
                <h3 className="text-base font-black text-ink">¡Autenticación Exitosa!</h3>
                <p className="text-[12.5px] text-muted leading-relaxed">
                  Se ha enviado un enlace de restablecimiento seguro a tu dirección corporativa.
                </p>
                <button
                  onClick={closeResetModal}
                  className="w-full py-2.5 mt-2 bg-ink text-white font-bold text-[13px] rounded-xl cursor-pointer"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cargando && <GlobalLoader />}
    </div>
  );
}