import { useEffect } from 'react';
import { useToastStore, ToastType } from '../../stores/useToastStore';

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-200',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
}

export function Toast({ id, type, message }: ToastProps) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg
        transform transition-all duration-300 ease-in-out
        animate-slide-in
        ${styles[type]}
      `}
    >
      <span className={`text-xl font-bold ${iconStyles[type]}`} aria-hidden="true">
        {icons[type]}
      </span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => removeToast(id)}
        className="p-1 hover:opacity-70 transition-opacity rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
