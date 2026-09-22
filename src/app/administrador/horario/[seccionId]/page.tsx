'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft01Icon, 
  Clock01Icon, 
  Add01Icon, 
  Delete01Icon,
  FilterIcon,
  ArrowDown01Icon,
  BookOpen01Icon,
  UserIcon,
  Cancel01Icon,
  Calendar01Icon
} from 'hugeicons-react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';

interface BloqueHorario {
  id: string;
  diaIndex: number; // 0: Lunes, 1: Martes, ..., 5: Sábado
  horaInicioIndex: number; // Index de 0..11 (07:00 a 18:00)
  duracionHoras: number; // 1..5 horas
  materia: string;
  docente: string;
  salon: string;
  modalidad: 'Presencial' | 'Virtual';
  colorCard: string;
  colorBadge: string;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Horas de inicio elegibles exactas (incluye minutos 00 y 30)
const HORAS_INICIO_OPCIONES = [
  { value: 0, label: '07:00 a. m.', horaStr: '07:00 a. m.', minutos: 7 * 60 },
  { value: 0.5, label: '07:30 a. m.', horaStr: '07:30 a. m.', minutos: 7 * 60 + 30 },
  { value: 1, label: '08:00 a. m.', horaStr: '08:00 a. m.', minutos: 8 * 60 },
  { value: 1.5, label: '08:30 a. m.', horaStr: '08:30 a. m.', minutos: 8 * 60 + 30 },
  { value: 2, label: '09:00 a. m.', horaStr: '09:00 a. m.', minutos: 9 * 60 },
  { value: 2.5, label: '09:30 a. m.', horaStr: '09:30 a. m.', minutos: 9 * 60 + 30 },
  { value: 3, label: '10:00 a. m.', horaStr: '10:00 a. m.', minutos: 10 * 60 },
  { value: 3.5, label: '10:30 a. m.', horaStr: '10:30 a. m.', minutos: 10 * 60 + 30 },
  { value: 4, label: '11:00 a. m.', horaStr: '11:00 a. m.', minutos: 11 * 60 },
  { value: 4.5, label: '11:30 a. m.', horaStr: '11:30 a. m.', minutos: 11 * 60 + 30 },
  { value: 5, label: '12:00 p. m.', horaStr: '12:00 p. m.', minutos: 12 * 60 },
  { value: 5.5, label: '12:30 p. m.', horaStr: '12:30 p. m.', minutos: 12 * 60 + 30 },
  { value: 6, label: '01:00 p. m.', horaStr: '01:00 p. m.', minutos: 13 * 60 },
  { value: 6.5, label: '01:30 p. m.', horaStr: '01:30 p. m.', minutos: 13 * 60 + 30 },
  { value: 7, label: '02:00 p. m.', horaStr: '02:00 p. m.', minutos: 14 * 60 },
  { value: 7.5, label: '02:30 p. m.', horaStr: '02:30 p. m.', minutos: 14 * 60 + 30 },
  { value: 8, label: '03:00 p. m.', horaStr: '03:00 p. m.', minutos: 15 * 60 },
  { value: 8.5, label: '03:30 p. m.', horaStr: '03:30 p. m.', minutos: 15 * 60 + 30 },
  { value: 9, label: '04:00 p. m.', horaStr: '04:00 p. m.', minutos: 16 * 60 },
  { value: 9.5, label: '04:30 p. m.', horaStr: '04:30 p. m.', minutos: 16 * 60 + 30 },
  { value: 10, label: '05:00 p. m.', horaStr: '05:00 p. m.', minutos: 17 * 60 },
  { value: 10.5, label: '05:30 p. m.', horaStr: '05:30 p. m.', minutos: 17 * 60 + 30 },
];

const HORAS_LISTA = [
  { label: '07:00 a. m.', horaInicio: '07:00 a. m.', horaFin1h: '08:00 a. m.' },
  { label: '08:00 a. m.', horaInicio: '08:00 a. m.', horaFin1h: '09:00 a. m.' },
  { label: '09:00 a. m.', horaInicio: '09:00 a. m.', horaFin1h: '10:00 a. m.' },
  { label: '10:00 a. m.', horaInicio: '10:00 a. m.', horaFin1h: '11:00 a. m.' },
  { label: '11:00 a. m.', horaInicio: '11:00 a. m.', horaFin1h: '12:00 p. m.' },
  { label: '12:00 p. m.', horaInicio: '12:00 p. m.', horaFin1h: '01:00 p. m.' },
  { label: '01:00 p. m.', horaInicio: '01:00 p. m.', horaFin1h: '02:00 p. m.' },
  { label: '02:00 p. m.', horaInicio: '02:00 p. m.', horaFin1h: '03:00 p. m.' },
  { label: '03:00 p. m.', horaInicio: '03:00 p. m.', horaFin1h: '04:00 p. m.' },
  { label: '04:00 p. m.', horaInicio: '04:00 p. m.', horaFin1h: '05:00 p. m.' },
  { label: '05:00 p. m.', horaInicio: '05:00 p. m.', horaFin1h: '06:00 p. m.' },
];

const CURSOS_CONFIG = [
  { materia: 'Interacción Hombre Máquina (31673)', docentes: ['María Fernanda Soto', 'Carlos Vega'], colorCard: 'bg-[#b84c0e] text-white', colorBadge: 'bg-white text-[#b84c0e]' },
  { materia: 'Matemáticas Avanzadas', docentes: ['María Fernanda Soto', 'Carlos Vega'], colorCard: 'bg-blue-600 text-white', colorBadge: 'bg-white text-blue-800' },
  { materia: 'Lenguaje y Comunicación', docentes: ['Lucía Paredes', 'Ana María Torres'], colorCard: 'bg-emerald-600 text-white', colorBadge: 'bg-white text-emerald-800' },
  { materia: 'Historia del Perú', docentes: ['Carlos Vega', 'Jorge Salinas'], colorCard: 'bg-amber-600 text-white', colorBadge: 'bg-white text-amber-800' },
  { materia: 'Ciencia y Tecnología', docentes: ['Jorge Salinas', 'María Fernanda Soto'], colorCard: 'bg-purple-600 text-white', colorBadge: 'bg-white text-purple-800' },
  { materia: 'Sistemas Integrados (31675)', docentes: ['Jorge Salinas', 'Carlos Vega'], colorCard: 'bg-[#0e6eb8] text-white', colorBadge: 'bg-white text-[#0e6eb8]' },
  { materia: 'Planeamiento Estratégico', docentes: ['Lucía Paredes', 'Robert Smith'], colorCard: 'bg-rose-600 text-white', colorBadge: 'bg-white text-rose-800' },
];

// Helper para convertir minutos a string hh:mm a.m./p.m.
const minToHoraStr = (totalMin: number) => {
  const h24 = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const period = h24 >= 12 ? 'p. m.' : 'a. m.';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr} ${period}`;
};

// Función para formatear horas según la horaInicio (float) y la duracion (1, 1.5, 2)
const formatRangoHora = (horaInicioVal: number, duracionVal: number) => {
  const inicioMin = 7 * 60 + horaInicioVal * 60;
  const finMin = inicioMin + duracionVal * 60;
  return `${minToHoraStr(inicioMin)} - ${minToHoraStr(finMin)}`;
};

export default function DetalleHorarioPage() {
  const params = useParams();
  const seccionId = params?.seccionId as string;

  // Nombre de la sección
  let seccionNombre = '1° Grado A';
  MOCK_GRADOS.forEach(g => {
    const s = g.secciones.find(sec => sec.id === seccionId);
    if (s) {
      seccionNombre = `${g.nombre} - Sección ${s.letra}`;
    }
  });

  // Filtros
  const [diaFiltro, setDiaFiltro] = useState<string>('Todos');
  const [fechaFiltro, setFechaFiltro] = useState<string>('2026-09-22');

  // Modales
  const [modalGestionAbierto, setModalGestionAbierto] = useState<boolean>(false);
  const [popoverDetalleBloque, setPopoverDetalleBloque] = useState<BloqueHorario | null>(null);

  // Formulario nuevo/editar
  const [diaInput, setDiaInput] = useState<number>(1); // Martes
  const [horaInicioInput, setHoraInicioInput] = useState<number>(9); // 04:00 p.m.
  const [materiaInput, setMateriaInput] = useState<string>('Interacción Hombre Máquina (31673)');
  const [docenteInput, setDocenteInput] = useState<string>('María Fernanda Soto');
  const [duracionInput, setDuracionInput] = useState<number>(2);
  const [salonInput, setSalonInput] = useState<string>('Aula 204');
  const [modalidadInput, setModalidadInput] = useState<'Presencial' | 'Virtual'>('Presencial');
  const [bloqueEditandoId, setBloqueEditandoId] = useState<string | null>(null);

  // Estado inicial de clases en el horario (estilo captura)
  const [bloques, setBloques] = useState<BloqueHorario[]>([
    {
      id: 'b1',
      diaIndex: 1, // Martes
      horaInicioIndex: 0, // 07:00 a. m.
      duracionHoras: 2, // 07:00 a. m. - 09:00 a. m.
      materia: 'Sistemas Integrados (31675)',
      docente: 'Prof. Jorge Salinas',
      salon: 'Aula 101',
      modalidad: 'Presencial',
      colorCard: 'bg-[#0e6eb8] text-white',
      colorBadge: 'bg-white text-[#0e6eb8]'
    },
    {
      id: 'b2',
      diaIndex: 3, // Jueves
      horaInicioIndex: 8, // 03:00 p. m.
      duracionHoras: 2, // 3:00 pm - 5:00 pm
      materia: 'Sistemas Integrados (31675)',
      docente: 'Prof. Jorge Salinas',
      salon: 'Aula 102',
      modalidad: 'Presencial',
      colorCard: 'bg-[#0e6eb8] text-white',
      colorBadge: 'bg-white text-[#0e6eb8]'
    },
    {
      id: 'b3',
      diaIndex: 4, // Viernes
      horaInicioIndex: 9, // 04:00 p. m.
      duracionHoras: 2,
      materia: 'Planeamiento Estratégico',
      docente: 'Prof. Lucía Paredes',
      salon: 'Aula 301',
      modalidad: 'Presencial',
      colorCard: 'bg-rose-700 text-white',
      colorBadge: 'bg-white text-rose-800'
    }
  ]);

  const handleMateriaChange = (nuevaMateria: string) => {
    setMateriaInput(nuevaMateria);
    const config = CURSOS_CONFIG.find(c => c.materia === nuevaMateria);
    if (config && config.docentes.length > 0) {
      setDocenteInput(config.docentes[0]);
    }
  };

  const abrirModalCrear = (diaIdx: number, horaIdx: number) => {
    setDiaInput(diaIdx);
    setHoraInicioInput(horaIdx);
    setDuracionInput(2);
    setMateriaInput('Interacción Hombre Máquina (31673)');
    setDocenteInput('María Fernanda Soto');
    setSalonInput('Aula 101');
    setModalidadInput('Presencial');
    setBloqueEditandoId(null);
    setPopoverDetalleBloque(null);
    setModalGestionAbierto(true);
  };

  const abrirModalEditar = (bloque: BloqueHorario) => {
    setDiaInput(bloque.diaIndex);
    setHoraInicioInput(bloque.horaInicioIndex);
    setDuracionInput(bloque.duracionHoras);
    setMateriaInput(bloque.materia);
    setDocenteInput(bloque.docente.replace('Prof. ', ''));
    setSalonInput(bloque.salon);
    setModalidadInput(bloque.modalidad);
    setBloqueEditandoId(bloque.id);
    setPopoverDetalleBloque(null);
    setModalGestionAbierto(true);
  };

  const guardarClase = () => {
    const cursoConfig = CURSOS_CONFIG.find(c => c.materia === materiaInput) || CURSOS_CONFIG[0];
    
    const nuevoBloque: BloqueHorario = {
      id: bloqueEditandoId || `b-${Date.now()}`,
      diaIndex: diaInput,
      horaInicioIndex: horaInicioInput,
      duracionHoras: Number(duracionInput),
      materia: materiaInput,
      docente: docenteInput.startsWith('Prof.') ? docenteInput : `Prof. ${docenteInput}`,
      salon: salonInput,
      modalidad: modalidadInput,
      colorCard: cursoConfig.colorCard,
      colorBadge: cursoConfig.colorBadge
    };

    setBloques(prev => {
      const filtrados = prev.filter(b => b.id !== bloqueEditandoId);
      return [...filtrados, nuevoBloque];
    });

    setModalGestionAbierto(false);
  };

  const eliminarClase = () => {
    if (bloqueEditandoId) {
      setBloques(prev => prev.filter(b => b.id !== bloqueEditandoId));
    }
    setModalGestionAbierto(false);
    setPopoverDetalleBloque(null);
  };

  // Saber si una celda es el inicio de un bloque
  const getBloqueEnCelda = (diaIdx: number, horaIdx: number) => {
    return bloques.find(b => b.diaIndex === diaIdx && b.horaInicioIndex === horaIdx);
  };

  // Saber si una celda cae dentro de la extensión de un bloque (para no volver a renderizar inicio)
  const isCeldaCubierta = (diaIdx: number, horaIdx: number) => {
    return bloques.some(b => {
      if (b.diaIndex !== diaIdx) return false;
      const fin = b.horaInicioIndex + b.duracionHoras - 1;
      return horaIdx > b.horaInicioIndex && horaIdx <= fin;
    });
  };

  const diasFiltrados = diaFiltro === 'Todos' 
    ? DIAS_SEMANA 
    : DIAS_SEMANA.filter(d => d === diaFiltro);

  const docentesDisponiblesObj = CURSOS_CONFIG.find(c => c.materia === materiaInput)?.docentes || ['María Fernanda Soto'];

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-canvas font-sans flex flex-col gap-6 relative">
      
      {/* HEADER & VOLVER */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-2">
        <Link 
          href="/administrador/horario" 
          className="text-muted text-xs font-bold hover:text-accent transition-colors flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft01Icon size={14} /> Regresar a lista de horarios
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
          <div>
            <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
              HORARIO ESCOLAR SEMANAL
            </span>
            <h1 className="text-ink text-2xl font-extrabold mt-0.5 tracking-tight">
              {seccionNombre}
            </h1>
            <p className="text-muted text-xs font-medium mt-0.5">
              Horario continuo de 07:00 a. m. a 06:00 p. m. Haz clic en una clase para ver la tarjeta detallada.
            </p>
          </div>

          <button 
            onClick={() => abrirModalCrear(1, 9)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-all shadow-sm w-fit"
          >
            <Add01Icon size={16} />
            <span>Agregar Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* FILTROS SUPERIORES (DÍA Y FECHA) */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-ink font-bold text-xs">
          <FilterIcon size={16} className="text-accent" />
          <span>Filtros de vista:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Filtro Día */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-muted uppercase">Día:</label>
            <div className="relative">
              <select 
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
                className="appearance-none bg-neutral/50 border border-line rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-ink outline-none cursor-pointer"
              >
                <option value="Todos">Todos los Días (Lun - Sáb)</option>
                {DIAS_SEMANA.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Filtro Fecha */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-muted uppercase">Semana de:</label>
            <input 
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-neutral/50 border border-line rounded-lg px-3 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE HORARIOS EXACTA DE 07:00 A.M. A 06:00 P.M. */}
      <div className="max-w-7xl mx-auto w-full bg-white rounded-2xl border border-line shadow-sm mb-10 relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[850px] table-fixed">
            <thead>
              <tr className="bg-neutral/60 border-b border-line">
                <th className="py-3 px-2 text-left text-[10px] font-extrabold text-muted uppercase tracking-wider w-24 border-r border-line">
                  <div className="flex items-center gap-1">
                    <Clock01Icon size={13} className="text-accent" />
                    <span>Hora</span>
                  </div>
                </th>
                {diasFiltrados.map((dia) => (
                  <th key={dia} className="py-3 px-2 text-center text-xs font-extrabold text-ink uppercase tracking-wider border-r border-line last:border-r-0">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {HORAS_LISTA.map((horaObj, horaIndex) => (
                <tr key={horaIndex} className="h-14">
                  
                  {/* COLUMNA DE HORA COMPACTA Y LEGIBLE */}
                  <td className="py-1 px-2 text-[11px] font-extrabold text-slate-600 border-r border-line bg-slate-50/80 whitespace-nowrap align-middle text-center tracking-tight">
                    {horaObj.label}
                  </td>

                  {/* COLUMNAS DÍAS */}
                  {diasFiltrados.map((dia) => {
                    const diaRealIndex = DIAS_SEMANA.indexOf(dia);

                    // Si está cubierta por una tarjeta de duración extendida, omitimos renderizar celda de inicio
                    if (isCeldaCubierta(diaRealIndex, horaIndex)) {
                      return null;
                    }

                    const bloque = getBloqueEnCelda(diaRealIndex, horaIndex);

                    if (bloque) {
                      const rowSpan = bloque.duracionHoras;
                      const rangoHoraStr = formatRangoHora(bloque.horaInicioIndex, bloque.duracionHoras);

                      return (
                        <td 
                          key={dia}
                          rowSpan={rowSpan}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPopoverDetalleBloque(bloque);
                          }}
                          className="p-1 border-r border-line last:border-r-0 align-top cursor-pointer relative transition-all"
                        >
                          <div className={`w-full h-full p-2.5 rounded-xl ${bloque.colorCard} shadow-sm flex flex-col justify-between hover:brightness-105 transition-all group border border-black/10`}>
                            
                            <div>
                              <p className="font-extrabold text-xs leading-snug truncate">
                                {bloque.materia}
                              </p>
                              <p className="text-[10px] font-semibold opacity-90 mt-0.5 flex items-center gap-1">
                                <Clock01Icon size={10} />
                                {rangoHoraStr}
                              </p>
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-1">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs ${bloque.colorBadge}`}>
                                {bloque.modalidad}
                              </span>
                              <span className="text-[9px] font-bold opacity-80 truncate">
                                {bloque.salon}
                              </span>
                            </div>

                          </div>
                        </td>
                      );
                    }

                    // Celda Vacía
                    return (
                      <td 
                        key={dia}
                        onClick={() => abrirModalCrear(diaRealIndex, horaIndex)}
                        className="p-1 border-r border-line last:border-r-0 align-top cursor-pointer hover:bg-accent/5 transition-colors group"
                      >
                        <div className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-line flex items-center justify-center text-muted/30 group-hover:border-accent/50 group-hover:text-accent transition-all">
                          <Add01Icon size={14} />
                        </div>
                      </td>
                    );
                  })}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TARJETA POPUP DE DETALLE AL HACER CLICK EN EL CURSO (ESTILO CAPTURA) */}
      {popoverDetalleBloque && (
        <div 
          onClick={() => setPopoverDetalleBloque(null)}
          className="fixed inset-0 bg-ink/30 backdrop-blur-2xs z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-line p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-scale-in relative border-t-4 border-t-accent"
          >
            {/* Botón cerrar */}
            <button 
              onClick={() => setPopoverDetalleBloque(null)}
              className="absolute right-4 top-4 text-muted hover:text-ink transition-colors p-1"
            >
              <Cancel01Icon size={18} />
            </button>

            {/* Badge Modalidad */}
            <div>
              <span className="bg-amber-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                {popoverDetalleBloque.modalidad}
              </span>
            </div>

            {/* Nombre del curso y día */}
            <div>
              <h3 className="text-ink font-extrabold text-sm leading-snug">
                {popoverDetalleBloque.materia}
              </h3>
              <p className="text-muted text-xs font-semibold mt-0.5">
                {DIAS_SEMANA[popoverDetalleBloque.diaIndex]}
              </p>
            </div>

            {/* Fecha y Rango Horario */}
            <div className="flex items-start gap-2 text-ink text-xs font-medium bg-neutral/50 p-3 rounded-xl border border-line">
              <Calendar01Icon size={16} className="text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {DIAS_SEMANA[popoverDetalleBloque.diaIndex]}, {fechaFiltro}
                </p>
                <p className="text-muted text-[11px]">
                  de {formatRangoHora(popoverDetalleBloque.horaInicioIndex, popoverDetalleBloque.duracionHoras)}
                </p>
              </div>
            </div>

            {/* PROFESOR ASIGNADO (En reemplazo de "Ir al contenido del curso") */}
            <div className="flex items-center gap-2.5 text-accent text-xs font-bold bg-accent/10 p-3 rounded-xl border border-accent/20">
              <UserIcon size={18} className="shrink-0" />
              <div>
                <span className="text-[10px] text-muted font-bold block uppercase">Profesor a cargo:</span>
                <span className="text-ink text-xs font-extrabold">{popoverDetalleBloque.docente}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between pt-2 border-t border-line mt-1">
              <button 
                onClick={() => abrirModalEditar(popoverDetalleBloque)}
                className="text-accent hover:underline text-xs font-bold"
              >
                Editar clase
              </button>
              
              <button 
                onClick={() => setPopoverDetalleBloque(null)}
                className="px-4 py-1.5 rounded-lg bg-neutral border border-line text-xs font-bold text-ink hover:bg-neutral/80"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PROGRAMAR / EDITAR CLASE */}
      {modalGestionAbierto && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-line p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-scale-in">
            
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-ink text-base">
                {bloqueEditandoId ? 'Editar Clase Programada' : 'Programar Nueva Clase'}
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* 1. SELECCIÓN DE CURSO */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                  <BookOpen01Icon size={12} className="text-accent" /> 1. Curso / Materia:
                </label>
                <div className="relative">
                  <select 
                    value={materiaInput}
                    onChange={(e) => handleMateriaChange(e.target.value)}
                    className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 pr-8 text-xs text-ink font-semibold outline-none focus:border-accent"
                  >
                    {CURSOS_CONFIG.map(m => (
                      <option key={m.materia} value={m.materia}>{m.materia}</option>
                    ))}
                  </select>
                  <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>

              {/* 2. PROFESOR SEGÚN CURSO */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
                  <UserIcon size={12} className="text-accent" /> 2. Profesor Asignado:
                </label>
                <div className="relative">
                  <select 
                    value={docenteInput}
                    onChange={(e) => setDocenteInput(e.target.value)}
                    className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 pr-8 text-xs text-ink font-semibold outline-none focus:border-accent"
                  >
                    {docentesDisponiblesObj.map(doc => (
                      <option key={doc} value={doc}>Prof. {doc}</option>
                    ))}
                  </select>
                  <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>

              {/* 3. DÍA Y HORA INICIAL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase">Día de la Semana:</label>
                  <div className="relative">
                    <select 
                      value={diaInput}
                      onChange={(e) => setDiaInput(Number(e.target.value))}
                      className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold outline-none"
                    >
                      {DIAS_SEMANA.map((d, idx) => (
                        <option key={d} value={idx}>{d}</option>
                      ))}
                    </select>
                    <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase">Hora de Inicio:</label>
                  <div className="relative">
                    <select 
                      value={horaInicioInput}
                      onChange={(e) => setHoraInicioInput(Number(e.target.value))}
                      className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold outline-none"
                    >
                      {HORAS_INICIO_OPCIONES.map((h) => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                    <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 4. DURACIÓN Y MODALIDAD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase">Duración:</label>
                  <select 
                    value={duracionInput}
                    onChange={(e) => setDuracionInput(Number(e.target.value))}
                    className="w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold outline-none"
                  >
                    <option value={1}>1 hora</option>
                    <option value={1.5}>1:30 min</option>
                    <option value={2}>2 horas</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-muted uppercase">Modalidad:</label>
                  <select 
                    value={modalidadInput}
                    onChange={(e) => setModalidadInput(e.target.value as 'Presencial' | 'Virtual')}
                    className="w-full bg-neutral/50 border border-line rounded-lg px-3 py-2 text-xs text-ink font-semibold outline-none"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>
              </div>

            </div>

            {/* BOTONES MODAL */}
            <div className="flex items-center justify-between pt-3 border-t border-line mt-1">
              {bloqueEditandoId ? (
                <button 
                  onClick={eliminarClase}
                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1"
                >
                  <Delete01Icon size={16} /> Eliminar Clase
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModalGestionAbierto(false)}
                  className="px-4 py-2 rounded-xl bg-neutral border border-line text-xs font-bold text-ink hover:bg-neutral/80"
                >
                  Cancelar
                </button>
                <button 
                  onClick={guardarClase}
                  className="px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent/90"
                >
                  {bloqueEditandoId ? 'Actualizar' : 'Asignar a Horario'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
