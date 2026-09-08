'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search01Icon, 
  UserGroupIcon, 
  Tick02Icon, 
  Alert01Icon,
  FileDownloadIcon,
  ArrowRight01Icon,
  Alert02Icon,
  ChartIcon,
} from 'hugeicons-react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';

export default function AlumnosDashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  const allStudents = MOCK_GRADOS.flatMap(g => g.secciones.flatMap(s => 
    s.estudiantes.map(e => ({ ...e, grado: g.nombre, seccion: s.letra, seccionId: s.id }))
  ));
  
  const totalMatriculados = allStudents.length;
  const asistenciaHoy = Math.round(totalMatriculados * 0.95);

  const alumnosEnRiesgo = allStudents.filter(s => s.enRiesgo);
  const alumnosConIncidencias = allStudents.filter(s => s.incidencias && s.incidencias.length > 0);

  // Simulación de promedios para el gráfico
  const rendimientos = {
    sobresaliente: Math.round(totalMatriculados * 0.25), // 18-20
    bueno: Math.round(totalMatriculados * 0.45),         // 16-17
    regular: Math.round(totalMatriculados * 0.20),       // 12-15
    reprobado: Math.round(totalMatriculados * 0.10)      // Menos de 12
  };
  
  // Cálculo de los ángulos para el pie chart (donut) usando CSS conic-gradient
  const totalP = totalMatriculados || 1;
  const p1 = (rendimientos.sobresaliente / totalP) * 100;
  const p2 = (rendimientos.bueno / totalP) * 100;
  const p3 = (rendimientos.regular / totalP) * 100;
  
  const conicGradient = `conic-gradient(
    #3b82f6 0% ${p1}%, 
    #10b981 ${p1}% ${p1 + p2}%, 
    #f59e0b ${p1 + p2}% ${p1 + p2 + p3}%, 
    #ef4444 ${p1 + p2 + p3}% 100%
  )`;

  return (
    <div className="w-full h-full p-8 md:p-10 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* HEADER Y ACCESO RÁPIDO EXPORTAR */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
            Visión General
          </span>
          <h1 className="text-ink text-2xl font-extrabold mt-1 tracking-tight">
            Dashboard de Alumnos
          </h1>
        </div>

        <div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-line shadow-sm hover:bg-neutral transition-colors text-ink text-xs font-bold">
            <FileDownloadIcon size={16} className="text-accent" />
            <span>Exportar Listado (Excel)</span>
          </button>
        </div>
      </div>

      {/* TOP ROW: 3 COLUMNS (KPIS REDUCIDOS Y NAVEGACIÓN A VACANTES) */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI: Total Matriculados */}
        <div className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Total Matriculados</p>
            <p className="text-2xl font-black text-ink">{totalMatriculados}</p>
          </div>
          <div className="w-10 h-10 bg-neutral rounded-full flex items-center justify-center text-accent relative z-10">
            <UserGroupIcon size={20} />
          </div>
          <UserGroupIcon size={90} className="absolute -right-5 -bottom-5 text-neutral/40 transition-transform group-hover:scale-110" />
        </div>

        {/* KPI: Ingresados */}
        <div className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group border-l-4 border-l-success">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Ingresados Hoy (QR)</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-ink">{asistenciaHoy}</p>
              <p className="text-xs font-bold text-muted mb-0.5">/ {totalMatriculados}</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success-ink relative z-10">
            <Tick02Icon size={20} />
          </div>
        </div>

        {/* KPI: Vacantes Disponibles */}
        <Link 
          href="/administrador/alumnos/vacantes" 
          className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-accent/50 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Cantidad de Vacantes</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-emerald-600">{allStudents.length > 0 ? 45 : 0}</p>
              <span className="text-[10px] font-bold text-accent flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                Gestionar <ArrowRight01Icon size={12} />
              </span>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 relative z-10">
            <UserGroupIcon size={20} />
          </div>
        </Link>
      </div>

      {/* BOTTOM ROW: 3 COLUMNS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Alumnos en Riesgo */}
        <div className="bg-white rounded-2xl border border-line shadow-sm flex flex-col overflow-hidden h-[400px]">
          <div className="p-4 border-b border-line flex items-center justify-between shrink-0 bg-neutral/30">
            <h2 className="text-xs font-black text-ink uppercase tracking-widest flex items-center gap-2">
              <Alert02Icon size={16} className="text-rose-500" /> Riesgo
            </h2>
            <span className="bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-black">
              {alumnosEnRiesgo.length} alumnos
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2 overflow-y-auto flex-1">
            {alumnosEnRiesgo.length > 0 ? (
              alumnosEnRiesgo.map(est => (
                <div key={est.id} className="flex items-center justify-between p-2.5 rounded-xl bg-neutral/50 hover:bg-neutral transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      {est.nombres.charAt(0)}{est.apellidos.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-ink leading-tight truncate max-w-[120px]">{est.nombres} {est.apellidos}</p>
                      <p className="text-[9px] font-semibold text-muted mt-0.5">{est.grado} - Sec. {est.seccion}</p>
                    </div>
                  </div>
                  <Link href={`/administrador/alumnos/alumnado/${est.seccionId}/estudiante/${est.id}`}>
                    <ArrowRight01Icon size={14} className="text-muted hover:text-accent cursor-pointer" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted">
                No hay alumnos en riesgo detectados.
              </div>
            )}
          </div>
        </div>

        {/* Incidencias Urgentes */}
        <div className="bg-white rounded-2xl border border-line shadow-sm flex flex-col overflow-hidden h-[400px]">
          <div className="p-4 border-b border-line flex items-center justify-between shrink-0 bg-neutral/30">
            <h2 className="text-xs font-black text-ink uppercase tracking-widest flex items-center gap-2">
              <Alert01Icon size={16} className="text-amber-500" /> Incidencias
            </h2>
            <span className="bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full text-[10px] font-black">
              {alumnosConIncidencias.length} urgentes
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2 overflow-y-auto flex-1">
            {alumnosConIncidencias.length > 0 ? (
              alumnosConIncidencias.map(est => (
                <div key={est.id} className="flex flex-col gap-2 p-3 rounded-xl border border-amber-100 bg-amber-50/30 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl"></div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-ink truncate max-w-[150px]">{est.nombres} {est.apellidos}</p>
                      <p className="text-[9px] font-semibold text-muted">{est.grado} - Sec. {est.seccion}</p>
                    </div>
                  </div>
                  <ul className="mt-1 flex flex-col gap-1">
                    {est.incidencias?.map((inc, i) => (
                      <li key={i} className="text-[10px] font-medium text-amber-800 flex items-center gap-1.5 leading-tight">
                        <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0"></span>
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted">
                No hay incidencias urgentes.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Rendimiento */}
        <div className="bg-white rounded-2xl border border-line shadow-sm flex flex-col h-[400px] overflow-hidden">
          <div className="p-4 border-b border-line shrink-0 bg-neutral/30 flex items-center justify-between">
            <h2 className="text-xs font-black text-ink uppercase tracking-widest flex items-center gap-2">
              <ChartIcon size={16} className="text-accent" /> Rendimiento Global
            </h2>
            <span className="text-[10px] font-extrabold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              Promedio General
            </span>
          </div>
          
          <div className="flex-1 p-5 flex flex-col items-center justify-center relative">
            
            {/* Donut Chart con Sombra y Anillo Elegante */}
            <div className="relative w-44 h-44 mb-6 flex items-center justify-center p-1 rounded-full bg-neutral/40 shadow-inner">
              <div 
                className="absolute inset-2 rounded-full shadow-lg transition-transform duration-500 hover:scale-105"
                style={{ background: conicGradient }}
              />
              <div className="absolute inset-6 rounded-full bg-white/95 backdrop-blur-md shadow-md flex flex-col items-center justify-center border border-line/50">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Alumnos</span>
                <span className="text-2xl font-black text-ink">{totalMatriculados}</span>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
                  95% Asistencia
                </span>
              </div>
            </div>

            {/* Leyendas con tarjetas micro-badge */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/50 border border-blue-100/60">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-blue-950">Sobresaliente</span>
                  <span className="text-[9px] font-semibold text-blue-700">18-20 ({p1.toFixed(0)}%)</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/60">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-emerald-950">Bueno</span>
                  <span className="text-[9px] font-semibold text-emerald-700">16-17 ({p2.toFixed(0)}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/50 border border-amber-100/60">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-amber-950">Regular</span>
                  <span className="text-[9px] font-semibold text-amber-700">12-15 ({p3.toFixed(0)}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/50 border border-rose-100/60">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-rose-950">En Déficit</span>
                  <span className="text-[9px] font-semibold text-rose-700">{'<'} 12 ({(100 - p1 - p2 - p3).toFixed(0)}%)</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
