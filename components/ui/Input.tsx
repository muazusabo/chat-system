// components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// Neumorphic "pressed in" field — the label becomes the placeholder visually
// (kept as a real <label> for accessibility, just visually hidden) to match
// the soft-UI login/register mockup.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, placeholder, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          placeholder={placeholder ?? label}
          className={`w-full rounded-[15px] border-none bg-[#e6e6e6] px-5 py-3.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-500 ${className}`}
          style={{ boxShadow: 'inset 5px 5px 10px #c8c8c8, inset -5px -5px 10px #ffffff' }}
          {...props}
        />
        {error && <p className="pl-2 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';