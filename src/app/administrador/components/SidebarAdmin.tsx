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
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  Comment01Icon,
  ArrowDown01Icon,
  GridViewIcon,
  Folder01Icon
} from 'hugeicons-react';

type SubItem = {
  name: string;
  path: string;
  icon: any;
};

type MenuItem = {
  name: string;
  path?: string;
  icon: any;
  subItems?: SubItem[];
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', path: '/administrador', icon: DashboardSquare01Icon },
  { name: 'Docentes', path: '/administrador/docentes', icon: TeacherIcon },
  { 
    name: 'Alumnos', 
    icon: UserGroupIcon,
    subItems: [
      { name: 'Dashboard', path: '/administrador/alumnos', icon: GridViewIcon },
      { name: 'Vacantes', path: '/administrador/alumnos/vacantes', icon: Task01Icon },
      { name: 'Alumnado', path: '/administrador/alumnos/alumnado', icon: Folder01Icon },
    ]
  },
  { name: 'Notas', path: '/administrador/notas', icon: Task01Icon },
  { name: 'Matricula', path: '/administrador/matricula', icon: Task01Icon },
  { name: 'Horario', path: '/administrador/horario', icon: Calendar01Icon },
  { name: 'Chat', path: '/administrador/chat', icon: Comment01Icon },
  { name: 'Auditoría', path: '/administrador/auditoria', icon: Shield01Icon },
];

export const SidebarAdmin = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Alumnos']); // Expandido por defecto si tiene subitems

  const toggleExpanded = (name: string) => {
    setExpandedMenus(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <aside className={`relative h-full bg-white border-r border-line flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
      isCollapsed ? 'w-[80px]' : 'w-[240px]'
    }`}>
      
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-8 -right-3.5 w-7 h-7 bg-white border border-line rounded-full flex items-center justify-center text-muted hover:text-ink shadow-sm z-50 transition-transform hover:scale-110"
      >
        {isCollapsed ? <ArrowRight01Icon size={14} /> : <ArrowLeft01Icon size={14} />}
      </button>

      {/* Header */}
      <div className="h-[72px] flex items-center px-6 shrink-0 pt-2">
        <div className={`flex flex-col overflow-hidden whitespace-nowrap transition-opacity duration-300 ${
          isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 flex-1'
        }`}>
          <span className="text-ink font-extrabold text-xl font-sans tracking-tight leading-none">CORAULA</span>
          <span className="text-muted text-[10px] font-bold uppercase tracking-widest mt-1">
            Administrador
          </span>
        </div>
        {/* Placeholder logo when collapsed */}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-extrabold text-xs">
              CA
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto mt-2">
        {MENU_ITEMS.map((item) => {
          
          if (item.subItems) {
            const isActive = item.subItems.some(sub => pathname === sub.path || pathname.startsWith(sub.path + '/'));
            const isExpanded = expandedMenus.includes(item.name) && !isCollapsed;

            return (
              <div key={item.name} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    if (isCollapsed) setIsCollapsed(false);
                    toggleExpanded(item.name);
                  }}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center justify-between rounded-xl transition-colors font-sans w-full ${
                    isCollapsed 
                      ? 'justify-center w-12 h-12 mx-auto px-0' 
                      : 'px-4 h-11'
                  } ${
                    isActive && isCollapsed ? 'bg-neutral text-ink' : 'text-ink hover:bg-neutral'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon 
                      size={isCollapsed ? 22 : 20} 
                      className={`shrink-0 ${isActive && !isCollapsed ? 'text-accent' : isActive && isCollapsed ? 'text-ink' : 'text-muted'}`} 
                    />
                    {!isCollapsed && (
                      <span className={`text-[14px] whitespace-nowrap transition-opacity duration-200 font-bold`}>
                        {item.name}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ArrowDown01Icon 
                      size={14} 
                      className={`text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  )}
                </button>

                {/* Sub-items wrapper with transition */}
                <div 
                  className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out`}
                  style={{
                    maxHeight: isExpanded ? `${item.subItems.length * 44 + 8}px` : '0px',
                    opacity: isExpanded ? 1 : 0
                  }}
                >
                  <div className="pl-11 pr-3 py-1 flex flex-col gap-1">
                    {item.subItems.map(subItem => {
                      const isSubActive = pathname === subItem.path || (subItem.path !== '/administrador/alumnos' && pathname.startsWith(subItem.path));
                      
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.path}
                          className={`flex items-center gap-3 px-3 h-9 rounded-lg transition-colors ${
                            isSubActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-neutral hover:text-ink'
                          }`}
                        >
                          <subItem.icon size={14} className="shrink-0" />
                          <span className={`text-xs whitespace-nowrap ${isSubActive ? 'font-bold' : 'font-semibold'}`}>
                            {subItem.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Normal Item
          const isActive = pathname === item.path || (item.path !== '/administrador' && item.path && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              href={item.path!}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center rounded-xl transition-colors font-sans ${
                isCollapsed 
                  ? 'justify-center w-12 h-12 mx-auto' 
                  : 'px-4 h-11 gap-4'
              } ${
                isActive 
                  ? 'bg-neutral text-ink' 
                  : 'text-ink hover:bg-neutral'
              }`}
            >
              <item.icon 
                size={isCollapsed ? 22 : 20} 
                className={`shrink-0 ${isActive && !isCollapsed ? 'text-accent' : isActive && isCollapsed ? 'text-ink' : 'text-muted'}`} 
              />
              {!isCollapsed && (
                <span className={`text-[14px] whitespace-nowrap transition-opacity duration-200 ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 mt-auto border-t border-line shrink-0 flex items-center transition-all duration-300 ${
        isCollapsed ? 'justify-center' : 'px-6'
      }`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold shrink-0">
              SR
            </div>
            <div className="flex flex-col whitespace-nowrap overflow-hidden">
              <span className="text-ink text-[13px] font-bold">I.E. Santa Rosa</span>
              <span className="text-muted text-[11px]">Administrador</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-bold shrink-0">
            SR
          </div>
        )}
      </div>
    </aside>
  );
};
