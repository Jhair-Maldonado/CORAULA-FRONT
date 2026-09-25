// src/components/ui/Modal.tsx
'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative w-full ${widthStyles[maxWidth]} bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-[#111827]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BE123C]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
