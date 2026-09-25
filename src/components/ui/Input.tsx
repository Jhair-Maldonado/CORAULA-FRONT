// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-[#111827]">
            {label}
            {props.required && <span className="text-[#BE123C] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] border rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20 focus:border-[#BE123C] disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#E5E7EB]'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
        {!error && helperText && (
          <span className="text-[11px] text-[#6B7280]">{helperText}</span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-[#111827]">
            {label}
            {props.required && <span className="text-[#BE123C] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] border rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20 focus:border-[#BE123C] disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#E5E7EB]'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
        {!error && helperText && (
          <span className="text-[11px] text-[#6B7280]">{helperText}</span>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-[#111827]">
            {label}
            {props.required && <span className="text-[#BE123C] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`w-full px-3.5 py-2.5 bg-white text-sm text-[#111827] border rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20 focus:border-[#BE123C] disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#E5E7EB]'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
        {!error && helperText && (
          <span className="text-[11px] text-[#6B7280]">{helperText}</span>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
