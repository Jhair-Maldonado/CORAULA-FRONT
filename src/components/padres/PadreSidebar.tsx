// src/components/padres/PadreSidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Task01Icon,
  Calendar01Icon,
  Clock01Icon,
  Notification01Icon,
  CreditCardIcon,
  Comment01Icon,
  Logout01Icon,
  Menu01Icon,
  Cancel01Icon,
  StudentIcon,
  AlertCircleIcon,
} from 'hugeicons-react';
import { usePadre } from './PadreContext';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/padre', icon: DashboardSquare01Icon },
  { name: 'Hijos a Cargo', href: '/padre/hijos', icon: UserGroupIcon },
  { name: 'Calificaciones', href: '/padre/calificaciones', icon: Task01Icon },
  { name: 'Asistencia', href: '/padre/asistencia', icon: Calendar01Icon },
  { name: 'Horario Escolar', href: '/padre/horario', icon: Clock01Icon },
  { name: 'Justificaciones y Alertas', href: '/padre/justificaciones', icon: AlertCircleIcon, badge: '1 Alerta' },
  { name: 'Comunicados', href: '/padre/comunicados', icon: Notification01Icon, badge: 2 },
  { name: 'Mensajes / Docentes', href: '/padre/chat', icon: Comment01Icon, badge: 1 },
];


export const PadreSidebar: React.FC = () => {
  const pathname = usePathname();
  const { padre, selectedHijo } = usePadre();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/padre') return pathname === '/padre';
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <Link href="/padre" className="flex items-center gap-3 group focus-visible:outline-none">
            <div className="w-10 h-10 rounded-xl bg-[#BE123C] flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-[#111827] tracking-tight">CORAULA</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFE4E6] text-[#BE123C] px-1.5 py-0.5 rounded">
                  Familias
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#6B7280]">Seguimiento Escolar</p>
            </div>
          </Link>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              aria-label="Cerrar menú"
            >
              <Cancel01Icon size={20} />
            </button>
          )}
        </div>

        {/* Selected Child Quick Indicator */}
        {selectedHijo && (
          <div className="mx-4 my-3 p-3 bg-slate-50 border border-[#E5E7EB] rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center font-bold text-xs shrink-0">
              {selectedHijo.nombres.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#111827] truncate">
                {selectedHijo.nombreCompleto}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                {selectedHijo.grado} &quot;{selectedHijo.seccion}&quot;
              </p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 group ${
                  active
                    ? 'bg-[#FFE4E6] text-[#BE123C] shadow-2xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={20}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-[#BE123C]' : 'text-[#6B7280] group-hover:text-[#111827]'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-[#BE123C] text-white'
                        : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Parent Profile & Logout Footer */}
      <div className="p-4 border-t border-[#E5E7EB] bg-slate-50/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 border border-white shadow-2xs">
              {padre?.nombres ? padre.nombres.charAt(0) : 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] truncate">
                {padre ? `${padre.nombres} ${padre.apellidos.split(' ')[0]}` : 'Padre / Apoderado'}
              </p>
              <p className="text-[10px] text-[#6B7280] truncate font-medium">
                {padre?.correo || 'Apoderado'}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <Logout01Icon size={18} />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top trigger button */}
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 bg-white rounded-xl shadow-md border border-[#E5E7EB] text-[#111827] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BE123C]"
          aria-label="Abrir menú"
        >
          <Menu01Icon size={20} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 w-72 bg-white z-50 shadow-2xl border-r border-[#E5E7EB] transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop permanent sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-[#E5E7EB] h-screen sticky top-0 shrink-0 select-none">
        {navContent}
      </aside>
    </>
  );
};
