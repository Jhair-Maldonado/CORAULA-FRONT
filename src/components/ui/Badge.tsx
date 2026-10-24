// src/components/ui/Badge.tsx
import React from 'react';

export type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: 'bg-[#FFE4E6] text-[#BE123C] border border-[#FECDD3]',
  success: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
  warning: 'bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]',
  danger: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
  neutral: 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]',
  info: 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full tracking-wide transition-colors ${sizeClasses} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
