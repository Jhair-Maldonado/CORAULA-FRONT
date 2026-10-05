// src/components/alumno/AlumnoFilterBar.tsx
import React from 'react';
import { Badge } from '@/components/ui/Badge';

export interface FilterOption {
  label: string;
  value: string;
  options?: string[];
  onChange?: (val: string) => void;
}

interface AlumnoFilterBarProps {
  filters: FilterOption[];
  badgeText: string;
  badgeVariant?: 'accent' | 'success' | 'warning' | 'neutral';
  className?: string;
}

export const AlumnoFilterBar: React.FC<AlumnoFilterBarProps> = ({
  filters,
  badgeText,
  badgeVariant = 'accent',
  className = ''
}) => {
  return (
    <div
      className={`w-full flex flex-wrap items-center justify-between gap-4 py-1 min-h-[44px] ${className}`}
    >
      {/* Filters Left */}
      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
        {filters.map((f, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-[#6B7280]">
              {f.label}
            </span>
            {f.options && f.onChange ? (
              <select
                value={f.value}
                onChange={(e) => f.onChange?.(e.target.value)}
                className="bg-transparent text-[13px] font-bold text-[#111827] cursor-pointer outline-none hover:text-[#BE123C] focus:ring-1 focus:ring-[#BE123C]/30 rounded pr-1"
              >
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[13px] font-bold text-[#111827] flex items-center gap-1 cursor-default">
                {f.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Badge Right */}
      <div className="shrink-0">
        <Badge variant={badgeVariant} size="md">
          {badgeText}
        </Badge>
      </div>
    </div>
  );
};
