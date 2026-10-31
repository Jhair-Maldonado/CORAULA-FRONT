'use client';

import React from 'react';
import { BookOpen01Icon, CheckmarkCircle01Icon, Alert02Icon } from 'hugeicons-react';
import { ResumenAreaNotas, NivelLogro } from '../types';

interface TablaLibretaProps {
  resumenPorArea: ResumenAreaNotas[];
  promedioGeneral?: number | null;
}

const NIVEL_COLOR: Record<NivelLogro, string> = {
  AD: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  A: 'bg-teal-50 text-teal-700 border-teal-200',
  B: 'bg-amber-50 text-amber-800 border-amber-200',
  C: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const TablaLibreta: React.FC<TablaLibretaProps> = ({
  resumenPorArea,
  promedioGeneral,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-line shadow-xs overflow-hidden">
      {/* Cabecera de la Tabla */}
      <div className="p-4 border-b border-line bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen01Icon size={18} className="text-accent" />
          <h3 className="text-xs sm:text-sm font-black text-ink uppercase tracking-wider">
            Detalle de Calificaciones por Áreas y Competencias
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Aprobatorio (&ge; 11)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Desaprobatorio (&lt; 11)
          </span>
        </div>
      </div>

      {/* Contenedor responsivo de la tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-100/70 border-b border-line text-[10px] font-bold text-muted uppercase tracking-wider">
              <th className="py-3 px-4 w-48 border-r border-line">Área Curricular</th>
              <th className="py-3 px-4 w-44 border-r border-line">Asignatura / Curso</th>
              <th className="py-3 px-4 border-r border-line">Competencia / Criterio Evaluado</th>
              <th className="py-3 px-3 text-center w-24 border-r border-line">Nivel Logro</th>
              <th className="py-3 px-4 text-center w-24">Calificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-xs font-medium text-ink">
            {resumenPorArea.map((areaItem, areaIdx) => (
              <React.Fragment key={areaIdx}>
                {areaItem.cursos.map((cursoItem, cursoIdx) => (
                  <React.Fragment key={cursoIdx}>
                    {cursoItem.criterios.map((criterioItem, critIdx) => {
                      const isFailing = criterioItem.nota < 11;
                      const nivel = criterioItem.nivel_logro || (
                        criterioItem.nota >= 18 ? 'AD' : criterioItem.nota >= 14 ? 'A' : criterioItem.nota >= 11 ? 'B' : 'C'
                      );

                      return (
                        <tr
                          key={critIdx}
                          className="hover:bg-slate-50/80 transition-colors duration-150"
                        >
                          {/* Celda de Área (Agrupada visualmente en primera fila) */}
                          {cursoIdx === 0 && critIdx === 0 ? (
                            <td
                              rowSpan={areaItem.cursos.reduce((sum, c) => sum + c.criterios.length, 0)}
                              className="py-3 px-4 font-black text-ink text-xs bg-slate-50/30 border-r border-line align-top"
                            >
                              <div className="sticky top-20 flex flex-col gap-1">
                                <span>{areaItem.area}</span>
                                <span className="text-[10px] font-bold text-muted">
                                  Prom. Área: {areaItem.promedioArea.toFixed(1)}
                                </span>
                              </div>
                            </td>
                          ) : null}

                          {/* Celda de Curso (Agrupada en primera fila del curso) */}
                          {critIdx === 0 ? (
                            <td
                              rowSpan={cursoItem.criterios.length}
                              className="py-3 px-4 font-bold text-ink/90 border-r border-line align-top bg-white"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span>{cursoItem.nombre}</span>
                                <span className="text-[10px] text-muted font-normal">
                                  Promedio: {cursoItem.promedioCurso.toFixed(1)}
                                </span>
                              </div>
                            </td>
                          ) : null}

                          {/* Criterio / Competencia */}
                          <td className="py-3 px-4 text-ink/80 border-r border-line leading-relaxed">
                            {criterioItem.criterio}
                          </td>

                          {/* Nivel de Logro */}
                          <td className="py-3 px-3 text-center border-r border-line">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                NIVEL_COLOR[nivel] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {nivel}
                            </span>
                          </td>

                          {/* NOTA CON RESALTADO OBLIGATORIO DE DESAPROBADOS (< 11) */}
                          <td className="py-3 px-4 text-center">
                            {isFailing ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-black text-xs shadow-2xs animate-pulse-slow"
                                title="Nota desaprobatoria (Menor a 11)"
                              >
                                <Alert02Icon size={12} className="text-red-600" />
                                <span>{criterioItem.nota.toFixed(1)}</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50/70 text-emerald-800 font-bold text-xs border border-emerald-100">
                                {criterioItem.nota.toFixed(1)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Barra de Resumen Inferior: Promedio Ponderado */}
      {promedioGeneral !== undefined && promedioGeneral !== null && (
        <div className="p-4 bg-slate-100/90 border-t border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckmarkCircle01Icon size={20} className="text-emerald-600" />
            <span className="text-xs sm:text-sm font-black text-ink uppercase tracking-wide">
              Promedio Ponderado General del Bimestre
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-4 py-1.5 rounded-xl font-black text-sm sm:text-base border ${
                promedioGeneral < 11
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {promedioGeneral.toFixed(2)} pts
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
