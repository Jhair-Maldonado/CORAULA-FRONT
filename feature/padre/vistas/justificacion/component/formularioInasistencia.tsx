'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { MotivoJustificacion } from '@/types/padre';
import { enviarJustificacion } from '@/services/padres/padreService';
import { usePadre } from '@/components/padres/PadreContext';
import { 
  Alert02Icon, 
  Clock01Icon, 
  Image01Icon, 
  VideoOffIcon, 
  CheckmarkCircle01Icon
} from 'hugeicons-react';

interface FormularioInasistenciaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  hijoIdPrecargado?: string;
  fechaPrecargada?: string;
}

const MOTIVOS: MotivoJustificacion[] = [
  'Salud / Médico',
  'Familiar',
  'Viaje',
  'Fuerza Mayor',
  'Otro',
];

export const FormularioInasistencia: React.FC<FormularioInasistenciaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  hijoIdPrecargado,
  fechaPrecargada,
}) => {
  const { hijos, selectedHijoId } = usePadre();
  const [hijoId, setHijoId] = useState(hijoIdPrecargado || selectedHijoId || (hijos[0]?.id ?? ''));
  const [fecha, setFecha] = useState(fechaPrecargada || new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<MotivoJustificacion>('Salud / Médico');
  const [descripcion, setDescripcion] = useState('');
  
  // Archivos
  const [archivoNombre, setArchivoNombre] = useState('');
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (hijoIdPrecargado) {
      setHijoId(hijoIdPrecargado);
    }
  }, [hijoIdPrecargado]);
  
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Lógica de mock para saber si es falta o tardanza basada en la fecha precargada (para el demo)
  const esTardanza = fechaPrecargada === '2026-05-08' || fechaPrecargada === '2026-05-02';
  const tipoIncidencia = esTardanza ? 'Tardanza' : 'Falta';
  const minutosMora = esTardanza ? 22 : 0;
  const horaLlegada = esTardanza ? '08:22 AM' : '--';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorArchivo('');
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type.startsWith('video/')) {
        setErrorArchivo('No se permite video, por favor adjunte solo imágenes (JPG, PNG).');
        setArchivoNombre('');
        setArchivoPreview(null);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrorArchivo('Formato no válido. Solo se permiten imágenes.');
        setArchivoNombre('');
        setArchivoPreview(null);
        return;
      }

      setArchivoNombre(file.name);
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setArchivoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setArchivoNombre('');
    setArchivoPreview(null);
    setErrorArchivo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setErrorMsg('Por favor ingrese la explicación detallada de la inasistencia');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await enviarJustificacion({
        hijoId,
        fechaInasistencia: fecha,
        motivo,
        descripcion,
        archivoNombre: archivoNombre || undefined,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setDescripcion('');
        setArchivoNombre('');
        setArchivoPreview(null);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Formulario de Justificación"
      description="Envíe una justificación formal dirigida a la coordinación académica y al tutor."
      maxWidth="3xl"
    >
      {submittedSuccess ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mx-auto text-3xl font-bold">
            ✓
          </div>
          <h4 className="text-xl font-bold text-[#111827]">
            ¡Justificación enviada con éxito!
          </h4>
          <p className="text-sm text-[#6B7280]">
            El tutor y la coordinación académica revisarán su solicitud a la brevedad.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-2">
          
          {/* LADO IZQUIERDO: Info de Incidencia (2/5) */}
          <div className="md:col-span-2 bg-slate-50 border border-line rounded-2xl p-5 flex flex-col justify-center">
            
            <div className="text-center mb-6">
              <h3 className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">
                Incidencia a Justificar
              </h3>
              <p className="text-sm font-bold text-ink">{fecha}</p>
            </div>

            {tipoIncidencia === 'Tardanza' ? (
              <div className="bg-amber-100 border border-amber-200 rounded-xl p-5 text-center shadow-sm">
                <div className="w-14 h-14 bg-amber-500 rounded-full text-white mx-auto flex items-center justify-center shadow-md mb-4 animate-pulse-slow">
                  <Clock01Icon size={28} />
                </div>
                <h4 className="text-xl font-black text-amber-900 uppercase tracking-wider mb-2">Tardanza</h4>
                
                <div className="bg-white/60 rounded-lg p-3 inline-block mx-auto">
                  <p className="text-xs font-bold text-amber-800 mb-1">
                    Mora de <span className="text-amber-600 text-lg">{minutosMora} min</span>
                  </p>
                  <p className="text-[10px] font-black text-amber-900/60 uppercase">
                    Hora de Ingreso: {horaLlegada}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-red-100 border border-red-200 rounded-xl p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-red-600 rounded-full text-white mx-auto flex items-center justify-center shadow-md mb-4 rotate-[-10deg]">
                  <Alert02Icon size={32} />
                </div>
                <h4 className="text-3xl font-black text-red-700 uppercase tracking-widest">Falta</h4>
                <p className="text-xs font-bold text-red-800 mt-2">
                  Inasistencia de día completo
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-[9px] font-medium text-muted px-4 leading-relaxed">
                Asegúrese de adjuntar la justificación válida (receta médica, constancia, etc.) en formato de imagen para ser evaluada por la coordinación.
              </p>
            </div>
            
          </div>

          {/* LADO DERECHO: Formulario (3/5) */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-5 h-full flex flex-col">
              
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Estudiante"
                  required
                  value={hijoId}
                  onChange={(e) => setHijoId(e.target.value)}
                >
                  {hijos.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombres} {h.apellidos}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Motivo Principal"
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoJustificacion)}
                >
                  {MOTIVOS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <Textarea
                label="Explicación detallada"
                rows={3}
                required
                placeholder="Describa brevemente la razón de la ausencia o tardanza..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />

              {/* Sección de Imagen */}
              <div className="space-y-2 flex-1">
                <label className="text-[11px] font-bold text-ink uppercase tracking-wider">
                  Adjuntar Imagen de Evidencia (Opcional)
                </label>
                
                {errorArchivo && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                    <VideoOffIcon size={16} />
                    {errorArchivo}
                  </div>
                )}

                {!archivoPreview ? (
                  <div className="border-2 border-dashed border-line rounded-xl p-6 bg-slate-50/50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center group relative cursor-pointer">
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 rounded-full bg-white border border-line flex items-center justify-center text-muted mb-3 group-hover:text-accent group-hover:border-accent transition-colors shadow-sm">
                      <Image01Icon size={24} />
                    </div>
                    <p className="text-xs font-bold text-ink mb-1 group-hover:text-accent">
                      Haz clic o arrastra tu imagen aquí
                    </p>
                    <p className="text-[10px] text-muted">
                      Solo se permiten imágenes (PNG, JPG). <br/>
                      <span className="font-bold text-red-400">No se permiten videos.</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in zoom-in-95">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-emerald-200 shadow-sm shrink-0 bg-white">
                      <img src={archivoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-700 font-black text-xs mb-1">
                        <CheckmarkCircle01Icon size={16} /> Imagen adjuntada
                      </div>
                      <p className="text-[10px] font-medium text-emerald-800/70 truncate w-48 mb-3">
                        {archivoNombre}
                      </p>
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider bg-white px-2 py-1 rounded shadow-sm border border-red-100"
                      >
                        Quitar Imagen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-auto">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Enviar Justificación
                </Button>
              </div>
            </form>
          </div>

        </div>
      )}
    </Modal>
  );
};
