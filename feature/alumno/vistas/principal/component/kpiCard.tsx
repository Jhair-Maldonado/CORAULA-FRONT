import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: React.ReactNode;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  valueColor?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  valueColor = 'text-[#111827]',
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#6B7280]">
          {title}
        </span>
        <div className={`w-7 h-7 rounded-lg ${iconBgColor} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="my-2">
        <span className={`text-2xl sm:text-[26px] font-extrabold ${valueColor} block leading-none`}>
          {value}
        </span>
      </div>
      {subtitle}
    </div>
  );
}
