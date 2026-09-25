// src/components/alumno/AlumnoHeader.tsx
import React from 'react';

interface AlumnoHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  className?: string;
}

export const AlumnoHeader: React.FC<AlumnoHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-bold text-[#6B7280] tracking-wider uppercase">
        {eyebrow}
      </span>
      <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-xs sm:text-[13px] text-[#6B7280] font-normal leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};
