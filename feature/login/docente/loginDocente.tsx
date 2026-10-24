'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail01Icon,
  LockKeyIcon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  TeacherIcon,
} from 'hugeicons-react';
import { GraduationCap } from 'lucide-react';
import { authService } from '@/services/authService';
import { AuthContext } from '@/contexts/AuthContext';
import { isAxiosError } from 'axios';

export default function LoginDocente() {
  const router = useRouter();
  const authContext = React.useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cargando) return;
    if (!authContext) { setErrorMsg('No se pudo inicializar la sesión. Recarga la página.'); return; }
    setCargando(true);
    setErrorMsg(null);

    try {
      // 1. Intento de autenticación real contra el backend
      const response = await authService.login(email, password);

      if (response.role === 'DOCENTE') {
        authContext.login(response.token, response.role);
        router.push('/docente');
        return;
      }

      if (response.role === 'ADMINISTRADOR' || response.role === 'DIRECTIVO') {
        if (authContext) authContext.login(response.token, response.role);
        router.push('/administrador');
        return;
      }

      setErrorMsg('Esta cuenta no tiene permisos de docente.');
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 400) setErrorMsg('Revisa los datos ingresados.');
        else if (status === 401) setErrorMsg('Credenciales inválidas en el servidor.');
        else if (status === 403) setErrorMsg('Tu cuenta docente se encuentra deshabilitada.');
        else if (status === 423) setErrorMsg('Cuenta bloqueada por intentos fallidos.');
        else setErrorMsg('Error de autenticación. Inténtalo más tarde.');
      } else {
        setErrorMsg('Error de conexión con el servidor.');
      }
    } finally {
      setCargando(false);
    }
  };

  React.useEffect(() => {
    // Si ya está autenticado específicamente como DOCENTE, enviarlo al dashboard
    if (authContext?.status === 'authenticated' && authContext?.role === 'DOCENTE') {
      router.replace('/docente');
    }
  }, [authContext, router]);

  return (
    <div className="w-screen h-screen min-h-screen bg-[#FAF9F6] flex flex-col font-sans overflow-hidden relative justify-center items-center">
      {/* ── CÍRCULOS DECORATIVOS ───────────────────────── */}
        <div className="absolute -top-14 -right-14 w-36 h-36 rounded-full border-[16px] border-[#BE123C]/20 z-0 pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-[#BE123C]/10 z-0 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-44 h-44 rounded-full border border-ink/10 z-0 pointer-events-none" />
        <div className="absolute -bottom-24 -right-20 w-56 h-56 rounded-full bg-ink/5 z-0 pointer-events-none" />
        <div className="absolute bottom-8 right-8 w-40 h-40 rounded-full border border-[#BE123C]/30 z-0 pointer-events-none" />

        {/* ── CONTENIDO PRINCIPAL ──────────────────────────── */}
        <main className="relative z-10 w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-6 flex flex-col items-center justify-center h-full">
          <div className="w-full mb-6 flex justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-bold text-muted hover:text-[#BE123C] transition-colors bg-white/70 backdrop-blur-md px-4 py-2 rounded-xl border border-line/60 shadow-sm"
            >
              &larr; Volver a selección de portales
            </Link>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 bg-white/40 lg:bg-transparent backdrop-blur-xs p-6 lg:p-0 rounded-3xl border border-line/30 lg:border-none shadow-sm lg:shadow-none">
            {/* ── COLUMNA IZQUIERDA ── */}
            <div className="hidden lg:flex lg:col-span-7 flex-col items-center justify-center gap-5 pr-6 border-r border-line/40">
              <div className="relative w-full max-w-sm">
                <Image
                  src="/security.png"
                  alt="Ilustración CORAULA Docente"
                  width={420}
                  height={420}
                  priority
                  className="object-contain w-full h-auto drop-shadow-md"
                />
              </div>

              <div className="text-center max-w-md">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4E6] text-[#BE123C] text-[11px] font-bold tracking-wider uppercase mb-2">
                  <TeacherIcon size={14} /> Portal del Docente
                </span>
                <h2 className="text-[26px] font-bold text-ink leading-tight tracking-tight">
                  Enseñanza y seguimiento <span className="text-[#BE123C]">académico</span>
                </h2>
                <p className="text-[13px] text-muted font-medium mt-2 leading-relaxed max-w-sm mx-auto">
                  Accede a tus cursos asignados, califica actividades, toma asistencia y comunica novedades a tus estudiantes en tiempo real.
                </p>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Tarjeta de Login ────── */}
            <div className="w-full lg:col-span-5 flex justify-center lg:justify-start">
              <div className="w-full max-w-[370px] bg-white p-7 sm:p-8 rounded-2xl border border-line/70 shadow-xl shadow-ink/5 flex flex-col">
                {/* Header de tarjeta */}
                <div className="mb-5 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#BE123C]">
                      CORAULA
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FFE4E6] text-[#BE123C] px-2 py-0.5 rounded-md">
                      <GraduationCap className="w-3.5 h-3.5" /> Docente
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[22px] font-bold text-ink tracking-tight">
                      Acceso Docente
                    </h1>
                  </div>
                  <p className="text-[12.5px] text-muted font-medium mt-1">
                    Ingresa con tu correo institucional asignado.
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  {/* Email */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[11.5px] font-semibold text-ink">Correo institucional</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                        <Mail01Icon size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Correo institucional"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-[#BE123C] focus:ring-3 focus:ring-[#BE123C]/10 transition-all placeholder:text-muted/60"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[11.5px] font-semibold text-ink">Contraseña</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                        <LockKeyIcon size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-neutral/30 border border-line/80 rounded-xl text-[13px] font-medium text-ink outline-none focus:bg-white focus:border-[#BE123C] focus:ring-3 focus:ring-[#BE123C]/10 transition-all placeholder:text-muted/60"
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
                  </div>

                  {errorMsg && (
                    <div role="alert" className="text-center bg-red-50 text-red-600 text-xs py-2 px-3 rounded-xl border border-red-100 font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {/* Botón enviar */}
                  <button
                    type="submit"
                    disabled={cargando}
                    className="w-full mt-2 bg-[#BE123C] hover:bg-[#9F1239] text-white font-bold text-[13.5px] py-2.5 px-4 rounded-xl shadow-md shadow-[#BE123C]/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>{cargando ? 'Validando credenciales...' : 'Ingresar al Portal Docente'}</span>
                    <ArrowRight01Icon size={16} />
                  </button>

                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
}
