import Link from 'next/link';
import React from 'react';

const ROLES = [
  {
    id: 'superadmin',
    name: 'Super Admin',
    path: '/superadmin',
    desc: 'Gestión global de instituciones, tenants y configuraciones del sistema.',
    badge: 'Sistema Global',
    color: 'bg-purple-900 text-white',
    hoverBorder: 'hover:border-purple-500',
  },
  {
    id: 'administrador',
    name: 'Administrador',
    path: '/administrador',
    desc: 'Gestión académica, matrícula, reportes institucionales y usuarios.',
    badge: 'Gestión Escolar',
    color: 'bg-rose-700 text-white',
    hoverBorder: 'hover:border-rose-500',
  },
  {
    id: 'docente',
    name: 'Docente',
    path: '/docente',
    desc: 'Registro de asistencia, publicaciones, calificaciones y aula virtual.',
    badge: 'Docencia',
    color: 'bg-blue-700 text-white',
    hoverBorder: 'hover:border-blue-500',
  },
  {
    id: 'padre',
    name: 'Padre / Apoderado',
    path: '/padre',
    desc: 'Seguimiento en tiempo real de notas, asistencia y avisos escolares.',
    badge: 'Familia',
    color: 'bg-emerald-700 text-white',
    hoverBorder: 'hover:border-emerald-500',
  },
  {
    id: 'alumno',
    name: 'Alumno',
    path: '/alumno',
    desc: 'Consulta de horario, tareas asignadas, notas y recursos académicos.',
    badge: 'Estudiante',
    color: 'bg-indigo-700 text-white',
    hoverBorder: 'hover:border-indigo-500',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between p-6 sm:p-12 font-sans">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center pb-8 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            C
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">CORAULA</h1>
            <p className="text-xs font-semibold text-muted tracking-wider uppercase">Plataforma Educativa Integrada</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-accent-soft text-accent text-xs font-bold rounded-full">
          Versión 2026
        </span>
      </header>

      <main className="max-w-6xl mx-auto w-full py-12 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-extrabold tracking-widest text-accent uppercase bg-accent-soft px-3 py-1 rounded-full inline-block mb-3">
            SELECCIÓN DE ROL
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-4">
            Bienvenido al portal de CORAULA
          </h2>
          <p className="text-muted text-sm sm:text-base">
            Selecciona un perfil de usuario para ingresar al entorno correspondiente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <Link
              key={role.id}
              href={role.path}
              className={`group bg-white p-6 rounded-2xl border border-line shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between ${role.hoverBorder}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${role.color}`}>
                    {role.badge}
                  </span>
                  <span className="text-xs text-muted group-hover:text-accent font-semibold flex items-center gap-1 transition-colors">
                    Ingresar &rarr;
                  </span>
                </div>
                <h3 className="text-xl font-bold text-ink mb-2 group-hover:text-accent transition-colors">
                  {role.name}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {role.desc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
                <span>Ruta: <code className="bg-canvas px-1.5 py-0.5 rounded text-ink font-mono">{role.path}</code></span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto w-full pt-8 border-t border-line text-center text-xs text-muted">
        <p>© 2026 CORAULA. Todos los derechos reservados. Basado en el sistema de diseño Cary.</p>
      </footer>
    </div>
  );
}
