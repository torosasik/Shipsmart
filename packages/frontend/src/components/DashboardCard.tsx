import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}: DashboardCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="ml-1 text-xs text-gray-400">vs last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-ship-light rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}