// src/components/padres/SelectorHijosWelcome.tsx
'use client';

import React, { useContext } from 'react';
import Image from 'next/image';
import { usePadre } from './PadreContext';
import { Logout01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { AuthContext } from '@/contexts/AuthContext';

export const SelectorHijosWelcome: React.FC = () => {
  const { padre, hijos, setSelectedHijoId } = usePadre();
  const authContext = useContext(AuthContext);

  const handleLogout = () => {
    if (authContext) {
      authContext.logout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111827] text-white">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-900/20 via-[#111827] to-blue-900/20 pointer-events-none" />

      {/* Header (Logout) */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg">
            C
          </div>
          <span className="font-bold text-xl tracking-tight">CORAULA</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm border border-white/10 cursor-pointer"
        >
          <Logout01Icon size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col items-center animate-in fade-in zoom-in duration-500 delay-150">
        <h1 className="text-3xl md:text-5xl font-black text-center mb-2 tracking-tight">
          ¡Hola, {padre?.nombres || 'Padre de familia'}!
        </h1>
        <p className="text-slate-400 text-lg md:text-xl text-center mb-12">
          ¿Qué perfil académico deseas revisar hoy?
        </p>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {hijos.map((hijo) => (
            <button
              key={hijo.id}
              onClick={() => setSelectedHijoId(hijo.id)}
              className="group flex flex-col items-center focus:outline-none transition-transform hover:scale-105 duration-300 cursor-pointer"
            >
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden mb-4 border-4 border-transparent group-hover:border-rose-500 transition-colors shadow-2xl bg-slate-800">
                {hijo.fotoUrl ? (
                  <Image
                    src={hijo.fotoUrl}
                    alt={hijo.nombreCompleto}
                    fill
                    className="object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-500 group-hover:text-rose-400 group-hover:bg-slate-700 transition-colors">
                    {hijo.nombres.charAt(0)}
                  </div>
                )}
                {/* Overlay gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <ArrowRight01Icon className="text-white transform translate-y-4 group-hover:translate-y-0 transition-transform" />
                </div>
              </div>
              <span className="text-xl font-semibold text-slate-300 group-hover:text-white transition-colors text-center">
                {hijo.nombres.split(' ')[0]}
              </span>
              <span className="text-sm text-slate-500 mt-1">
                {hijo.grado} &quot;{hijo.seccion}&quot;
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
