import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeccionById, MOCK_GRADOS } from '@/data/mockAlumnos';
import { Edit01Icon } from 'hugeicons-react';

export const metadata = {
  title: 'Detalle de Alumno - CORAULA',
};

// Next.js static params generation
export function generateStaticParams() {
  const paths: { seccionId: string; estudianteId: string }[] = [];
  MOCK_GRADOS.forEach(grado => {
    grado.secciones.forEach(seccion => {
      seccion.estudiantes.forEach(estudiante => {
        paths.push({
          seccionId: seccion.id,
          estudianteId: estudiante.id,
        });
      });
    });
  });
  return paths;
}

export default async function EstudianteDetallePage({ 
  params 
}: { 
  params: Promise<{ seccionId: string; estudianteId: string }> 
}) {
  const { seccionId, estudianteId } = await params;

  let estudianteData = null;
  let seccionData = null;

  for (const grado of MOCK_GRADOS) {
    const s = getSeccionById(grado.id, seccionId);
    if (s) {
      const e = s.estudiantes.find(est => est.id === estudianteId);
      if (e) {
        estudianteData = e;
        seccionData = s;
        break;
      }
    }
  }

  if (!estudianteData || !seccionData) {
    notFound();
  }

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto w-full max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href={`/administrador/alumnos/${seccionId}`}
            className="text-ink text-xl font-bold font-sans hover:text-accent transition-colors flex items-center gap-2 w-fit"
          >
            &larr; Regresar
          </Link>
          <p className="text-muted text-[15px] mt-1">
            {estudianteData.nombres} {estudianteData.apellidos} - {seccionData.nombre}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-neutral text-ink hover:bg-line transition-colors rounded-lg font-semibold text-sm">
          <Edit01Icon size={16} />
          Editar Alumno
        </button>
      </div>

      {/* Main Profile Box */}
      <div className="w-full bg-white rounded-xl flex flex-col p-6 md:p-8 gap-8 border border-line shadow-sm">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar & Name */}
          <div className="flex flex-col items-center justify-center gap-3 md:w-[260px] md:border-r border-line md:pr-8 shrink-0">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold">
              {estudianteData.nombres.charAt(0)}{estudianteData.apellidos.charAt(0)}
            </div>
            <h2 className="text-ink text-base font-bold text-center">
              {estudianteData.nombres} {estudianteData.apellidos}
            </h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              estudianteData.estado === 'Activo' ? 'bg-success text-success-ink' : 'bg-accent-soft text-accent'
            }`}>
              {estudianteData.estado}
            </span>
          </div>

          {/* Personal Data */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-accent text-xs font-bold uppercase tracking-wider">
              Datos Personales
            </h3>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">DNI</span>
                <span className="text-ink text-xs">{estudianteData.dni}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Edad</span>
                <span className="text-ink text-xs">{estudianteData.edad} años</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Fecha de Nac.</span>
                <span className="text-ink text-xs">{estudianteData.fechaNacimiento}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Teléfono</span>
                <span className="text-ink text-xs">{estudianteData.telefono}</span>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Correo institucional</span>
                <span className="text-ink text-xs">{estudianteData.correo}</span>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Dirección</span>
                <span className="text-ink text-xs">{estudianteData.direccion}</span>
              </div>
            </div>
          </div>
        </div>
        
        <hr className="border-line" />

        <div className="flex flex-col md:flex-row gap-8">
          {/* Emergency Contact */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-accent text-xs font-bold uppercase tracking-wider">
              Contacto de Emergencia
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Familiar / Apoderado</span>
                <span className="text-ink text-xs">{estudianteData.contactoEmergencia.nombre} ({estudianteData.contactoEmergencia.relacion})</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Teléfono</span>
                <span className="text-ink text-xs font-semibold">{estudianteData.contactoEmergencia.telefono}</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block w-[1px] bg-line" />

          {/* System Credentials */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-accent text-xs font-bold uppercase tracking-wider">
              Credenciales del Sistema
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Usuario (DNI)</span>
                <span className="text-ink text-xs font-mono bg-neutral p-1.5 rounded w-fit">{estudianteData.credenciales.usuario}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wide">Contraseña Inicial</span>
                <span className="text-ink text-xs font-mono bg-neutral p-1.5 rounded w-fit">{estudianteData.credenciales.contrasenia}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
