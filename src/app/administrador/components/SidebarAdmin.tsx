'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  DashboardSquare01Icon, 
  TeacherIcon, 
  UserGroupIcon, 
  Task01Icon, 
  Shield01Icon 
} from 'hugeicons-react';

const MENU_ITEMS = [
  { name: 'Resumen', path: '/administrador', icon: DashboardSquare01Icon },
  { name: 'Docentes', path: '/administrador/docentes', icon: TeacherIcon },
  { name: 'Alumnos', path: '/administrador/alumnos', icon: UserGroupIcon },
  { name: 'Notas', path: '/administrador/notas', icon: Task01Icon },
  { name: 'Matricula', path: '/administrador/matricula', icon: Task01Icon },
  { name: 'Auditoría', path: '/administrador/auditoria', icon: Shield01Icon },
];

export const SidebarAdmin = () => {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] h-screen bg-white border-r border-line flex flex-col p-6 sticky top-0 shrink-0">
      {/* Brand */}
      <div className="mb-8">
        <h1 className="text-accent text-[22px] font-extrabold font-sans tracking-tight">
          CORAULA
        </h1>
        <p className="text-muted text-[11px] font-normal">
          Gestión educativa
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/administrador' && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors font-sans ${
                isActive 
                  ? 'bg-accent-soft text-accent' 
                  : 'text-muted hover:bg-neutral hover:text-ink'
              }`}
            >
              <item.icon 
                size={18} 
                className={isActive ? 'text-accent' : 'text-muted'} 
              />
              <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 flex flex-col gap-1.5">
        <div className="w-full h-[1px] bg-line mb-3" />
        <span className="text-ink text-sm font-bold truncate">I.E. Santa Rosa</span>
        <span className="text-muted text-xs">Administrador</span>
      </div>
    </aside>
  );
};
