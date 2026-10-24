import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export interface CardCursoProps {
  info: {
    curso: string;
    slug: string;
    docente: string;
    count: number;
  };
}

export function CardCurso({ info }: CardCursoProps) {
  return (
    <Link
      href={`/alumno/materiales/${info.slug}`}
      className="flex flex-col text-left p-4 rounded-xl border border-[#E5E7EB] hover:border-[#111827] hover:shadow-md transition-all bg-white group cursor-pointer"
    >
      <div className="flex items-start justify-between w-full mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#111827] group-hover:bg-[#111827] group-hover:text-white transition-colors">
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold bg-slate-100 text-[#111827] px-2 py-1 rounded-full">
          {info.count} {info.count === 1 ? 'archivo' : 'archivos'}
        </span>
      </div>
      <h4 className="text-sm font-black text-[#111827] mb-1">{info.curso}</h4>
      <span className="text-[11px] text-[#6B7280] font-medium">{info.docente}</span>
    </Link>
  );
}
