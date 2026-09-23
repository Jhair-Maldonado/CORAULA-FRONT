'use client';

import React, { useState, useRef } from 'react';
import { 
  Task01Icon, 
  UserCircleIcon, 
  UserGroupIcon, 
  CheckmarkCircle01Icon, 
  AlertCircleIcon,
  BookOpen01Icon,
  Search01Icon,
  UserCheck01Icon,
  ArrowRight01Icon,
  Folder01Icon
} from 'hugeicons-react';

interface RegistroImportado {
  id: string;
  // Datos Alumno
  alumnoNombres: string;
  alumnoApellidos: string;
  alumnoDni: string;
  grado: string;
  seccion: string;
  // Datos Apoderado
  padreNombres: string;
  padreApellidos: string;
  padreDni: string;
  parentesco: string;
  padreTelefono: string;
  padreCorreo: string;
}

const MOCK_IMPORTADOS: RegistroImportado[] = [
  {
    id: 'IMP-001',
    alumnoNombres: 'Mateo Alejandro',
    alumnoApellidos: 'Sánchez Flores',
    alumnoDni: '74839201',
    grado: '1° Secundaria',
    seccion: 'Sección A',
    padreNombres: 'Carlos Alberto',
    padreApellidos: 'Sánchez Ríos',
    padreDni: '10492837',
    parentesco: 'Padre',
    padreTelefono: '984512039',
    padreCorreo: 'carlos.sanchez@email.com'
  },
  {
    id: 'IMP-002',
    alumnoNombres: 'Lucía Fernanda',
    alumnoApellidos: 'Gómez Peralta',
    alumnoDni: '75920184',
    grado: '1° Secundaria',
    seccion: 'Sección B',
    padreNombres: 'Elena Beatriz',
    padreApellidos: 'Peralta Castro',
    padreDni: '09382019',
    parentesco: 'Madre',
    padreTelefono: '912384920',
    padreCorreo: 'elena.peralta@email.com'
  },
  {
    id: 'IMP-003',
    alumnoNombres: 'Sebastián',
    alumnoApellidos: 'Rojas Mendoza',
    alumnoDni: '71029384',
    grado: '2° Secundaria',
    seccion: 'Sección A',
    padreNombres: 'Jorge Mario',
    padreApellidos: 'Rojas Salazar',
    padreDni: '08192834',
    parentesco: 'Padre',
    padreTelefono: '976453821',
    padreCorreo: 'jorge.rojas@email.com'
  },
  {
    id: 'IMP-004',
    alumnoNombres: 'Camila Valeria',
    alumnoApellidos: 'Torres Benítez',
    alumnoDni: '72839401',
    grado: '3° Secundaria',
    seccion: 'Sección A',
    padreNombres: 'Rosa María',
    padreApellidos: 'Benítez Huamán',
    padreDni: '10928374',
    parentesco: 'Madre',
    padreTelefono: '934810293',
    padreCorreo: 'rosa.benitez@email.com'
  }
];

export default function MatriculaPage() {
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroImportado[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [matriculadoExito, setMatriculadoExito] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setProcesando(true);
      setTimeout(() => {
        setProcesando(false);
        setFileUploaded(true);
        setRegistros(MOCK_IMPORTADOS);
      }, 1200);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setProcesando(true);
      setTimeout(() => {
        setProcesando(false);
        setFileUploaded(true);
        setRegistros(MOCK_IMPORTADOS);
      }, 1200);
    }
  };

  const handleConfirmarMatricula = () => {
    setMatriculadoExito(true);
    setTimeout(() => setMatriculadoExito(false), 4000);
  };

  const filteredRegistros = registros.filter(r => 
    r.alumnoNombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alumnoApellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alumnoDni.includes(searchTerm) ||
    r.padreNombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.padreDni.includes(searchTerm)
  );

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* Hidden Input File */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* HEADER Y NAVEGACIÓN */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[11px] font-bold tracking-widest uppercase">
            MÓDULO ADMINISTRATIVO
          </span>
          <h1 className="text-ink text-2xl font-bold mt-0.5 tracking-tight">
            Importación y Matrícula Masiva
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Carga un archivo Excel con la información de alumnos y apoderados para matricular en bloque.
          </p>
        </div>

        {fileUploaded && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setFileUploaded(false);
                setRegistros([]);
                setFileName('');
              }}
              className="px-4 py-2 rounded-xl bg-neutral border border-line text-ink text-xs font-bold hover:bg-neutral/80 transition-colors"
            >
              Cargar otro Excel
            </button>
            <button 
              onClick={handleConfirmarMatricula}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm"
            >
              <CheckmarkCircle01Icon size={16} />
              <span>Confirmar y Matricular ({registros.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* FEEDBACK DE EXITO DE MATRICULA */}
      {matriculadoExito && (
        <div className="max-w-7xl mx-auto w-full p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckmarkCircle01Icon size={22} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">¡Matrícula Masiva procesada exitosamente!</p>
              <p className="text-[11px] text-emerald-700 font-medium">Se han registrado {registros.length} alumnos con sus apoderados correspondientes.</p>
            </div>
          </div>
        </div>
      )}

      {/* ZONA DE CARGA DE EXCEL SI AUN NO HA CARGADO */}
      {!fileUploaded ? (
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white rounded-2xl border-2 border-dashed border-line hover:border-accent p-10 md:p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all shadow-xs group"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Task01Icon size={32} />
            </div>

            {procesando ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-ink">Procesando y dividiendo plantilla Excel...</p>
                <p className="text-xs text-muted">Vinculará automáticamente el alumno con su apoderado.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-ink mb-1">
                  Arrastra tu archivo Excel (.xlsx, .csv) o <span className="text-accent underline">selecciónalo</span>
                </h2>
                <p className="text-xs text-muted font-medium max-w-md">
                  El sistema detectará las columnas de Alumno y Apoderado en una vista dividida de rápida verificación.
                </p>
                
                <div className="flex items-center gap-4 mt-6 text-[11px] font-bold text-muted bg-neutral/60 px-4 py-2 rounded-xl border border-line/60">
                  <span className="flex items-center gap-1.5"><Folder01Icon size={14} className="text-accent" /> Formato .XLSX / .CSV</span>
                  <span>•</span>
                  <span>Relación Automática Alumno ↔ Padre</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* VISTA DIVIDIDA 50/50: ALUMNO (IZQ) ↔ APODERADO (DER) */
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
          
          {/* BARRA SUPERIOR DE BÚSQUEDA Y METRICAS */}
          <div className="bg-white rounded-xl border border-line p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search01Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar alumno o apoderado por DNI/Nombre..."
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral/50 border border-line rounded-lg text-xs font-medium text-ink outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="bg-neutral px-3 py-1 rounded-lg text-ink flex items-center gap-1.5">
                <Task01Icon size={15} className="text-accent" /> {fileName}
              </span>
              <span className="bg-accent/10 text-accent px-3 py-1 rounded-lg">
                {filteredRegistros.length} RegistrosListos
              </span>
            </div>
          </div>

          {/* VISTA SPLIT 2 COLUMNAS SIMÉTRICAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* COLUMNA IZQUIERDA: ALUMNOS */}
            <div className="bg-white rounded-xl border border-line p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <UserCircleIcon size={18} className="text-accent" /> 1. Datos del Alumno
                </h3>
                <span className="text-[10px] font-bold text-muted bg-neutral px-2 py-0.5 rounded">
                  Lado Izquierdo
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredRegistros.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-lg border border-line/80 bg-neutral/30 hover:bg-neutral/70 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-accent/10 text-accent font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-ink leading-tight">
                          {item.alumnoNombres} {item.alumnoApellidos}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-muted">
                          <span>DNI: {item.alumnoDni}</span>
                          <span>•</span>
                          <span className="text-accent">{item.grado} - {item.seccion}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMNA DERECHA: PADRES / APODERADOS RELACIONADOS */}
            <div className="bg-white rounded-xl border border-line p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <UserCheck01Icon size={18} className="text-emerald-600" /> 2. Apoderado Relacionado
                </h3>
                <span className="text-[10px] font-bold text-muted bg-neutral px-2 py-0.5 rounded">
                  Lado Derecho
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredRegistros.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-ink leading-tight">
                          {item.padreNombres} {item.padreApellidos}
                        </p>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          {item.parentesco}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-muted">
                        <span>DNI: {item.padreDni}</span>
                        <span>•</span>
                        <span>Cel: {item.padreTelefono}</span>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">{item.padreCorreo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
