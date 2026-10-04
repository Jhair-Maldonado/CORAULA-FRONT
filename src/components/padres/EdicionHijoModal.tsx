import React, { useState, useRef } from 'react';
import { 
  Cancel01Icon, 
  Camera01Icon, 
  HeartAddIcon, 
  Location01Icon, 
  TelephoneIcon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';
import { HijoResumen } from '@/types/padre';

interface EdicionHijoModalProps {
  hijo: HijoResumen;
  onClose: () => void;
  onSave: (hijoEditado: HijoResumen) => void;
}

export function EdicionHijoModal({ hijo, onClose, onSave }: EdicionHijoModalProps) {
  // Estados de campos editables permitidos para el Padre
  const [telefono, setTelefono] = useState<string>(hijo.tutorTelefono || '');
  const [direccion, setDireccion] = useState<string>(''); // No existe en HijoResumen, pero la simulamos
  const [tipoSangre, setTipoSangre] = useState<string>(hijo.tipoSangre || '');
  const [alergias, setAlergias] = useState<string>(hijo.alergias || '');
  const [seguroMedico, setSeguroMedico] = useState<string>(hijo.seguroMedico || '');
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(hijo.fotoUrl);
  
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoUrl(url);
    }
  };

  const isChanged = (current: string, original: string) => current !== original;

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    
    // Simular guardado
    setTimeout(() => {
      onSave({
        ...hijo,
        tutorTelefono: telefono,
        tipoSangre,
        alergias,
        seguroMedico,
        fotoUrl
      });
      setGuardando(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-line w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Header Modal */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-line p-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-sm font-black text-ink uppercase tracking-wider">
            Editar Ficha de {hijo.nombres}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-neutral transition-colors"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        <form onSubmit={handleGuardar} className="p-6 flex flex-col gap-8">
          
          {/* Avatar y Datos Intocables */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-neutral border-4 border-white shadow-md flex items-center justify-center text-3xl font-black text-accent overflow-hidden relative">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto Alumno" className="w-full h-full object-cover" />
                ) : (
                  <span>{hijo.nombres.charAt(0)}{hijo.apellidos.charAt(0)}</span>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-ink/65 rounded-full flex flex-col items-center justify-center text-white gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-white"
              >
                <Camera01Icon size={20} />
                <span className="text-[9px] font-bold uppercase">Cambiar</span>
              </button>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h3 className="text-lg font-black text-ink leading-tight">{hijo.nombreCompleto}</h3>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] font-bold text-muted mt-2">
                <span className="bg-neutral px-2.5 py-1 rounded">DNI: {hijo.dni}</span>
                <span className="bg-neutral px-2.5 py-1 rounded">{hijo.grado} "{hijo.seccion}" - {hijo.nivel}</span>
              </div>
              <p className="text-[9px] font-bold text-accent uppercase tracking-wider mt-2">
                * Nombres y grado solo pueden ser modificados por Secretaría.
              </p>
            </div>
          </div>

          {/* Formulario Editable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            
            {/* Información Médica */}
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-1.5 border-b border-line pb-2 mb-4">
                <HeartAddIcon size={14} className="text-accent" />
                Información Médica
              </h4>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Alergias</label>
              <input 
                type="text" 
                value={alergias} 
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Ej. Penicilina, Maní (o 'Ninguna')"
                className={`px-3 py-2 rounded-lg text-xs font-bold border outline-none transition-colors ${
                  isChanged(alergias, hijo.alergias || '') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-neutral text-ink'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Tipo de Sangre</label>
              <select 
                value={tipoSangre} 
                onChange={(e) => setTipoSangre(e.target.value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border outline-none transition-colors ${
                  isChanged(tipoSangre, hijo.tipoSangre || '') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-neutral text-ink'
                }`}
              >
                <option value="">Seleccionar...</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Seguro Médico / EPS</label>
              <input 
                type="text" 
                value={seguroMedico} 
                onChange={(e) => setSeguroMedico(e.target.value)}
                placeholder="Ej. Pacífico, RIMAC, EsSalud"
                className={`px-3 py-2 rounded-lg text-xs font-bold border outline-none transition-colors ${
                  isChanged(seguroMedico, hijo.seguroMedico || '') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-neutral text-ink'
                }`}
              />
            </div>

            {/* Información de Contacto (Apoderado) */}
            <div className="col-span-1 md:col-span-2 mt-4">
              <h4 className="text-[11px] font-black text-ink uppercase tracking-wider flex items-center gap-1.5 border-b border-line pb-2 mb-4">
                <TelephoneIcon size={14} className="text-muted" />
                Información de Contacto Actualizada
              </h4>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Teléfono de Emergencia</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Número de celular"
                className={`px-3 py-2 rounded-lg text-xs font-bold border outline-none transition-colors ${
                  isChanged(telefono, hijo.tutorTelefono || '') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-neutral text-ink'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Dirección (Referencial)</label>
              <input 
                type="text" 
                value={direccion} 
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección actual"
                className={`px-3 py-2 rounded-lg text-xs font-bold border outline-none transition-colors ${
                  isChanged(direccion, '') ? 'border-accent bg-accent/5 text-accent' : 'border-line bg-neutral text-ink'
                }`}
              />
            </div>

          </div>

          {/* Botonera */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-line mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-ink bg-white border border-line hover:bg-neutral transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-accent border border-accent hover:bg-accent-soft hover:border-accent-soft transition-all shadow-sm flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckmarkCircle01Icon size={16} />
                  Guardar Ficha
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
