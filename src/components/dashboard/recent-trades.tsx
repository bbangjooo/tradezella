import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface RecentTrade {
  id: string;
  entryTime: string;
  symbol: string;
  side: string;
  entryPrice: number;
  exitPrice: number | null;
  netPnl: number;
  holdDuration: number | null;
}

interface RecentTradesProps {
  trades: RecentTrade[];
}

function formatHoldTime(seconds: number | null): string {
  if (seconds == null) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPnl(pnl: number | null): string {
  if (pnl == null) return '-';
  const prefix = pnl >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(pnl).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Date</TableHead>
          <TableHead className="text-zinc-400">Symbol</TableHead>
          <TableHead className="text-zinc-400">Side</TableHead>
          <TableHead className="text-zinc-400 text-right">Entry</TableHead>
          <TableHead className="text-zinc-400 text-right">Exit</TableHead>
          <TableHead className="text-zinc-400 text-right">P&L</TableHead>
          <TableHead className="text-zinc-400 text-right">Hold Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id} className="border-zinc-800">
            <TableCell className="text-zinc-300 text-sm">
              {new Date(trade.entryTime).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
              })}
            </TableCell>
            <TableCell className="font-medium text-zinc-50 font-mono">
              {trade.symbol}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  'inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium',
                  trade.side.toLowerCase() === 'long'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-violet-500/10 text-violet-500',
                )}
              >
                {trade.side.toLowerCase() === 'long' ? 'Long' : 'Short'}
              </span>
            </TableCell>
            <TableCell className="text-right font-mono text-zinc-300 tabular-nums">
              ${formatPrice(trade.entryPrice)}
            </TableCell>
            <TableCell className="text-right font-mono text-zinc-300 tabular-nums">
              {trade.exitPrice != null ? `$${formatPrice(trade.exitPrice)}` : '-'}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-mono font-semibold tabular-nums',
                trade.netPnl > 0
                  ? 'text-emerald-500'
                  : trade.netPnl < 0
                    ? 'text-red-500'
                    : 'text-zinc-400',
              )}
            >
              {formatPnl(trade.netPnl)}
            </TableCell>
            <TableCell className="text-right text-zinc-400">
              {formatHoldTime(trade.holdDuration)}
            </TableCell>
          </TableRow>
        ))}
        {trades.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
              No recent trades
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
