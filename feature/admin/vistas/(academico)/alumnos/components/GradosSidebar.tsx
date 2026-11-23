'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircleIcon, ArrowDown01Icon, ArrowRight01Icon, BookOpen01Icon, Folder01Icon, FolderOpenIcon } from 'hugeicons-react';
import { gradeKeyOfSection } from '@/adapters/vacancyAdapter';
import { useGradeTree, type GradeTreeStatus } from '@/hooks/useGradeTree';
import type { GradeNode, LevelNode, SectionNode } from '@/types/gradeTree';

const ALL_STUDENTS = '/administrador/alumnos';
const focusClass = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
/** Para filas dentro del acordeón (overflow-hidden): el contorno va hacia adentro para no recortarse. */
const focusInsetClass = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';

/** Id de la sección que muestra la ruta (`grado/[id]`, también dentro de `grado/[id]/estudiante/[x]`), o null. */
function sectionIdFromPath(pathname: string | null): number | null {
  const id = /^\/administrador\/alumnos\/grado\/(\d+)(?:\/|$)/.exec(pathname ?? '')?.[1];
  return id !== undefined && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null;
}

export interface GradosPanelProps {
  estado: GradeTreeStatus;
  tree: LevelNode[];
  /** Sección que muestra la ruta actual (resalta su fila y expande su grado). */
  activeSectionId: number | null;
  /** Mensaje de error ya saneado (estados `error`, `forbidden` y `no-period`). */
  mensaje?: string | null;
  /** «Ver todo alumnado» activo (ruta `/administrador/alumnos`). */
  todoActivo?: boolean;
  onRetry: () => void;
}

function SectionRow({ section, active }: { section: SectionNode; active: boolean }) {
  return (
    <Link
      href={section.href}
      aria-current={active ? 'page' : undefined}
      title={section.nombre}
      // NOTA: hoy el backend no envía secciones inactivas en /vacancies; el atenuado queda listo por si las incluye.
      className={`w-full flex items-center justify-between gap-2 px-4 py-2 ml-2 rounded-lg text-[12px] transition-all relative ${focusInsetClass} ${
        active ? 'bg-accent-soft text-accent font-bold' : 'text-muted hover:bg-neutral hover:text-ink font-medium'
      } ${section.activa ? '' : 'opacity-60'}`}
    >
      {active && <div aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent rounded-r-full" />}
      <div className="flex items-center gap-2 min-w-0">
        <div aria-hidden="true" className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
          active ? 'bg-accent text-white' : 'bg-white border border-line text-ink'
        }`}>{section.letra}</div>
        <span className="truncate">{section.nombre}</span>
        {!section.activa && <span className="text-[9px] font-bold shrink-0">Inactiva</span>}
      </div>
      <span aria-hidden="true" className={`text-[10px] font-bold shrink-0 ${active ? 'text-accent' : 'text-muted/60'}`}>{section.ocupacion}</span>
      <span className="sr-only">{section.ocupacionAria}</span>
    </Link>
  );
}

function GradeItem({ grade, expanded, hasActive, activeSectionId, onToggle }: {
  grade: GradeNode; expanded: boolean; hasActive: boolean; activeSectionId: number | null; onToggle: () => void;
}) {
  const panelId = `grados-${grade.key.replace(/\W/g, '-')}`;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        title={grade.etiqueta}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-all ${focusClass} ${
          hasActive ? 'bg-accent/10 text-accent font-bold border border-accent/20' : expanded ? 'bg-neutral text-ink' : 'text-muted hover:bg-neutral hover:text-ink'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasActive || expanded ? <FolderOpenIcon size={18} aria-hidden="true" className="text-accent shrink-0" /> : <Folder01Icon size={18} aria-hidden="true" className="shrink-0" />}
          <span className={`text-[13px] truncate ${hasActive || expanded ? 'font-bold' : 'font-semibold'}`}>{grade.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {grade.matriculados > 0 && !expanded && (
            <span title={`${grade.matriculados} alumnos matriculados`} className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded shadow-sm text-ink border border-line">{grade.matriculados}</span>
          )}
          {expanded ? <ArrowDown01Icon size={16} aria-hidden="true" /> : <ArrowRight01Icon size={16} aria-hidden="true" />}
        </div>
      </button>
      {/* `inert` evita que las filas colapsadas reciban foco o las lea un lector de pantalla. */}
      <div id={panelId} inert={!expanded} className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[500px] mt-1' : 'max-h-0'}`}>
        {grade.secciones.map(section => <SectionRow key={section.id} section={section} active={section.id === activeSectionId} />)}
      </div>
    </div>
  );
}

/**
 * Panel «Niveles y Grados — Secciones del plantel»: árbol por grado con la ocupación de cada sección y el enlace
 * «Ver todo alumnado». Es puro (solo recibe datos): la carga la hace `GradosSidebar`.
 */
export function GradosPanel({ estado, tree, activeSectionId, mensaje, todoActivo = false, onRetry }: GradosPanelProps) {
  const activeKey = gradeKeyOfSection(tree, activeSectionId);
  // `anchor` recuerda en qué grado activo se eligió: al navegar a otro grado la elección caduca y se expande el nuevo.
  const [choice, setChoice] = useState<{ anchor: string | null; key: string | null }>();
  const expandedKey = choice && choice.anchor === activeKey ? choice.key : activeKey ?? tree[0]?.grados[0]?.key ?? null;
  const ready = estado === 'ready' && tree.length > 0;

  return (
    <nav aria-label="Niveles y grados" className="w-[190px] h-full bg-white border-r border-line py-4 flex flex-col gap-3 shrink-0 overflow-y-auto font-sans">
      <div className="px-3 mb-1">
        <h2 className="text-ink text-xs font-bold flex items-center gap-1.5">
          <BookOpen01Icon size={15} aria-hidden="true" className="text-accent" />
          Niveles y Grados
        </h2>
        <p className="text-muted text-[10px] font-medium mt-0.5 mb-2">Secciones del plantel</p>
        <Link
          href={ALL_STUDENTS}
          aria-current={todoActivo ? 'page' : undefined}
          className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${focusClass} ${
            todoActivo ? 'bg-accent text-white border-accent shadow-xs' : 'bg-neutral text-ink border-line/60 hover:bg-neutral/80'
          }`}
        >
          Ver todo alumnado
        </Link>
      </div>

      {estado === 'loading' && (
        <div role="status" aria-label="Cargando grados" className="flex flex-col gap-3 px-3">
          {[0, 1, 2].map(row => <div key={row} aria-hidden="true" className="h-9 rounded-lg bg-neutral animate-pulse" />)}
        </div>
      )}
      {(estado === 'error' || estado === 'forbidden') && (
        <div role="alert" className="mx-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
          <p className="flex items-start gap-1.5 break-words font-medium"><AlertCircleIcon size={14} aria-hidden="true" className="shrink-0" />{mensaje}</p>
          {estado === 'error' && <button type="button" onClick={onRetry} className={`mt-2 min-h-10 px-3 py-2 rounded-lg bg-white border border-line text-ink font-bold hover:bg-neutral ${focusClass}`}>Reintentar</button>}
        </div>
      )}
      {estado === 'no-period' && <p role="status" className="mx-3 text-muted text-[11px] font-medium">{mensaje ?? 'No hay un periodo académico vigente.'}</p>}
      {estado === 'ready' && tree.length === 0 && <p role="status" className="mx-3 text-muted text-[11px] font-medium">No hay secciones activas en el periodo vigente.</p>}

      {ready && tree.map(level => (
        <section key={level.nivel ?? 'OTHER'} aria-label={level.etiqueta} className="flex flex-col gap-3 px-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">{level.etiqueta}</h3>
          {level.grados.map(grade => (
            <GradeItem
              key={grade.key}
              grade={grade}
              expanded={expandedKey === grade.key}
              hasActive={activeKey === grade.key}
              activeSectionId={activeSectionId}
              onToggle={() => setChoice({ anchor: activeKey, key: expandedKey === grade.key ? null : grade.key })}
            />
          ))}
        </section>
      ))}
    </nav>
  );
}

/** Contenedor del panel: carga el árbol del periodo vigente y resalta la sección de la ruta actual. */
export function GradosSidebar() {
  const pathname = usePathname();
  const { status, tree, error, retry } = useGradeTree();
  return (
    <GradosPanel
      estado={status}
      tree={tree}
      activeSectionId={sectionIdFromPath(pathname)}
      mensaje={error}
      todoActivo={(pathname ?? '').replace(/\/$/, '') === ALL_STUDENTS}
      onRetry={retry}
    />
  );
}
