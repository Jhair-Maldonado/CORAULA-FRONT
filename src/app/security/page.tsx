'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Mail01Icon, 
  LockKeyIcon, 
  ViewIcon, 
  ViewOffIcon,
  ArrowRight01Icon
} from 'hugeicons-react';

export default function SecurityLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    setTimeout(() => {
      setCargando(false);
      router.push('/administrador');
    }, 1000);
  };

  return (
    <div className="w-screen h-screen min-h-screen bg-[#FAF9F6] flex font-sans overflow-hidden relative">
      
      {/* CÍRCULO DECORATIVO SUPERIOR DERECHO (ROJO) */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border-[28px] border-accent z-0 pointer-events-none opacity-90" />
      
      {/* CÍRCULO DECORATIVO INFERIOR DERECHO (NEGRO SÓLIDO) */}
      <div className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-ink z-0 pointer-events-none" />

      {/* CÍRCULO DECORATIVO INFERIOR IZQUIERDO (ROJO SÓLIDO Y LÍNEA INTERNA) */}
      <div className="absolute -bottom-36 -left-32 w-96 h-96 rounded-full bg-accent z-0 pointer-events-none overflow-hidden">
        <div className="w-full h-full rounded-full border border-black/20" />
      </div>
      <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full border border-ink/40 z-0 pointer-events-none" />

      {/* SECCIÓN IZQUIERDA: IMAGEN A PANTALLA COMPLETA GRANDES PROPORCIONES */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-8 lg:p-12 relative z-10 border-r border-line/40">
        <div className="relative w-full max-w-lg h-[80vh] flex items-center justify-center">
          <Image 
            src="/login.png" 
            alt="Ilustración CORAULA" 
            width={550} 
            height={550}
            priority
            className="object-contain drop-shadow-md scale-105"
          />
        </div>
      </div>

      {/* SECCIÓN DERECHA: LOGO CORAULA SEMI PEQUEÑO + FRASE + FORMULARIO */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-14 lg:p-16 relative z-10 my-auto">
        
        <div className="max-w-md w-full mx-auto flex flex-col gap-6">
          
          {/* LOGO CORAULA SEMI PEQUEÑO */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white font-extrabold text-sm shadow-xs tracking-tight">
              C
            </div>
            <span className="text-xl font-black text-ink tracking-tight">
              CORAULA
            </span>
          </div>

          {/* MENSAJE DE TU APRENDIZAJE SIN LÍMITES */}
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-ink tracking-tight leading-snug">
              Tu aprendizaje, <br />
              <span className="text-accent">sin límites</span>
            </h2>
            <p className="text-muted text-xs font-semibold mt-1.5 leading-relaxed">
              Bienvenido de nuevo, ingresa tus credenciales institucionales para acceder a tu cuenta.
            </p>
          </div>

          {/* FORMULARIO DE INICIO DE SESIÓN */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            
            {/* CORREO ELECTRÓNICO */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <Mail01Icon size={18} />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-line/80 rounded-2xl text-xs font-bold text-ink outline-none focus:border-accent transition-colors shadow-xs placeholder:text-muted/60"
              />
            </div>

            {/* CONTRASEÑA */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <LockKeyIcon size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full pl-11 pr-11 py-3.5 bg-white border border-line/80 rounded-2xl text-xs font-bold text-ink outline-none focus:border-accent transition-colors shadow-xs placeholder:text-muted/60"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors cursor-pointer"
              >
                {showPassword ? <ViewOffIcon size={18} /> : <ViewIcon size={18} />}
              </button>
            </div>

            {/* OLVIDASTE CONTRASEÑA */}
            <div className="flex justify-end">
              <button type="button" className="text-[11px] font-bold text-accent hover:underline cursor-pointer bg-transparent border-0">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* BOTÓN INICIAR SESIÓN */}
            <button 
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 rounded-2xl bg-accent text-white font-extrabold text-sm hover:bg-accent/90 transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {cargando ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight01Icon size={18} />
                </>
              )}
            </button>
          </form>

          {/* O CONTINÚA CON */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/60" />
            </div>
            <span className="relative bg-[#FAF9F6] px-3 text-[11px] font-bold text-muted uppercase tracking-wider">
              o continúa con
            </span>
          </div>

          {/* BOTONES SOCIALES: GOOGLE, APPLE, MICROSOFT */}
          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-line/80 rounded-xl hover:bg-neutral/40 transition-colors text-xs font-bold text-ink cursor-pointer shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>

            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-line/80 rounded-xl hover:bg-neutral/40 transition-colors text-xs font-bold text-ink cursor-pointer shadow-xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.16-1.9-14.49-6.09-3.26-2.63-7.14-7.27-11.64-13.94-6.42-9.5-11.41-19.98-14.97-31.42-3.56-11.45-5.34-22.18-5.34-32.19 0-14.2 3.63-25.96 10.9-35.27 7.27-9.32 16.5-14.07 27.69-14.26 4.82 0 10.05 1.25 15.68 3.75 5.63 2.5 9.53 3.75 11.7 3.75 1.95 0 5.92-1.3 11.91-3.9 5.99-2.6 11.13-3.8 15.42-3.6 12.28.6 22.25 5.17 29.91 13.72-10.97 6.64-16.32 15.82-16.05 27.54.27 9.17 3.86 16.77 10.77 22.81 6.91 6.04 15.08 9.38 24.51 10.02-2.39 7.15-5.61 14.37-9.66 21.66zM119.22 31.84c0-7.07 2.59-13.88 7.78-20.43 5.19-6.55 11.75-10.7 19.68-12.44.11.98.16 1.85.16 2.61 0 6.96-2.66 13.77-7.98 20.43-5.32 6.66-11.83 10.84-19.53 12.55-.05-.76-.11-1.67-.11-2.72z"/>
              </svg>
              Apple
            </button>

            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white border border-line/80 rounded-xl hover:bg-neutral/40 transition-colors text-xs font-bold text-ink cursor-pointer shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H1z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

