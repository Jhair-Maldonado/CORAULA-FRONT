import React from 'react';

interface AlumnoHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle: string;
  className?: string;
  actionRight?: React.ReactNode;
}

export const AlumnoHeader: React.FC<AlumnoHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  className = '',
  actionRight
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2 ${className}`}>
      <div>
        {eyebrow && (
          <span className="text-[8px] font-bold text-[#6B7280] tracking-wider uppercase mb-1 block">
            {eyebrow}
          </span>
        )}
        <h1 className="text-[14px] font-black text-[#111827] uppercase tracking-wider">
          {title}
        </h1>
        <p className="text-[10px] text-[#6B7280] font-medium mt-1">
          {subtitle}
        </p>
      </div>
      {actionRight && (
        <div className="flex-shrink-0">
          {actionRight}
        </div>
      )}
    </div>
  );
};
