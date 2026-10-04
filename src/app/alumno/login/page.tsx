// src/app/alumno/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useAlumnoSession } from '@/components/alumno/AlumnoSessionContext';
import { User, Lock, Eye, EyeOff, LogIn, GraduationCap } from 'lucide-react';

export default function AlumnoLoginPage() {
  const { login } = useAlumnoSession();
  const [usuario, setUsuario] = useState('atorres_2026');
  const [contrasenia, setContrasenia] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!usuario.trim()) {
      setErrorMsg('Por favor ingresa tu nombre de usuario o DNI.');
      return;
    }
    if (!contrasenia.trim()) {
      setErrorMsg('Por favor ingresa tu contraseña institucional.');
      return;
    }

    setCargando(true);

    try {
      // Simulación de respuesta de autenticación mock
      // TODO(backend): Enlazar aquí con el endpoint real de login:
      // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/alumno/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ usuario: usuario.trim(), contrasenia: contrasenia.trim() })
      // });
      await new Promise((res) => setTimeout(res, 600));

      const success = await login(usuario, contrasenia);
      if (!success) {
        setErrorMsg('Credenciales inválidas. Revisa tu usuario y contraseña.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-md">
        {/* Card Contenedor */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-lg p-6 sm:p-8 flex flex-col gap-6">
          {/* Brand Header */}
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center mb-3 shadow-2xs">
              <GraduationCap className="w-6 h-6" />
            </div>

            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight text-[#BE123C] leading-tight">
              CORAULA
            </h1>
            <span className="text-xs text-[#6B7280] font-normal block mt-0.5">
              Gestión educativa · Colegio San Marcos
            </span>

            <div className="mt-2.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#FFE4E6] text-[#BE123C]">
                Portal del Alumno
              </span>
            </div>
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Formulario de Login */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Campo Usuario */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="usuario"
                className="text-xs font-bold text-[#111827]"
              >
                Usuario o Código de Estudiante
              </label>
              <div className="flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 focus-within:border-[#BE123C] focus-within:ring-2 focus-within:ring-[#BE123C]/20 transition-all">
                <User className="w-4 h-4 text-[#6B7280] shrink-0" />
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="ej. atorres o 74128905"
                  className="w-full bg-transparent outline-none text-xs text-[#111827] placeholder:text-[#6B7280]"
                  disabled={cargando}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="flex flex-col gap-1.5 text-left">
              <label
                htmlFor="contrasenia"
                className="text-xs font-bold text-[#111827]"
              >
                Contraseña Institucional
              </label>
              <div className="flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 focus-within:border-[#BE123C] focus-within:ring-2 focus-within:ring-[#BE123C]/20 transition-all">
                <Lock className="w-4 h-4 text-[#6B7280] shrink-0" />
                <input
                  id="contrasenia"
                  type={showPassword ? 'text' : 'password'}
                  value={contrasenia}
                  onChange={(e) => setContrasenia(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-xs text-[#111827] placeholder:text-[#6B7280]"
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#6B7280] hover:text-[#111827] focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón Iniciar Sesión */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-2 w-full py-3 px-4 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#BE123C]/30"
            >
              {cargando ? (
                <span>Ingresando al sistema...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Credenciales de Prueba Mock Hint */}
          <div className="pt-4 border-t border-[#E5E7EB] text-center">
            <span className="text-[11px] text-[#6B7280] block">
              Modo desarrollo: Ingresa cualquier usuario y contraseña para ingresar con el perfil de <strong>Ana Torres</strong>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#6B7280] mt-4">
          Colegio San Marcos · Sistema CORAULA 2026
        </p>
      </div>
    </div>
  );
}
