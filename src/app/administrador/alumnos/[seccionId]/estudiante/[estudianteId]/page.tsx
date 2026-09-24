'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { 
  ArrowLeft01Icon, 
  PencilEdit02Icon, 
  UserCircleIcon, 
  Mail01Icon, 
  SmartPhone01Icon, 
  Location01Icon,
  Calendar01Icon,
  HeartAddIcon,
  ShieldKeyIcon,
  BookOpen01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  Camera01Icon
} from 'hugeicons-react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';

const getEstudianteData = (seccionId: string, estudianteId: string) => {
  for (const grado of MOCK_GRADOS) {
    const seccion = grado.secciones.find(s => s.id === seccionId);
    if (seccion) {
      const estudiante = seccion.estudiantes.find(e => e.id === estudianteId);
      if (estudiante) return { estudiante, grado, seccion };
    }
  }
  return null;
};

export default function EstudianteDetallePage() {
  const params = useParams();
  const seccionId = params?.seccionId as string;
  const estudianteId = params?.estudianteId as string;

  const data = getEstudianteData(seccionId, estudianteId);

  if (!data) {
    notFound();
  }

  const { estudiante, grado, seccion } = data;

  // Estado de edición global
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [guardadoExito, setGuardadoExito] = useState<boolean>(false);

  // Estados de campos editables
  const [nombres, setNombres] = useState<string>(estudiante.nombres);
  const [apellidos, setApellidos] = useState<string>(estudiante.apellidos);
  const [telefono, setTelefono] = useState<string>(estudiante.telefono);
  const [correo, setCorreo] = useState<string>(estudiante.correo);
  const [fechaNacimiento, setFechaNacimiento] = useState<string>(estudiante.fechaNacimiento);
  const [dni, setDni] = useState<string>(estudiante.dni);
  
  // Contacto de emergencia
  const [contactoNombre, setContactoNombre] = useState<string>(estudiante.contactoEmergencia?.nombre || '');
  const [contactoRelacion, setContactoRelacion] = useState<string>(estudiante.contactoEmergencia?.relacion || '');
  const [contactoTelefono, setContactoTelefono] = useState<string>(estudiante.contactoEmergencia?.telefono || '');

  // Credenciales
  const [usuario, setUsuario] = useState<string>(estudiante.credenciales?.usuario || estudiante.dni);
  const [contrasenia, setContrasenia] = useState<string>(estudiante.credenciales?.contrasenia || '123456');

  // Foto
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(estudiante.fotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funciones auxiliares
  const isChanged = (current: string, original: string) => current !== original;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoUrl(url);
    }
  };

  const handleGuardarTodo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setGuardadoExito(true);
    setTimeout(() => setGuardadoExito(false), 3000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-canvas overflow-y-auto font-sans">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header & Breadcrumb Cover */}
      <div className="h-28 bg-accent relative shrink-0">
        <div className="absolute top-6 left-6 md:left-8 z-10 flex gap-2">
          <Link 
            href={`/administrador/alumnos/${seccionId}`}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white rounded-xl text-xs font-bold transition-all"
          >
            <ArrowLeft01Icon size={16} /> Volver al aula
          </Link>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-6 md:px-8 pb-12 -mt-12 relative z-20 flex-1 flex flex-col gap-6">
        
        {/* Header Profile Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-line p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            
            {/* Avatar con foto y vista previa */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-neutral border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-accent overflow-hidden relative">
                {fotoUrl ? (
                  <Image src={fotoUrl} alt="Foto Alumno" fill className="object-cover" />
                ) : (
                  <span>{nombres.charAt(0)}{apellidos.charAt(0)}</span>
                )}
              </div>
              
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-ink/65 rounded-full flex flex-col items-center justify-center text-white gap-1 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera01Icon size={20} />
                  <span className="text-[9px] font-bold uppercase">Cambiar</span>
                </button>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
              {!isEditing ? (
                <h1 className="text-xl md:text-2xl font-bold text-ink tracking-tight mb-1">
                  {nombres} {apellidos}
                </h1>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <input 
                    type="text" 
                    value={nombres} 
                    onChange={(e) => setNombres(e.target.value)}
                    placeholder="Nombres"
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border outline-none transition-colors ${
                      isChanged(nombres, estudiante.nombres)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-line bg-neutral/50 text-ink'
                    }`}
                  />
                  <input 
                    type="text" 
                    value={apellidos} 
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Apellidos"
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border outline-none transition-colors ${
                      isChanged(apellidos, estudiante.apellidos)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-line bg-neutral/50 text-ink'
                    }`}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold text-muted">
                <span className="bg-neutral px-2.5 py-1 rounded-lg text-ink flex items-center gap-1.5">
                  <BookOpen01Icon size={14} /> {grado.nombre} - Sec. {seccion.letra}
                </span>
                {!isEditing ? (
                  <span className="bg-neutral px-2.5 py-1 rounded-lg text-ink flex items-center gap-1.5">
                    <UserCircleIcon size={14} /> DNI: {dni}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-neutral/80 px-2 py-0.5 rounded-lg">
                    <span className="text-muted">DNI:</span>
                    <input 
                      type="text" 
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      className={`w-28 px-2 py-0.5 rounded text-xs font-bold border outline-none transition-colors ${
                        isChanged(dni, estudiante.dni)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-line bg-white text-ink'
                      }`}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botones Header */}
          <div className="flex items-center gap-3 shrink-0">
            {guardadoExito && (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold">
                <CheckmarkCircle01Icon size={16} /> Cambios guardados
              </div>
            )}

            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent/90 transition-colors shadow-sm"
              >
                <PencilEdit02Icon size={16} /> Editar Alumno
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral border border-line text-ink font-bold text-xs hover:bg-neutral/80 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleGuardarTodo}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-colors shadow-sm"
                >
                  <CheckmarkCircle01Icon size={16} /> Guardar Cambios
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Grid */}
        <form onSubmit={handleGuardarTodo} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Datos Personales */}
          <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col justify-between">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCircleIcon size={18} className="text-accent" /> Datos Personales
            </h2>
            <div className="grid grid-cols-1 gap-3">
              
              {/* Fecha Nacimiento */}
              <div className="flex items-center gap-3.5 p-3 bg-neutral/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0 shadow-xs">
                  <Calendar01Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">F. Nacimiento</p>
                  {!isEditing ? (
                    <p className="text-xs font-bold text-ink mt-0.5">{fechaNacimiento}</p>
                  ) : (
                    <input 
                      type="text" 
                      value={fechaNacimiento} 
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none transition-colors mt-1 ${
                        isChanged(fechaNacimiento, estudiante.fechaNacimiento)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-line bg-white text-ink'
                      }`}
                    />
                  )}
                </div>
              </div>
              
              {/* Celular */}
              <div className="flex items-center gap-3.5 p-3 bg-neutral/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0 shadow-xs">
                  <SmartPhone01Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Teléfono</p>
                  {!isEditing ? (
                    <p className="text-xs font-bold text-ink mt-0.5">{telefono}</p>
                  ) : (
                    <input 
                      type="text" 
                      value={telefono} 
                      onChange={(e) => setTelefono(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none transition-colors mt-1 ${
                        isChanged(telefono, estudiante.telefono)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-line bg-white text-ink'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Correo */}
              <div className="flex items-center gap-3.5 p-3 bg-neutral/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0 shadow-xs">
                  <Mail01Icon size={16} />
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Correo Institucional</p>
                  {!isEditing ? (
                    <p className="text-xs font-bold text-ink mt-0.5 truncate">{correo}</p>
                  ) : (
                    <input 
                      type="email" 
                      value={correo} 
                      onChange={(e) => setCorreo(e.target.value)}
                      className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none transition-colors mt-1 ${
                        isChanged(correo, estudiante.correo)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-line bg-white text-ink'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Dirección */}
              <div className="flex items-center gap-3.5 p-3 bg-neutral/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-muted shrink-0 shadow-xs">
                  <Location01Icon size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Dirección</p>
                  <p className="text-xs font-bold text-ink mt-0.5">Registrada en sistema central</p>
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-col gap-6">
            
            {/* Contacto de Emergencia */}
            <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm border-l-4 border-l-rose-400">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
                <HeartAddIcon size={18} className="text-rose-500" /> Contacto de Emergencia
              </h2>
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-col gap-3">
                {!isEditing ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Familiar / Apoderado</p>
                      <p className="text-xs font-bold text-ink mt-0.5">{contactoNombre}</p>
                      <p className="text-[11px] font-bold text-muted">{contactoRelacion}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Celular</p>
                      <p className="text-sm font-bold text-ink tracking-tight mt-0.5">{contactoTelefono}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Familiar</p>
                      <input 
                        type="text" 
                        value={contactoNombre}
                        onChange={(e) => setContactoNombre(e.target.value)}
                        placeholder="Nombre completo"
                        className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none mt-1 ${
                          isChanged(contactoNombre, estudiante.contactoEmergencia?.nombre || '')
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-line bg-white text-ink'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Parentesco</p>
                      <input 
                        type="text" 
                        value={contactoRelacion}
                        onChange={(e) => setContactoRelacion(e.target.value)}
                        placeholder="Ej. Madre / Padre"
                        className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none mt-1 ${
                          isChanged(contactoRelacion, estudiante.contactoEmergencia?.relacion || '')
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-line bg-white text-ink'
                        }`}
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Celular Emergencia</p>
                      <input 
                        type="text" 
                        value={contactoTelefono}
                        onChange={(e) => setContactoTelefono(e.target.value)}
                        placeholder="Número de celular"
                        className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold border outline-none mt-1 ${
                          isChanged(contactoTelefono, estudiante.contactoEmergencia?.telefono || '')
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-line bg-white text-ink'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Credenciales de Acceso */}
            <div className="bg-ink text-white rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-between">
              <ShieldKeyIcon size={110} className="absolute -right-5 -bottom-5 text-white/5 pointer-events-none" />
              
              <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                <ShieldKeyIcon size={18} className="text-accent-soft" /> Accesos al Sistema
              </h2>
              
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">Usuario (DNI)</p>
                  <div className="flex items-center justify-between">
                    {!isEditing ? (
                      <code className="text-xs font-mono font-bold">{usuario}</code>
                    ) : (
                      <input 
                        type="text" 
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        className={`w-full px-2 py-0.5 rounded text-xs font-mono font-bold outline-none ${
                          isChanged(usuario, estudiante.credenciales?.usuario || estudiante.dni)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      />
                    )}
                    {!isEditing && (
                      <button type="button" className="text-white/60 hover:text-white transition-colors p-0.5">
                        <Copy01Icon size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 flex flex-col justify-between">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">Contraseña</p>
                  <div className="flex items-center justify-between">
                    {!isEditing ? (
                      <code className="text-xs font-mono font-bold text-accent-soft">{contrasenia}</code>
                    ) : (
                      <input 
                        type="text" 
                        value={contrasenia}
                        onChange={(e) => setContrasenia(e.target.value)}
                        className={`w-full px-2 py-0.5 rounded text-xs font-mono font-bold outline-none ${
                          isChanged(contrasenia, estudiante.credenciales?.contrasenia || '123456')
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/20 text-white'
                        }`}
                      />
                    )}
                    {!isEditing && (
                      <button type="button" className="text-white/60 hover:text-white transition-colors p-0.5">
                        <Copy01Icon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-white/40 font-medium mt-3 relative z-10">
                * El alumno deberá cambiar esta contraseña al ingresar por primera vez.
              </p>
            </div>

          </div>
          
        </form>
      </div>
    </div>
  );
}
