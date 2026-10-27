import React from 'react';
import Link from 'next/link';
import { BookOpen, FolderOpen } from 'lucide-react';

export interface CardCursoProps {
  info: {
    id?: string | number;
    curso: string;
    slug: string;
    docente?: string;
    count: number;
    area?: string;
    codigo?: string;
  };
}

export function CardCurso({ info }: CardCursoProps) {
  const targetHref = `/alumno/materiales/${info.slug || info.id}`;
  const hasFiles = info.count > 0;

  return (
    <Link
      href={targetHref}
      className="flex flex-col text-left p-4 rounded-xl border border-[#E5E7EB] hover:border-[#BE123C] hover:shadow-md transition-all bg-white group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#BE123C]"
    >
      <div className="flex items-start justify-between w-full mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#111827] group-hover:bg-[#BE123C] group-hover:text-white transition-colors">
          {hasFiles ? (
            <FolderOpen className="w-5 h-5 text-current" />
          ) : (
            <BookOpen className="w-5 h-5 text-current" />
          )}
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            hasFiles
              ? 'bg-rose-50 text-[#BE123C] border border-rose-100'
              : 'bg-slate-100 text-[#6B7280]'
          }`}
        >
          {info.count} {info.count === 1 ? 'archivo' : 'archivos'}
        </span>
      </div>
      <h4 className="text-sm font-black text-[#111827] mb-1 group-hover:text-[#BE123C] transition-colors line-clamp-1">
        {info.curso}
      </h4>
      <div className="flex flex-col gap-0.5 mt-auto">
        <span className="text-[11px] text-[#6B7280] font-medium truncate">
          {info.docente || 'Docente titular'}
        </span>
        {info.area && (
          <span className="text-[10px] text-slate-400 font-normal truncate">
            {info.area}
          </span>
        )}
      </div>
    </Link>
  );
}
