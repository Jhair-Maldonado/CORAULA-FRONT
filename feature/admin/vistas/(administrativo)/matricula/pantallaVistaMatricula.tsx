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

import * as XLSX from 'xlsx';
import { IMatriculaExcelRow, IImportarMatriculaPayload } from '@/types/matricula';

interface RegistroImportado {
  id: string;
  alumnoNombres: string;
  alumnoApellidos: string;
  alumnoDni: string;
  grado: string;
  seccion: string;
  padreNombres: string;
  padreApellidos: string;
  padreDni: string;
  parentesco: string;
  padreTelefono: string;
  padreCorreo: string;
}

export default function PantallaVistaMatricula() {
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [registros, setRegistros] = useState<RegistroImportado[]>([]);
  const [payloads, setPayloads] = useState<IImportarMatriculaPayload[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [matriculadoExito, setMatriculadoExito] = useState<boolean>(false);
  const [errorMsj, setErrorMsj] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processRealExcel = (file: File) => {
    setFileName(file.name);
    setProcesando(true);
    setErrorMsj(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        
        // rawData[0] son los super-titulos
        // rawData[1] son los titulos reales
        // rawData[2] en adelante son los datos
        
        if (rawData.length <= 2) {
          setErrorMsj('El archivo no contiene datos válidos a partir de la fila 3.');
          setProcesando(false);
          return;
        }

        const dataRows = rawData.slice(2).filter(row => row.length > 0 && row[0]); // filtrar filas vacías

        if (dataRows.length === 0) {
          setErrorMsj('No se encontraron registros en el archivo.');
          setProcesando(false);
          return;
        }

        const newRegistros: RegistroImportado[] = [];
        const newPayloads: IImportarMatriculaPayload[] = [];

        dataRows.forEach((row, idx) => {
          // Extraemos por índice exacto basado en la imagen del usuario
          const dni_est = row[0]?.toString().trim() || '';
          const ape_pat_est = row[1]?.toString().trim() || '';
          const ape_mat_est = row[2]?.toString().trim() || '';
          const nom_est = row[3]?.toString().trim() || '';
          const cod_est = row[5]?.toString().trim() || '';
          const est_est = row[6]?.toString().trim() || 'ACTIVO';
          
          const dni_apo = row[7]?.toString().trim() || '';
          const ape_pat_apo = row[8]?.toString().trim() || '';
          const ape_mat_apo = row[9]?.toString().trim() || '';
          const nom_apo = row[10]?.toString().trim() || '';
          const tel_apo = row[11]?.toString().trim() || '';
          
          const relacion = row[13]?.toString().trim() || 'Apoderado';
          const es_principal = row[14]?.toString().toUpperCase() === 'VERDADERO' || row[14]?.toString().toUpperCase() === 'SI' || row[14] === true;
          const aut_recoger = row[15]?.toString().toUpperCase() === 'VERDADERO' || row[15]?.toString().toUpperCase() === 'SI' || row[15] === true;
          
          const fec_mat = row[17]?.toString().trim() || new Date().toISOString().split('T')[0];
          const est_mat = row[18]?.toString().trim() || 'MATRICULADO';
          const per_acad = row[19]?.toString().trim() || '';
          const seccion = row[20]?.toString().trim() || '';

          // Para la vista
          newRegistros.push({
            id: `row-${idx}`,
            alumnoNombres: nom_est,
            alumnoApellidos: `${ape_pat_est} ${ape_mat_est}`.trim(),
            alumnoDni: dni_est,
            grado: per_acad,
            seccion: seccion,
            padreNombres: nom_apo,
            padreApellidos: `${ape_pat_apo} ${ape_mat_apo}`.trim(),
            padreDni: dni_apo,
            parentesco: relacion,
            padreTelefono: tel_apo,
            padreCorreo: ''
          });

          // Para el backend
          newPayloads.push({
            estudiante_persona: {
              dni: dni_est,
              nombres: nom_est,
              apellidos: `${ape_pat_est} ${ape_mat_est}`.trim(),
            },
            estudiante: {
              codigo_estudiante: cod_est,
              estado: est_est,
            },
            apoderado_persona: {
              dni: dni_apo,
              nombres: nom_apo,
              apellidos: `${ape_pat_apo} ${ape_mat_apo}`.trim(),
              telefono: tel_apo,
            },
            apoderado: { estado: true },
            relacion_apoderado: {
              relacion: relacion,
              es_principal: es_principal,
              autorizado_recoger: aut_recoger,
              activo: true
            },
            matricula: {
              fecha_matricula: fec_mat,
              estado: est_mat,
            },
            referencias: {
              periodo_academico: per_acad,
              seccion: seccion,
            }
          });
        });

        setRegistros(newRegistros);
        setPayloads(newPayloads);
        setFileUploaded(true);
      } catch (err) {
        setErrorMsj('Error al procesar el Excel.');
      } finally {
        setProcesando(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processRealExcel(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processRealExcel(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleConfirmarMatricula = () => {
    // Aquí es donde se enviaría "payloads" al backend
    console.log("Enviando al backend:", payloads);
    setMatriculadoExito(true);
    setTimeout(() => setMatriculadoExito(false), 4000);
  };

  const filteredRegistros = registros.filter(r => 
    r.alumnoNombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alumnoApellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.alumnoDni?.includes(searchTerm) ||
    r.padreNombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.padreDni?.includes(searchTerm)
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
                
                {errorMsj && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600">
                    <AlertCircleIcon size={18} />
                    <p className="text-xs font-bold">{errorMsj}</p>
                  </div>
                )}
                
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
