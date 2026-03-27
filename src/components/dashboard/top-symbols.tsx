import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface SymbolStat {
  symbol: string;
  count: number;
  winRate: number;
  pnl: number;
}

interface TopSymbolsProps {
  symbols: SymbolStat[];
}

export function TopSymbols({ symbols }: TopSymbolsProps) {
  const sorted = [...symbols].sort((a, b) => b.pnl - a.pnl);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">Symbol</TableHead>
          <TableHead className="text-zinc-400 text-right">Trades</TableHead>
          <TableHead className="text-zinc-400 text-right">Win Rate</TableHead>
          <TableHead className="text-zinc-400 text-right">P&L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((s) => (
          <TableRow key={s.symbol} className="border-zinc-800">
            <TableCell className="font-medium text-zinc-50 font-mono">
              {s.symbol}
            </TableCell>
            <TableCell className="text-right text-zinc-300 font-mono tabular-nums">
              {s.count}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-mono tabular-nums',
                s.winRate >= 60
                  ? 'text-emerald-500'
                  : s.winRate <= 50
                    ? 'text-red-500'
                    : 'text-zinc-300',
              )}
            >
              {s.winRate.toFixed(1)}%
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-mono font-semibold tabular-nums',
                s.pnl > 0
                  ? 'text-emerald-500'
                  : s.pnl < 0
                    ? 'text-red-500'
                    : 'text-zinc-400',
              )}
            >
              {s.pnl >= 0 ? '+' : '-'}$
              {Math.abs(s.pnl).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </TableCell>
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-zinc-500 py-8">
              No symbol data
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
