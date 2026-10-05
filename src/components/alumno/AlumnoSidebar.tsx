// src/components/alumno/AlumnoSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart2,
  Calendar,
  FolderPlus,
  MessageSquare,
  LogOut,
  Bell
} from 'lucide-react';
import { useAlumnoSession, DEFAULT_ALUMNO_SESSION } from './AlumnoSessionContext';

type MenuItem = {
  name: string;
  path: string;
  icon: any;
  badge?: string | number;
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'Resumen', path: '/alumno', icon: LayoutDashboard },
  { name: 'Asistencia', path: '/alumno/asistencia', icon: ClipboardCheck },
  { name: 'Notas', path: '/alumno/calificaciones', icon: BarChart2 },
  { name: 'Horario', path: '/alumno/horario', icon: Calendar },
  { name: 'Materiales', path: '/alumno/materiales', icon: FolderPlus },
  { name: 'Mensajes', path: '/alumno/mensajes', icon: MessageSquare, badge: 1 },
];

export const AlumnoSidebar: React.FC = () => {
  const pathname = usePathname();
  const { session, logout } = useAlumnoSession();
  const alumno = session || DEFAULT_ALUMNO_SESSION;

  return (
    <>
      <aside className="w-[72px] bg-white border-r border-line flex flex-col h-full shrink-0 z-40 hidden md:flex">
        {/* Logo Mini */}
        <div className="h-16 flex items-center justify-center shrink-0 border-b border-line">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-sm shrink-0 font-black text-sm tracking-tight">
            C
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-2 custom-scrollbar">
          {MENU_ITEMS.map((item) => {
            const isActive = item.path === '/alumno'
              ? pathname === '/alumno'
              : pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-accent text-white' 
                    : 'text-muted hover:bg-neutral hover:text-ink'
                  }`}
              >
                <div className="relative">
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-muted group-hover:text-ink'} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-accent text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-center tracking-tight leading-tight w-full truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* User / Logout */}
        <div className="p-2 border-t border-line flex flex-col gap-2">
          {alumno && (
            <div className="flex flex-col items-center justify-center gap-1 p-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#BE123C] font-bold text-xs uppercase overflow-hidden shadow-2xs">
                {alumno.nombre.substring(0, 2).toUpperCase()}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-muted hover:bg-accent-soft hover:text-accent transition-all group"
            title="Cerrar sesión"
          >
            <LogOut size={20} className="group-hover:text-accent" />
            <span className="text-[9px] font-bold text-center tracking-tight leading-tight">Salir</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navbar Placeholder (Minimalist) */}
      <div className="md:hidden flex items-center justify-between h-14 bg-white border-b border-line px-4 shrink-0">
         <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white font-black text-sm">
            C
         </div>
         <button className="p-2 text-muted">
           <Bell size={20} />
         </button>
      </div>
    </>
  );
};
