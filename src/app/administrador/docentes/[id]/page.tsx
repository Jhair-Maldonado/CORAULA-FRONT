'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft01Icon, 
  Add01Icon, 
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  PencilEdit01Icon,
  Camera01Icon
} from 'hugeicons-react';
import { MOCK_DOCENTES, Docente } from '@/data/mockDocentes';

export default function DocentePerfilPage() {
  const params = useParams();
  const docenteId = params?.id as string;

  const docenteOriginal = MOCK_DOCENTES.find(d => d.id === docenteId) || MOCK_DOCENTES[0];

  // Modo edicion global controlado desde el header
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [guardadoExito, setGuardadoExito] = useState<boolean>(false);

  // Estados editables
  const [nombres, setNombres] = useState<string>(docenteOriginal.nombres);
  const [apellidos, setApellidos] = useState<string>(docenteOriginal.apellidos);
  const [contacto, setContacto] = useState<string>(docenteOriginal.contacto);
  const [correo, setCorreo] = useState<string>(docenteOriginal.correo);
  const [dni, setDni] = useState<string>(docenteOriginal.dni);
  const [usuario, setUsuario] = useState<string>(docenteOriginal.usuario);
  const [contrasenia, setContrasenia] = useState<string>(docenteOriginal.contrasenia);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(docenteOriginal.fotoUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funciones para detectar si un valor cambió
  const isChanged = (current: string, original: string) => current !== original;

  // Manejo de cambio de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFotoUrl(imageUrl);
    }
  };

  const handleGuardarTodo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setGuardadoExito(true);
    setTimeout(() => setGuardadoExito(false), 3000);
  };

  return (
    <div className="w-full h-full p-6 md:p-10 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* NAVEGACIÓN Y ENCABEZADO */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-2">
        <Link 
          href="/administrador/docentes" 
          className="text-muted text-xs font-bold hover:text-accent transition-colors flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft01Icon size={14} /> Regresar a lista de docentes
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1">
          <div>
            <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
              EQUIPO ACADÉMICO
            </span>
            <h1 className="text-ink text-2xl font-extrabold mt-0.5 tracking-tight">
              Perfil de docente
            </h1>
            <p className="text-muted text-xs font-medium mt-0.5">
              Consulta su desempeño, asignaciones y disponibilidad semanal.
            </p>
          </div>

          {/* BOTÓN EDITAR / GUARDAR EN EL HEADER */}
          <div className="flex items-center gap-3">
            {guardadoExito && (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold animate-fade-in">
                <CheckmarkCircle01Icon size={16} /> Cambios guardados
              </div>
            )}

            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-all shadow-sm"
              >
                <PencilEdit01Icon size={16} />
                <span>Editar Docente</span>
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/90 transition-colors shadow-sm"
                >
                  <CheckmarkCircle01Icon size={16} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: 2 COLUMNAS */}
      <form onSubmit={handleGuardarTodo} className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        
        {/* COLUMNA IZQUIERDA (7 COLS): PERFIL + ASIGNACIONES */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* CARD PERFIL Y KPIS DE ASISTENCIA */}
          <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-5 items-start">
            
            {/* Foto Avatar Docente con Upload */}
            <div className="w-full md:w-44 h-44 rounded-xl bg-neutral/80 overflow-hidden relative shrink-0 border border-line flex items-center justify-center group">
              {fotoUrl ? (
                <img 
                  src={fotoUrl} 
                  alt={docenteOriginal.nombreCompleto} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-soft text-accent font-extrabold text-2xl flex items-center justify-center">
                  {docenteOriginal.iniciales}
                </div>
              )}

              {/* Overlay para editar foto */}
              {isEditing && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-ink/60 flex flex-col items-center justify-center text-white gap-1 cursor-pointer transition-opacity"
                >
                  <Camera01Icon size={24} />
                  <span className="text-[10px] font-bold">Cambiar Foto</span>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Datos y KPIs de Asistencia */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              
              {/* Identidad y Cargo */}
              <div>
                <h2 className="text-ink font-extrabold text-lg md:text-xl leading-tight">
                  {nombres} {apellidos}
                </h2>
                <p className="text-accent text-xs font-bold mt-0.5">
                  Docente de {docenteOriginal.materiaPrincipal} · {docenteOriginal.nivel}
                </p>
              </div>

              {/* KPIs de Asistencia (Grid 3 Mini Badges) */}
              <div className="grid grid-cols-3 gap-2 bg-canvas/60 p-3 rounded-xl border border-line">
                
                {/* Asistencias */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted uppercase">Asistencias</span>
                  <span className="text-lg font-black text-accent">{docenteOriginal.asistenciasPorcentaje}%</span>
                  <span className="text-[9px] font-semibold text-muted">Periodo actual</span>
                </div>

                {/* Faltas */}
                <div className="flex flex-col gap-1 border-l border-line pl-3">
                  <span className="text-[10px] font-bold text-muted uppercase">Faltas</span>
                  <span className="text-lg font-black text-ink">{docenteOriginal.faltasDias} días</span>
                  <span className="text-[9px] font-semibold text-muted">Periodo actual</span>
                </div>

                {/* Tardanzas */}
                <div className="flex flex-col gap-1 border-l border-line pl-3">
                  <span className="text-[10px] font-bold text-muted uppercase">Tardanzas</span>
                  <span className="text-lg font-black text-amber-500">{docenteOriginal.tardanzasRegistros} reg.</span>
                  <span className="text-[9px] font-semibold text-muted">Periodo actual</span>
                </div>

              </div>

            </div>

          </div>

          {/* CARD ASIGNACIÓN DE CURSOS, GRADO Y SECCIÓN */}
          <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-ink font-extrabold text-sm flex items-center gap-2">
                <BookOpen01Icon size={16} className="text-accent" />
                Asignación de cursos, grado y sección
              </h3>
              {isEditing && (
                <button 
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold hover:bg-accent/90 transition-colors"
                >
                  <Add01Icon size={14} />
                  <span>Nuevo curso</span>
                </button>
              )}
            </div>

            {/* Lista de asignaciones */}
            <div className="flex flex-col gap-2">
              {docenteOriginal.asignaciones.map((asig) => (
                <div 
                  key={asig.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral/40 border border-line hover:bg-neutral/80 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-ink font-bold text-xs w-36 truncate">{asig.curso}</span>
                    <span className="text-muted text-xs font-semibold w-28 truncate">{asig.nivelGrado}</span>
                    <span className="text-muted text-xs font-semibold">{asig.seccion}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* COLUMNA DERECHA (5 COLS): CREDANCIALES Y DATOS PERSONALES */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl border border-line p-5 md:p-6 shadow-sm flex flex-col gap-4">
            
            {/* SECCIÓN CREDENCIALES */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-ink font-extrabold text-sm">
                Credenciales del Sistema
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              
              {/* Correo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Correo Electrónico:</label>
                <input 
                  type="email" 
                  disabled={!isEditing}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(correo, docenteOriginal.correo)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

              {/* DNI */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">DNI / Documento:</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(dni, docenteOriginal.dni)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

              {/* Usuario */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Usuario de Acceso:</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(usuario, docenteOriginal.usuario)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Contraseña:</label>
                <input 
                  type="password" 
                  disabled={!isEditing}
                  value={contrasenia}
                  onChange={(e) => setContrasenia(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(contrasenia, docenteOriginal.contrasenia)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>
            </div>

            {/* SECCIÓN DATOS PERSONALES */}
            <div className="border-t border-line pt-4 mt-2 flex flex-col gap-3">
              <h3 className="text-ink font-extrabold text-sm border-b border-line pb-2">
                Datos personales
              </h3>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Nombre:</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(nombres, docenteOriginal.nombres)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Apellido:</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(apellidos, docenteOriginal.apellidos)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-muted uppercase">Contacto:</label>
                <input 
                  type="text" 
                  disabled={!isEditing}
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-colors ${
                    isEditing && isChanged(contacto, docenteOriginal.contacto)
                      ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold'
                      : 'bg-neutral/40 border-line text-ink'
                  }`}
                />
              </div>

            </div>

          </div>

        </div>

      </form>

    </div>
  );
}
