'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { IMatriculaExcelRow, IImportarMatriculaPayload } from '@/types/matricula';
import { 
  CloudUploadIcon, 
  CheckmarkCircle02Icon, 
  Cancel01Icon, 
  File01Icon 
} from 'hugeicons-react';

interface ImportadorProps {
  onImportar: (payloads: IImportarMatriculaPayload[]) => Promise<void>;
}

export default function ImportadorMatricula({ onImportar }: ImportadorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<IMatriculaExcelRow[]>([]);
  const [payloads, setPayloads] = useState<IImportarMatriculaPayload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Extraemos los datos crudos del excel
        const jsonData = XLSX.utils.sheet_to_json<IMatriculaExcelRow>(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          setError('El archivo está vacío o no tiene el formato correcto.');
          return;
        }

        // Validación de columnas: verificar si al menos existe la columna dni_estudiante
        const firstRow = jsonData[0];
        if (!('dni_estudiante' in firstRow)) {
          setError('Las columnas del archivo no coinciden con la plantilla. Por favor usa la plantilla proporcionada que incluye dni_estudiante, nombres_estudiante, etc.');
          setParsedData([]);
          return;
        }

        setParsedData(jsonData);

        // Transformamos los datos al formato IImportarMatriculaPayload
        const newPayloads: IImportarMatriculaPayload[] = jsonData.map(row => {
          
          const esPrincipalStr = row.es_principal?.toString().toUpperCase();
          const isPrincipal = esPrincipalStr === 'SI' || esPrincipalStr === 'SÍ' || esPrincipalStr === 'TRUE' || esPrincipalStr === '1';

          const autorizadoStr = row.autorizado_recoger?.toString().toUpperCase();
          const isAutorizado = autorizadoStr === 'SI' || autorizadoStr === 'SÍ' || autorizadoStr === 'TRUE' || autorizadoStr === '1';

          return {
            estudiante_persona: {
              dni: row.dni_estudiante?.toString() || '',
              nombres: row.nombres_estudiante || '',
              apellidos: row.apellidos_estudiante || '',
              telefono: row.telefono_estudiante?.toString() || '',
            },
            estudiante: {
              codigo_estudiante: row.codigo_estudiante?.toString() || '',
              estado: row.estado_estudiante || 'ACTIVO',
            },
            apoderado_persona: {
              dni: row.dni_apoderado?.toString() || '',
              nombres: row.nombres_apoderado || '',
              apellidos: row.apellidos_apoderado || '',
              telefono: row.telefono_apoderado?.toString() || '',
            },
            apoderado: {
              estado: true
            },
            relacion_apoderado: {
              relacion: row.relacion || 'Apoderado',
              es_principal: isPrincipal,
              autorizado_recoger: isAutorizado,
              activo: true
            },
            matricula: {
              fecha_matricula: row.fecha_matricula || new Date().toISOString().split('T')[0],
              estado: row.estado_matricula || 'MATRICULADO',
            },
            referencias: {
              periodo_academico: row.nombre_periodo || '',
              seccion: row.nombre_seccion || '',
            }
          };
        });

        setPayloads(newPayloads);
      } catch (err) {
        console.error(err);
        setError('Error al leer el archivo Excel. Asegúrate de que tenga el formato correcto.');
      }
    };

    reader.onerror = () => {
      setError('Error al cargar el archivo.');
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv')) {
        processFile(droppedFile);
      } else {
        setError('Por favor, sube un archivo Excel (.xlsx) o CSV (.csv).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (payloads.length === 0) return;
    setLoading(true);
    try {
      await onImportar(payloads);
      // Limpiar luego de enviar
      setFile(null);
      setParsedData([]);
      setPayloads([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError('Error al enviar los datos al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-2xl border border-line/70 shadow-sm font-sans">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-ink mb-2">Importar Matrículas Masivas</h2>
        <p className="text-sm text-muted">Sube tu archivo Excel o CSV con la plantilla para registrar a los estudiantes de forma rápida.</p>
      </div>

      {/* DRAG AND DROP ZONE */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragging ? 'border-accent bg-accent/5' : 'border-line/80 hover:border-accent hover:bg-neutral/30'
        }`}
      >
        <input 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4">
          <CloudUploadIcon size={32} />
        </div>
        
        <h3 className="text-base font-bold text-ink">Haz clic o arrastra un archivo aquí</h3>
        <p className="text-sm text-muted mt-2 text-center max-w-sm">
          Soporta archivos Excel (.xlsx, .xls) o CSV. Por favor usa la plantilla proporcionada.
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600">
          <Cancel01Icon size={18} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* PREVIEW */}
      {file && parsedData.length > 0 && !error && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <File01Icon size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">{file.name}</h4>
                <p className="text-xs text-muted font-medium">{parsedData.length} registros listos para importar</p>
              </div>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-bold shadow-md hover:bg-accent/90 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckmarkCircle02Icon size={18} />
              )}
              {loading ? 'Procesando...' : 'Confirmar Matrículas'}
            </button>
          </div>

          <div className="border border-line/60 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="bg-neutral/50 sticky top-0 border-b border-line/60 backdrop-blur-md z-10">
                <tr>
                  <th className="py-2.5 px-4 font-bold text-muted text-xs uppercase tracking-wider">Estudiante</th>
                  <th className="py-2.5 px-4 font-bold text-muted text-xs uppercase tracking-wider">Apoderado</th>
                  <th className="py-2.5 px-4 font-bold text-muted text-xs uppercase tracking-wider">Sección</th>
                  <th className="py-2.5 px-4 font-bold text-muted text-xs uppercase tracking-wider">Periodo</th>
                  <th className="py-2.5 px-4 font-bold text-muted text-xs uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40 bg-white">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral/20 transition-colors">
                    <td className="py-2.5 px-4 text-ink">
                      <div className="font-medium">{row.nombres_estudiante} {row.apellidos_estudiante}</div>
                      <div className="text-[11px] text-muted">DNI: {row.dni_estudiante}</div>
                    </td>
                    <td className="py-2.5 px-4 text-ink">
                      <div className="font-medium">{row.nombres_apoderado} {row.apellidos_apoderado}</div>
                      <div className="text-[11px] text-muted">{row.relacion} - DNI: {row.dni_apoderado}</div>
                    </td>
                    <td className="py-2.5 px-4 text-muted">{row.nombre_seccion}</td>
                    <td className="py-2.5 px-4 text-muted">{row.nombre_periodo}</td>
                    <td className="py-2.5 px-4 text-muted">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        {row.estado_matricula || 'MATRICULADO'}
                      </span>
                    </td>
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
