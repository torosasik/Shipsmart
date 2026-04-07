import { forwardRef, InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || props.name || Math.random().toString(36).substr(2, 9);

    return (
      <div className="flex items-start">
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`
              w-4 h-4 mt-0.5
              rounded border-gray-300 dark:border-gray-600
              text-ship-accent
              focus:ring-2 focus:ring-ship-accent focus:ring-offset-0
              cursor-pointer
              ${error ? 'border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        
        {label && (
          <label
            htmlFor={checkboxId}
            className="ml-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
