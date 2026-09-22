'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  DashboardSquare01Icon, 
  TeacherIcon, 
  UserGroupIcon, 
  Task01Icon, 
  Shield01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Comment01Icon,
  ArrowDown01Icon,
  GridViewIcon,
  Folder01Icon,
  UserAdd01Icon,
  LicenseIcon,
  Menu01Icon,
  BookOpen01Icon,
  
} from 'hugeicons-react';

type SubItem = {
  name: string;
  path: string;
  badge?: string | number;
};

type MenuItem = {
  name: string;
  path?: string;
  icon: any;
  badge?: string | number;
  subItems?: SubItem[];
};

type MenuSection = {
  sectionTitle: string;
  items: MenuItem[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    sectionTitle: 'Principal',
    items: [
      { name: 'Dashboard', path: '/administrador', icon: DashboardSquare01Icon },
    ]
  },
  {
    sectionTitle: 'Académico',
    items: [
      { name: 'Docentes', path: '/administrador/docentes', icon: TeacherIcon },
      { name: 'Alumnos', path: '/administrador/alumnos', icon: UserGroupIcon },
      { name: 'Cursos', path: '/administrador/cursos', icon: BookOpen01Icon },
      { name: 'Horarios', path: '/administrador/horario', icon: Calendar01Icon },
      { name: 'Notas', path: '/administrador/notas', icon: Task01Icon },
    ]
  },
  {
    sectionTitle: 'Administrativo',
    items: [
      { name: 'Matrícula', path: '/administrador/matricula', icon: LicenseIcon },
      { name: 'Vacantes', path: '/administrador/vacantes', icon: UserAdd01Icon, badge: 12 },
    ]
  },
  {
    sectionTitle: 'Sistema',
    items: [
      { name: 'Auditoría', path: '/administrador/auditoria', icon: Shield01Icon },
      { name: 'Chat', path: '/administrador/chat', icon: Comment01Icon, badge: 3 },
    ]
  }
];

export const SidebarAdmin = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleExpanded = (name: string) => {
    setExpandedMenus(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <aside className={`relative h-screen bg-white border-r border-line flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
      isCollapsed ? 'w-[72px]' : 'w-[230px]'
    }`}>
      
      {/* Header Estilo Minimalista (Shopall style) */}
      <div className={`h-16 flex items-center justify-between px-4 shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-2.5">
          {/* Logo Icono */}
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-xs shrink-0 font-extrabold text-sm tracking-tight">
            C
          </div>

          {!isCollapsed && (
            <span className="text-ink font-black text-lg tracking-tight">
              CORAULA
            </span>
          )}
        </div>

        {/* Botón Collapse « » */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-7 h-7 rounded-lg hover:bg-neutral flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer ${
            isCollapsed ? 'mt-2' : ''
          }`}
          title={isCollapsed ? "Expandir sidebar" : "Contraer sidebar"}
        >
          {isCollapsed ? (
            <span className="text-xs font-bold font-mono">»</span>
          ) : (
            <span className="text-xs font-bold font-mono">«</span>
          )}
        </button>
      </div>

      {/* Selector de Plantel / Sede Minimalista */}
      <div className="px-3 mb-2 relative z-20">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-neutral/60 border border-line/60 hover:bg-neutral transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded-lg bg-accent text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                S
              </div>
              <div className="flex flex-col truncate">
                <span className="text-ink text-xs font-bold truncate leading-tight">Sede Central</span>
                <span className="text-muted text-[10px] font-medium leading-tight">Santa Rosa</span>
              </div>
            </div>
            <ArrowDown01Icon size={12} className="text-muted shrink-0 ml-1" />
          </div>
        ) : (
          <div className="relative group flex justify-center">
            <div className="w-8 h-8 rounded-xl bg-neutral/80 border border-line flex items-center justify-center text-accent font-bold text-xs cursor-pointer">
              S
            </div>
            {/* Globo Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-ink" />
              <div className="bg-ink text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                Sede Central · Santa Rosa
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navegación por Secciones (sin overflow recortante) */}
      <nav className="flex-1 flex flex-col gap-4 px-3 py-2 overflow-y-visible">
        {MENU_SECTIONS.map((section) => (
          <div key={section.sectionTitle} className="flex flex-col gap-0.5">
            
            {/* Título de Sección */}
            {!isCollapsed ? (
              <span className="px-2 text-[10px] font-bold text-muted/70 uppercase tracking-wider mb-1">
                {section.sectionTitle}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-muted/60 text-center tracking-wider mb-1 truncate px-0.5">
                {section.sectionTitle.slice(0, 4)}
              </span>
            )}

            {/* Items */}
            {section.items.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/administrador' && item.path && pathname.startsWith(item.path));
              
              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.path!}
                    className={`flex items-center justify-between rounded-xl transition-all font-sans text-xs relative ${
                      isCollapsed 
                        ? 'justify-center w-9 h-9 mx-auto' 
                        : 'px-2.5 h-8.5'
                    } ${
                      isActive 
                        ? 'bg-accent/10 text-accent font-extrabold' 
                        : 'text-ink hover:bg-neutral/70 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon 
                        size={16} 
                        className={`shrink-0 ${isActive ? 'text-accent' : 'text-muted'}`} 
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>

                    {/* Indicador o Badge */}
                    {!isCollapsed && (
                      <div className="flex items-center gap-1">
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isActive ? 'bg-accent text-white' : 'text-muted bg-neutral border border-line/40'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && !item.badge && (
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        )}
                      </div>
                    )}

                    {/* Indicador de punto activo cuando está colapsado */}
                    {isCollapsed && isActive && (
                      <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </Link>

                  {/* Globo / Tooltip flotante visible en colapsado */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                      {/* Flechita del globo */}
                      <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-ink" />
                      {/* Cuerpo del globo */}
                      <div className="bg-ink text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="bg-accent text-white text-[9px] px-1.5 py-0.2 rounded-md font-extrabold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / Usuario Estilo Shopall */}
      <div className="p-3 border-t border-line shrink-0 relative z-20">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-accent-soft text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20">
                HG
              </div>
              <div className="flex flex-col truncate">
                <span className="text-ink text-xs font-bold truncate leading-tight">Hecham GAZHI</span>
                <span className="text-muted text-[10px] truncate leading-tight">admin@coraula.edu.pe</span>
              </div>
            </div>
            <ArrowDown01Icon size={12} className="text-muted shrink-0 ml-1" />
          </div>
        ) : (
          <div className="relative group flex justify-center">
            <div className="w-7 h-7 rounded-full bg-accent-soft text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20 cursor-pointer">
              HG
            </div>
            {/* Globo Tooltip para Perfil */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-ink" />
              <div className="bg-ink text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl flex flex-col">
                <span>Hecham GAZHI</span>
                <span className="text-[9px] text-white/70 font-normal">admin@coraula.edu.pe</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </aside>
  );
};
