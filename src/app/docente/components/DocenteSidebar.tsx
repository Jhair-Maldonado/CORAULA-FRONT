// src/app/docente/components/DocenteSidebar.tsx
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  MessageSquare,
  LogOut,
  Settings
} from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useDocenteSession } from './DocenteSessionContext';

interface DocenteSidebarProps {
  onMobileClose?: () => void;
}

export const DocenteSidebar: React.FC<DocenteSidebarProps> = ({ onMobileClose }) => {
  const pathname = usePathname();
  const authContext = useContext(AuthContext);
  const { docenteNombre, materia } = useDocenteSession();

  const handleLogout = () => {
    authContext?.logout();
  };

  const menuItems = [
    {
      name: 'Cursos',
      path: '/docente',
      icon: BookOpen,
      matchExact: true
    },
    {
      name: 'Asistencia',
      path: '/docente/asistencia',
      icon: CalendarCheck,
      matchExact: false
    },
    {
      name: 'Notas',
      path: '/docente/notas',
      icon: ClipboardCheck,
      matchExact: false
    },
    {
      name: 'Chats',
      path: '/docente/chat',
      icon: MessageSquare,
      badge: 3,
      matchExact: false
    }
  ];

  return (
    <aside className="w-[220px] bg-white border-r border-[#E5E7EB] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E5E7EB] flex flex-col gap-0.5">
        <Link href="/docente" className="inline-block" onClick={onMobileClose}>
          <span className="font-extrabold text-[22px] tracking-tight text-[#BE123C] font-sans">
            CORAULA
          </span>
        </Link>
        <span className="text-[10px] font-extrabold tracking-wider text-[#64748B] uppercase">
          GESTIÓN DOCENTE
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.path || pathname.startsWith('/docente/cursos')
            : pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onMobileClose}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${
                isActive
                  ? 'bg-[#BE123C] text-white font-semibold shadow-xs'
                  : 'text-[#64748B] hover:bg-[#F3F4F6] hover:text-[#111827]'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#111827] transition-colors'}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-[#BE123C]' : 'bg-[#FFE4E6] text-[#BE123C]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Docente Info & Logout Footer */}
      <div className="p-3 border-t border-[#E5E7EB] flex flex-col gap-2 bg-[#FAFAFA]">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-[#FFE4E6] text-[#BE123C] font-bold text-xs flex items-center justify-center shrink-0 border border-[#BE123C]/20">
            CM
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-semibold text-[#111827] truncate">
              {docenteNombre}
            </span>
            <span className="text-[10px] text-[#64748B] truncate">
              {materia}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB]/60">
          <button
            type="button"
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748B] hover:text-[#111827] transition-colors px-2 py-1 rounded-md hover:bg-white"
            title="Ajustes de cuenta"
          >
            <Settings size={14} />
            <span>Ajustes</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#BE123C] hover:text-red-700 transition-colors px-2 py-1 rounded-md hover:bg-[#FFE4E6]/50 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
