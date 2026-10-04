// src/components/alumno/AlumnoSidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart2,
  Calendar,
  FolderPlus,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Resumen', href: '/alumno', icon: LayoutDashboard },
  { name: 'Asistencia', href: '/alumno/asistencia', icon: ClipboardCheck },
  { name: 'Calificaciones', href: '/alumno/calificaciones', icon: BarChart2 },
  { name: 'Horario', href: '/alumno/horario', icon: Calendar },
  { name: 'Materiales', href: '/alumno/materiales', icon: FolderPlus },
  { name: 'Mensajes', href: '/alumno/mensajes', icon: MessageSquare },
];

export const AlumnoSidebar: React.FC = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/alumno') return pathname === '/alumno';
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="mb-6">
          <Link
            href="/alumno"
            onClick={() => setMobileOpen(false)}
            className="block group focus-visible:outline-none"
          >
            <span className="text-[22px] font-black tracking-tight text-[#BE123C] block leading-tight">
              CORAULA
            </span>
            <span className="text-[11px] text-[#6B7280] font-normal block mt-0.5">
              Gestión educativa
            </span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-2" aria-label="Navegación del alumno">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 h-[42px] px-3 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[#FFE4E6] text-[#BE123C] font-bold shadow-2xs'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    active ? 'text-[#BE123C]' : 'text-[#6B7280]'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#E5E7EB] mt-auto">
        <div className="text-[12px] font-bold text-[#111827]">
          Colegio San Marcos
        </div>
        <div className="text-[11px] text-[#6B7280]">
          Alumno · 2026
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link href="/alumno" className="flex items-center gap-2">
          <span className="text-xl font-black text-[#BE123C]">CORAULA</span>
          <span className="text-xs text-[#6B7280]">· Alumno</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-[#111827] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20"
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white p-6 shadow-2xl transition-transform duration-300 lg:hidden flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-4">
          <div>
            <span className="text-xl font-black text-[#BE123C]">CORAULA</span>
            <span className="text-[11px] text-[#6B7280] block">Gestión educativa</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {navContent}
        </div>
      </div>

      {/* Desktop Fixed Sidebar (Frame sbAlu0) */}
      <aside
        className="hidden lg:flex w-[220px] h-screen bg-white border-r border-[#E5E7EB] p-6 flex-col fixed inset-y-0 left-0 z-30 shrink-0 select-none"
        aria-label="Barra lateral del alumno"
      >
        {navContent}
      </aside>
    </>
  );
};
