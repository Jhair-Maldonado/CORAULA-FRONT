'use client';

import React, { useState } from 'react';
import { 
  FingerPrintIcon, 
  Search01Icon,
  CheckmarkBadge01Icon,
  CancelCircleIcon,
  UserIcon,
  Time02Icon,
  SmartPhone01Icon,
  ArrowLeft01Icon,
  Shield01Icon,
  Alert01Icon,
  FilterIcon
} from 'hugeicons-react';
import { CardGradoHuella } from '../components/CardGradoHuella';

// --- MOCK DATA ---
type Movimiento = { fecha: string; tipo: 'Ingreso' | 'Salida'; dispositivo: string };

type AlumnoHuella = {
  id: string;
  nombre: string;
  tieneHuella: boolean;
  ultimaActualizacion?: string;
  movimientos?: Movimiento[];
};

type GradoHuella = {
  id: string;
  nombre: string;
  totalAlumnos: number;
  totalRegistrados: number;
  alumnos: AlumnoHuella[];
};

const NOMBRES_ESTATICOS = [
  'Carlos Ruiz', 'Ana Paredes', 'Luis Mendoza', 'Maria Soto', 'Jorge Mamani', 
  'Camila Quispe', 'Mateo Vargas', 'Lucia Castro', 'Diego Flores', 'Valeria Rojas',
  'Daniel Silva', 'Sofia Gutierrez', 'Sebastian Vega', 'Isabella Cruz', 'Matias Reyes',
  'Valentina Ortiz', 'Gabriel Torres', 'Martina Navarro', 'Joaquin Ramos', 'Fernanda Pinto',
  'Alejandro Medina', 'Camila Rios', 'Nicolas Castillo', 'Mariana Espinoza', 'Emiliano Acosta',
  'Renata Cabrera', 'Lucas Aguilar', 'Daniela Cordova', 'Tomas Villanueva', 'Antonella Chavez',
  'Thiago Suarez', 'Paula Miranda', 'Facundo Herrera', 'Bianca Guzman', 'Rodrigo Salazar'
];

// Generar bastantes mock data para ver la respuesta a muchos salones
const generarGrados = (): GradoHuella[] => {
  const gradosBase = [];
  const niveles = ['Secund.', 'Primar.'];
  const letras = ['A', 'B', 'C', 'D'];
  
  let idCounter = 1;
  let nombreIdx = 0;

  for(let n = 0; n < niveles.length; n++) {
    for(let g = 1; g <= 5; g++) {
      for(let l = 0; l < (n === 0 ? 4 : 2); l++) { // Secundaria A,B,C,D; Primaria A,B
        const totalAlumnos = Math.floor(Math.random() * 10) + 20; // 20-30
        const faltantes = Math.floor(Math.random() * 5); // 0-4 faltan
        const totalRegistrados = totalAlumnos - faltantes;
        
        const alumnosMock: AlumnoHuella[] = Array.from({ length: totalAlumnos }).map((_, idx) => {
          const tieneHuella = idx >= faltantes;
          const nombreReal = NOMBRES_ESTATICOS[nombreIdx % NOMBRES_ESTATICOS.length];
          nombreIdx++;
          
          return {
            id: `a-${idCounter}-${idx}`,
            nombre: nombreReal,
            tieneHuella,
            ultimaActualizacion: tieneHuella ? '12/08/2026' : undefined,
            movimientos: tieneHuella ? [{ fecha: 'Hoy, 07:45 AM', tipo: 'Ingreso', dispositivo: 'Torniquete 1' }] : []
          };
        });

        gradosBase.push({
          id: `g${idCounter++}`,
          nombre: `${g}° ${letras[l]} - ${niveles[n]}`,
          totalAlumnos,
          totalRegistrados,
          alumnos: alumnosMock
        });
      }
    }
  }
  return gradosBase;
};

const MOCK_GRADOS: GradoHuella[] = generarGrados();

export default function HuellaDigitalPage() {
  const [grados, setGrados] = useState<GradoHuella[]>(MOCK_GRADOS);
  const [selectedGrado, setSelectedGrado] = useState<GradoHuella | null>(null);
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoHuella | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtro de grados
  const [filterType, setFilterType] = useState<'Todos' | 'Falta'>('Todos');

  // Estados de simulación
  const [actionState, setActionState] = useState<'idle' | 'registering' | 'verifying' | 'success_register' | 'success_verify' | 'failed_verify'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [similarity, setSimilarity] = useState(0);

  // Funciones de navegación
  const handleSelectGrado = (grado: GradoHuella) => {
    setSelectedGrado(grado);
    setSelectedAlumno(null);
    setActionState('idle');
  };

  const handleBackToGrados = () => {
    setSelectedGrado(null);
    setSelectedAlumno(null);
    setActionState('idle');
    setSearchTerm('');
  };

  const handleSelectAlumno = (alumno: AlumnoHuella) => {
    setSelectedAlumno(alumno);
    setActionState('idle');
  };

  // Simulación de Registro
  const handleSimularRegistro = () => {
    setActionState('registering');
    setScanProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setActionState('success_register');
          // Actualizar estado local
          if (selectedGrado && selectedAlumno) {
            const updatedAlumno = { ...selectedAlumno, tieneHuella: true, ultimaActualizacion: 'Justo ahora' };
            const updatedGrado = {
              ...selectedGrado,
              totalRegistrados: selectedGrado.totalRegistrados + (selectedAlumno.tieneHuella ? 0 : 1),
              alumnos: selectedGrado.alumnos.map(a => a.id === selectedAlumno.id ? updatedAlumno : a)
            };
            setGrados(prev => prev.map(g => g.id === updatedGrado.id ? updatedGrado : g));
            setSelectedGrado(updatedGrado);
            setSelectedAlumno(updatedAlumno);
          }
        }, 500);
      }
    }, 500);
  };

  // Simulación de Verificación
  const handleSimularVerificacion = () => {
    setActionState('verifying');
    setScanProgress(0);
    setSimilarity(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Generar un random de similitud
          const sim = Math.floor(Math.random() * (99 - 85 + 1) + 85);
          setSimilarity(sim);
          setActionState(sim >= 90 ? 'success_verify' : 'failed_verify');
        }, 500);
      }
    }, 600);
  };

  // Filtros de Grados
  const filteredGrados = grados.filter(g => {
    const matchSearch = g.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterType === 'Todos' ? true : g.totalRegistrados < g.totalAlumnos;
    return matchSearch && matchFilter;
  });

  // Filtro de Alumnos
  const displayedAlumnos = selectedGrado?.alumnos.filter(a => a.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="w-full h-full p-6 bg-canvas font-sans flex flex-col gap-5 overflow-hidden">
      
      {/* HEADER COMPACTO */}
      <div className="shrink-0 max-w-7xl mx-auto w-full flex justify-between items-end">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
            Biometría Estudiantil
          </span>
          <h1 className="text-ink text-xl font-bold mt-0.5 tracking-tight flex items-center gap-2">
            <FingerPrintIcon size={24} className="text-accent" />
            Huella Digital
          </h1>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden pb-4">
        
        {/* ================= COLUMNA IZQUIERDA (8) ================= */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-line flex flex-col shadow-sm overflow-hidden h-full relative">
          
          {/* HEADER INTERNO / CONTROLES */}
          <div className="p-3 border-b border-line shrink-0 flex items-center gap-3">
            {selectedGrado && (
              <button onClick={handleBackToGrados} className="w-8 h-8 rounded-lg hover:bg-neutral flex items-center justify-center text-muted transition-colors shrink-0">
                <ArrowLeft01Icon size={18} />
              </button>
            )}
            <div className="flex-1 flex items-center gap-2.5 bg-neutral/50 border border-line rounded-lg px-3 py-1.5">
              <Search01Icon size={16} className="text-muted shrink-0" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={selectedGrado ? "Buscar alumno..." : "Buscar salón..."}
                className="w-full bg-transparent text-[11px] font-medium text-ink outline-none placeholder:text-muted"
              />
            </div>
            
            {!selectedGrado && (
              <div className="flex items-center gap-1 bg-neutral/50 p-1 rounded-lg border border-line">
                <button 
                  onClick={() => setFilterType('Todos')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filterType === 'Todos' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilterType('Falta')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filterType === 'Falta' ? 'bg-white shadow-sm text-rose-600' : 'text-muted hover:text-ink'}`}
                >
                  Faltan
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            
            {/* VISTA 1: LISTA DE GRADOS */}
            {!selectedGrado && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredGrados.map(grado => (
                  <CardGradoHuella 
                    key={grado.id}
                    id={grado.id}
                    nombre={grado.nombre}
                    totalAlumnos={grado.totalAlumnos}
                    totalRegistrados={grado.totalRegistrados}
                    onClick={() => handleSelectGrado(grado)}
                  />
                ))}
                {filteredGrados.length === 0 && (
                  <div className="col-span-full py-10 flex flex-col items-center justify-center text-muted">
                    <FilterIcon size={32} className="opacity-40 mb-2" />
                    <p className="text-xs font-semibold">No hay salones que coincidan.</p>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: LISTA DE ALUMNOS (Dentro de un Grado) */}
            {selectedGrado && (
              <div className="flex flex-col gap-2">
                <div className="mb-2 px-1 flex justify-between items-end">
                  <div>
                    <h2 className="text-sm font-bold text-ink">{selectedGrado.nombre}</h2>
                    <p className="text-[10px] text-muted">Alumnos del salón seleccionado.</p>
                  </div>
                  <span className="text-[10px] font-bold bg-neutral px-2 py-1 rounded text-ink">
                    {selectedGrado.totalRegistrados} / {selectedGrado.totalAlumnos} Registrados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {displayedAlumnos?.map(alumno => {
                    const isSelected = selectedAlumno?.id === alumno.id;
                    const needsFingerprint = !alumno.tieneHuella;

                    return (
                      <button
                        key={alumno.id}
                        onClick={() => handleSelectAlumno(alumno)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                          isSelected ? 'bg-accent/5 border-accent shadow-sm' : 'bg-white border-line hover:bg-neutral/50'
                        } ${needsFingerprint && !isSelected ? 'animate-pulse border-rose-200 bg-rose-50/30' : ''}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                            alumno.tieneHuella ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-100 border-rose-200 text-rose-600'
                          }`}>
                            {alumno.tieneHuella ? <CheckmarkBadge01Icon size={12} /> : <FingerPrintIcon size={12} />}
                          </div>
                          <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>
                            {alumno.nombre}
                          </span>
                        </div>
                        {needsFingerprint && (
                          <span className="text-[9px] font-bold text-rose-600 shrink-0 ml-2">
                            ¡Falta!
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUMNA DERECHA (4) ================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-line flex flex-col shadow-sm overflow-hidden h-full">
          {selectedAlumno ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
              
              <div className="flex flex-col items-center text-center pb-4 border-b border-line">
                <div className="w-14 h-14 rounded-full bg-neutral border border-line flex items-center justify-center text-muted mb-2">
                  <UserIcon size={24} />
                </div>
                <h2 className="text-sm font-bold text-ink leading-tight">{selectedAlumno.nombre}</h2>
                <span className={`mt-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  selectedAlumno.tieneHuella ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {selectedAlumno.tieneHuella ? 'Biometría Activa' : 'Falta Biometría'}
                </span>
              </div>

              {/* CONTENIDO SEGÚN ESTADO DE LA ACCIÓN */}
              <div className="flex-1 mt-4 flex flex-col">
                
                {/* ESTADO IDLE */}
                {actionState === 'idle' && (
                  <div className="animate-fade-in flex flex-col gap-5 h-full">
                    {selectedAlumno.tieneHuella ? (
                      <>
                        {/* Info Huella */}
                        <div className="bg-neutral/40 rounded-xl p-3 border border-line/60">
                          <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-1">Última Actualización</span>
                          <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                            <FingerPrintIcon size={14} className="text-accent" /> {selectedAlumno.ultimaActualizacion}
                          </span>
                        </div>

                        {/* Botones de Acción Secundarios */}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleSimularVerificacion} className="py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold transition-colors flex flex-col items-center justify-center gap-1">
                            <Shield01Icon size={16} /> Verificar
                          </button>
                          <button onClick={handleSimularRegistro} className="py-2 rounded-lg bg-neutral hover:bg-line border border-line text-ink text-[11px] font-bold transition-colors flex flex-col items-center justify-center gap-1">
                            <FingerPrintIcon size={16} /> Editar Huella
                          </button>
                        </div>

                        {/* Últimos Movimientos */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Movimientos Recientes</h3>
                          {selectedAlumno.movimientos && selectedAlumno.movimientos.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {selectedAlumno.movimientos.map((mov, idx) => (
                                <div key={idx} className="flex flex-col p-2.5 border border-line rounded-lg bg-white shadow-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${mov.tipo === 'Ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      {mov.tipo}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted flex items-center gap-1">
                                      <Time02Icon size={10} /> {mov.fecha}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted flex items-center gap-1">
                                    <SmartPhone01Icon size={10} /> {mov.dispositivo}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted text-center py-4 bg-neutral/30 rounded-lg border border-line">Sin movimientos recientes.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center pb-4">
                        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-300 flex items-center justify-center mb-3">
                          <Alert01Icon size={32} />
                        </div>
                        <p className="text-[11px] text-muted mb-4 max-w-[200px]">
                          El alumno no ha registrado su huella dactilar. Requerido para asistencia.
                        </p>
                        <button 
                          onClick={handleSimularRegistro}
                          className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-bold shadow-md hover:bg-accent/90 transition-all flex items-center justify-center gap-2"
                        >
                          <FingerPrintIcon size={16} /> Registrar Huella
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ANIMACIÓN DE ESCANEO */}
                {(actionState === 'registering' || actionState === 'verifying') && (
                  <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="44" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                        <circle 
                          cx="48" cy="48" r="44" fill="none" 
                          stroke={actionState === 'verifying' ? '#4F46E5' : '#BE123C'} 
                          strokeWidth="4" strokeLinecap="round"
                          style={{ strokeDasharray: 276, strokeDashoffset: 276 - (276 * scanProgress) / 100, transition: 'stroke-dashoffset 0.5s linear' }} 
                        />
                      </svg>
                      <FingerPrintIcon size={32} className={`animate-pulse ${actionState === 'verifying' ? 'text-indigo-600' : 'text-accent'}`} />
                    </div>
                    <h3 className="text-sm font-bold text-ink">
                      {actionState === 'verifying' ? 'Verificando Huella...' : 'Escaneando Huella...'}
                    </h3>
                    <p className="text-xs text-muted mt-1">Progreso: {scanProgress}%</p>
                  </div>
                )}

                {/* ÉXITO REGISTRO */}
                {actionState === 'success_register' && (
                  <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                      <CheckmarkBadge01Icon size={32} />
                    </div>
                    <h3 className="text-sm font-bold text-ink">Huella Guardada</h3>
                    <p className="text-[11px] text-muted mt-1 mb-4">Se ha registrado exitosamente en la base de datos.</p>
                    <button onClick={() => setActionState('idle')} className="px-4 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-neutral">Continuar</button>
                  </div>
                )}

                {/* RESULTADO VERIFICACIÓN */}
                {(actionState === 'success_verify' || actionState === 'failed_verify') && (
                  <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      actionState === 'success_verify' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {actionState === 'success_verify' ? <Shield01Icon size={32} /> : <Alert01Icon size={32} />}
                    </div>
                    <h3 className="text-sm font-bold text-ink">
                      {actionState === 'success_verify' ? 'Identidad Confirmada' : 'Huella no coincide'}
                    </h3>
                    <p className="text-[11px] text-muted mt-1 mb-4">
                      Similitud detectada: <strong className={actionState === 'success_verify' ? 'text-emerald-600' : 'text-rose-600'}>{similarity}%</strong>
                    </p>
                    <button onClick={() => setActionState('idle')} className="px-4 py-1.5 rounded-lg border border-line text-xs font-bold hover:bg-neutral">Cerrar</button>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-40 bg-neutral/20">
              <FingerPrintIcon size={48} className="text-muted mb-3" />
              <p className="text-xs font-bold text-ink">Ningún alumno seleccionado</p>
              <p className="text-[10px] font-medium text-muted mt-1">Selecciona un grado y luego un alumno para gestionar su biometría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
