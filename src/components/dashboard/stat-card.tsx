import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: number;
  format?: 'currency' | 'percentage' | 'number' | 'time';
  info?: string;
  className?: string;
}

function formatValue(value: string | number, format?: StatCardProps['format']): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency': {
      const abs = Math.abs(value);
      const formatted = abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return value >= 0 ? `$${formatted}` : `-$${formatted}`;
    }
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'time': {
      const totalSeconds = Math.abs(value);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    case 'number':
    default:
      return typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
  }
}

function getValueColor(value: string | number, format?: StatCardProps['format']): string {
  if (format === 'currency' && typeof value === 'number') {
    if (value > 0) return 'text-emerald-500';
    if (value < 0) return 'text-red-500';
  }
  return 'text-zinc-50';
}

export function StatCard({ label, value, icon, change, format, info, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900 p-6',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-zinc-400">{label}</span>
          {info && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[240px] bg-zinc-800 border-zinc-700 text-zinc-200 text-xs"
                >
                  {info}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>
      <div className="mt-2">
        <span
          className={cn(
            'text-2xl font-bold font-mono tabular-nums',
            getValueColor(value, format),
          )}
        >
          {formatValue(value, format)}
        </span>
      </div>
      {change !== undefined && (
        <div className="mt-1">
          <span
            className={cn(
              'inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium font-mono',
              change > 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : change < 0
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-zinc-500/10 text-zinc-400',
            )}
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
