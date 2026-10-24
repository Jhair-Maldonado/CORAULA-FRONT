'use client';

import React, { useState } from 'react';
import { BookOpen01Icon } from 'hugeicons-react';

// === MOCKS ===

// Main View Data
const RAW_CURSOS = [
  { 
    nombre: 'Ciencias Naturales', profesor: 'Carla Ruiz', 
    b1: 10.5, b2: null, b3: null, b4: null, promedio: 10.5 
  },
  { 
    nombre: 'Inglés', profesor: 'Sarah Smith', 
    b1: 12.0, b2: null, b3: null, b4: null, promedio: 12.0 
  },
  { 
    nombre: 'Historia', profesor: 'Jorge Luna', 
    b1: 14.0, b2: null, b3: null, b4: null, promedio: 14.0 
  },
  { 
    nombre: 'Comunicación', profesor: 'Ana Soto', 
    b1: 15.0, b2: null, b3: null, b4: null, promedio: 15.0 
  },
  { 
    nombre: 'Matemáticas', profesor: 'Luis Vega', 
    b1: 16.5, b2: null, b3: null, b4: null, promedio: 16.5 
  },
  { 
    nombre: 'Arte', profesor: 'Elena Paz', 
    b1: 18.0, b2: null, b3: null, b4: null, promedio: 18.0 
  },
];

const MOCK_CURSOS = [...RAW_CURSOS].sort((a, b) => a.promedio - b.promedio);

// Inner View Data (Competencias)
// El "mes actual" simulado es Abril (índice 3 en el arreglo Ene-Ago)
const MES_ACTUAL_IDX = 3; 

const MOCK_COMPETENCIAS = [
  {
    competencia: 'Indaga mediante métodos científicos para construir sus conocimientos',
    notas: [11, 10, 12, 11, null, null, null, null] // Ene, Feb, Mar, Abr, May, Jun, Jul, Ago
  },
  {
    competencia: 'Explica el mundo físico basándose en conocimientos sobre los seres vivos',
    notas: [10, 9, 11, 10, null, null, null, null]
  },
  {
    competencia: 'Diseña y construye soluciones tecnológicas para resolver problemas',
    notas: [12, 11, 10, 12, null, null, null, null]
  }
];

export function TabCalificaciones() {
  const [selectedCurso, setSelectedCurso] = useState<typeof MOCK_CURSOS[0] | null>(null);

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      {!selectedCurso ? (
        // =========================================================
        // VISTA PRINCIPAL: LISTADO DE CURSOS (TABLA)
        // =========================================================
        <div className="flex flex-col h-full bg-white border border-line rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-line bg-neutral/50 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-ink uppercase tracking-wider">
              Resumen Anual de Calificaciones
            </h3>
            <span className="text-[9px] font-bold bg-white border border-line px-2 py-1 rounded-md text-muted">
              Año Escolar 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-line">
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider w-32 border-r border-line">Estado</th>
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider border-r border-line">Curso</th>
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line w-20">Bimestre 1</th>
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line w-20">Bimestre 2</th>
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line w-20">Bimestre 3</th>
                  <th className="p-3 text-[9px] font-bold text-muted uppercase tracking-wider text-center border-r border-line w-20">Bimestre 4</th>
                  <th className="p-3 text-[9px] font-black text-ink uppercase tracking-wider text-center w-24">Promedio</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-medium text-ink">
                {MOCK_CURSOS.map((curso, idx) => {
                  const isFailing = curso.promedio < 11;
                  const isWarning = curso.promedio >= 11 && curso.promedio < 13;
                  
                  const badgeClass = isFailing 
                    ? 'bg-accent text-white' 
                    : isWarning 
                    ? 'bg-warning-ink text-white' 
                    : 'bg-success text-success-ink border border-success font-bold';
                    
                  const badgeText = isFailing ? 'DESAPROBADO' : isWarning ? 'EN RIESGO' : 'APROBADO';
                  const bgRow = isFailing ? 'bg-accent-soft/10' : isWarning ? 'bg-amber-50/50' : 'hover:bg-neutral';

                  return (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedCurso(curso)}
                      className={`border-b border-line transition-colors cursor-pointer group ${bgRow}`}
                    >
                      <td className="p-3 border-r border-line">
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-md ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="p-3 border-r border-line">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isFailing ? 'bg-accent-soft text-accent' : isWarning ? 'bg-[#FEF3C7] text-warning-ink' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all'}`}>
                            <BookOpen01Icon size={14} />
                          </div>
                          <div>
                            <p className={`text-[11px] font-bold ${isFailing ? 'text-accent' : 'text-ink'}`}>{curso.nombre}</p>
                            <p className="text-[9px] text-muted">Prof. {curso.profesor}</p>
                          </div>
                        </div>
                      </td>
                      {/* Bimestres */}
                      {[curso.b1, curso.b2, curso.b3, curso.b4].map((notaBim, bIdx) => (
                        <td key={bIdx} className="p-3 text-center border-r border-line">
                          {notaBim !== null ? (
                            <span className={`font-bold ${notaBim < 11 ? 'text-accent' : notaBim < 13 ? 'text-warning-ink' : 'text-ink'}`}>
                              {notaBim.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      {/* Promedio General */}
                      <td className="p-3 text-center bg-slate-50/50">
                        <span className={`text-[11px] font-black ${isFailing ? 'text-accent' : isWarning ? 'text-warning-ink' : 'text-success-ink'}`}>
                          {curso.promedio.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // =========================================================
        // VISTA INTERNA: TABLA DE COMPETENCIAS (DOBLE CABECERA)
        // =========================================================
        <div className="flex-1 border border-line rounded-xl overflow-hidden flex flex-col bg-white shadow-sm">
          {/* Header del Curso */}
          <div className="bg-neutral/50 border-b border-line p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedCurso(null)}
                className="text-[10px] font-bold text-ink hover:text-accent flex items-center gap-1 bg-white border border-line hover:border-accent-soft px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                ← Volver al listado
              </button>
              <div>
                <h3 className="text-sm font-black text-ink">{selectedCurso.nombre}</h3>
                <p className="text-[10px] font-medium text-muted">Profesor: {selectedCurso.profesor}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg border ${
                selectedCurso.promedio < 11 ? 'bg-accent text-white border-accent' :
                selectedCurso.promedio < 13 ? 'bg-warning-ink text-white border-warning-ink' :
                'bg-success-ink text-white border-success-ink'
              }`}>
                Promedio General: {selectedCurso.promedio.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Tabla de Competencias */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                {/* Primera Fila: Bimestres */}
                <tr className="bg-slate-100 border-b border-line">
                  <th rowSpan={2} className="p-3 text-[10px] font-black text-ink uppercase tracking-wider border-r border-line align-bottom w-[30%]">
                    Competencias Evaluadas
                  </th>
                  <th colSpan={2} className="p-2 text-[10px] font-black text-ink uppercase tracking-wider text-center border-r border-line bg-slate-50">
                    Bimestre 1
                  </th>
                  <th colSpan={2} className="p-2 text-[10px] font-black text-ink uppercase tracking-wider text-center border-r border-line bg-slate-50">
                    Bimestre 2
                  </th>
                  <th colSpan={2} className="p-2 text-[10px] font-black text-ink uppercase tracking-wider text-center border-r border-line bg-slate-50">
                    Bimestre 3
                  </th>
                  <th colSpan={2} className="p-2 text-[10px] font-black text-ink uppercase tracking-wider text-center border-r border-line bg-slate-50">
                    Bimestre 4
                  </th>
                </tr>
                {/* Segunda Fila: Meses */}
                <tr className="bg-white border-b border-line">
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'].map((mes, mIdx) => {
                    const isCurrent = mIdx === MES_ACTUAL_IDX;
                    return (
                      <th 
                        key={mes} 
                        className={`p-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-line ${
                          isCurrent ? 'bg-accent-soft/30 text-accent' : 'text-muted'
                        }`}
                      >
                        {mes}
                        {isCurrent && <span className="block text-[7px] text-accent mt-0.5">Actual</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-[10px] font-medium text-ink">
                {MOCK_COMPETENCIAS.map((item, i) => (
                  <tr key={i} className="border-b border-line hover:bg-neutral/50 transition-colors">
                    <td className="p-3 pr-4 border-r border-line">
                      <p className="line-clamp-2 leading-relaxed text-muted font-semibold">{item.competencia}</p>
                    </td>
                    {item.notas.map((nota, j) => {
                      const isCurrent = j === MES_ACTUAL_IDX;
                      const textClass = nota === null ? 'text-slate-300' : nota < 11 ? 'text-accent' : nota < 13 ? 'text-warning-ink' : 'text-success-ink';
                      
                      return (
                        <td 
                          key={j} 
                          className={`p-3 text-center border-r border-line ${isCurrent ? 'bg-accent-soft/10' : ''}`}
                        >
                          <span className={`font-bold ${isCurrent ? 'text-[11px]' : ''} ${textClass}`}>
                            {nota !== null ? nota.toFixed(1) : '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
