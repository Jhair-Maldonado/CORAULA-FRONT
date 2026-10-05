'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  Notification01Icon,
  Comment01Icon,
  Logout01Icon,
  AlertCircleIcon,
} from 'hugeicons-react';
import { usePadre } from '@/components/padres/PadreContext'; 
import { AuthContext } from '@/contexts/AuthContext';

type MenuItem = {
  name: string;
  path: string;
  icon: any;
  badge?: string | number;
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'Ficha', path: '/padre', icon: DashboardSquare01Icon },
  { name: 'Hijos', path: '/padre/hijos', icon: UserGroupIcon },
  { name: 'Chats', path: '/padre/mensajeria', icon: Comment01Icon, badge: 1 },
  { name: 'Justificar', path: '/padre/justificacion', icon: AlertCircleIcon, badge: '1' },
  { name: 'Avisos', path: '/padre/avisos', icon: Notification01Icon, badge: 2 },
];

export const PadreSidebar: React.FC = () => {
  const pathname = usePathname();
  const { padre } = usePadre();
  const authContext = useContext(AuthContext);

  const handleLogout = () => {
    authContext?.logout();
  };

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
            const isActive = item.path === '/padre'
              ? pathname === '/padre'
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
          {padre && (
            <div className="flex flex-col items-center justify-center gap-1 p-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase overflow-hidden">
                {padre.nombres.charAt(0)}{padre.apellidos.charAt(0)}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-muted hover:bg-accent-soft hover:text-accent transition-all group"
            title="Cerrar sesión"
          >
            <Logout01Icon size={20} className="group-hover:text-accent" />
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
           <Notification01Icon size={20} />
         </button>
      </div>
    </>
  );
};
