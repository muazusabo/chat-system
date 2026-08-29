// components/ui/Button.tsx
import { Spinner } from './Spinner';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'outline';
}

// Neumorphic raised button. `variant` is kept for API compatibility with
// existing callers, but all variants read as "raised" on the shared
// #e6e6e6 surface — a bordered/ghost look doesn't really exist in this
// soft-UI language, so outline/ghost fall back to a lighter shadow instead
// of disappearing entirely.
export function Button({
  loading,
  variant = 'primary',
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'relative flex w-full items-center justify-center gap-2 rounded-[15px] bg-[#e6e6e6] px-4 py-3.5 text-sm font-bold tracking-widest text-neutral-700 transition-shadow duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none';

  const shadows = {
    primary: '5px 5px 10px #c8c8c8, -5px -5px 10px #ffffff',
    outline: '3px 3px 6px #c8c8c8, -3px -3px 6px #ffffff',
    ghost: '2px 2px 4px #c8c8c8, -2px -2px 4px #ffffff',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${className}`}
      style={{ boxShadow: shadows[variant] }}
      {...props}
    >
      {loading ? <Spinner size={18} className="text-neutral-600" /> : children}
    </button>
  );
}