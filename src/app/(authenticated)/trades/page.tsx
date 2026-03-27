'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ArrowUpDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  netPnl: number;
  entryTime: string;
  exitTime: string | null;
  checklists?: { response: string }[];
}

interface TradesResponse {
  data: Trade[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function formatHoldTime(entryTime: string, exitTime: string): string {
  const ms = new Date(exitTime).getTime() - new Date(entryTime).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

type SortField = 'entryTime' | 'symbol' | 'side' | 'entryPrice' | 'exitPrice' | 'pnl';

export default function TradesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState('all');
  const [result, setResult] = useState('all');
  const [dateFrom, setDateFrom] = useState('2026-03-26');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('entryTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  const filters = { symbol, side, result, dateFrom, dateTo, page, sortField, sortOrder };

  const { data, isLoading } = useQuery({
    queryKey: ['trades', filters],
    queryFn: async (): Promise<TradesResponse> => {
      const params = new URLSearchParams();
      if (symbol) params.set('symbol', symbol);
      if (side !== 'all') params.set('side', side);
      if (result !== 'all') params.set('result', result);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sort', sortField);
      params.set('order', sortOrder);
      const res = await fetch(`/api/trades?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch trades');
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/okx/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Trades synced successfully');
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync trades');
    },
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  }

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-50">Trades</h1>
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
          />
          Sync
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Symbol</span>
          <Input
            placeholder="e.g. BTC-USDT"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              setPage(1);
            }}
            className="w-40 bg-zinc-900 border-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Side</span>
          <Select value={side} onValueChange={(val) => { if (val) { setSide(val); setPage(1); } }}>
            <SelectTrigger className="w-28 bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Result</span>
          <Select value={result} onValueChange={(val) => { if (val) { setResult(val); setPage(1); } }}>
            <SelectTrigger className="w-28 bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="win">Win</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">From</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-40 bg-zinc-900 border-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">To</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-40 bg-zinc-900 border-zinc-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead>
                <button onClick={() => handleSort('entryTime')} className="inline-flex items-center gap-1">
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('symbol')} className="inline-flex items-center gap-1">
                  Symbol <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('side')} className="inline-flex items-center gap-1">
                  Side <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('entryPrice')} className="inline-flex items-center gap-1">
                  Entry <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('exitPrice')} className="inline-flex items-center gap-1">
                  Exit <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('pnl')} className="inline-flex items-center gap-1">
                  P&L <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Hold Time</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20 bg-zinc-800" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((trade) => (
                  <TableRow
                    key={trade.id}
                    className="border-zinc-800 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                    onClick={() => router.push(`/trades/${trade.id}`)}
                  >
                    <TableCell className="text-zinc-300">
                      {format(new Date(trade.entryTime), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-50">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          trade.side === 'long'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-violet-500/20 text-violet-400'
                        }
                      >
                        {trade.side === 'long' ? 'Long' : 'Short'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      ${trade.entryPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      ${trade.exitPrice?.toLocaleString() ?? '-'}
                    </TableCell>
                    <TableCell
                      className={
                        trade.netPnl >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'
                      }
                    >
                      {trade.netPnl >= 0 ? '+' : ''}
                      ${trade.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {trade.exitTime ? formatHoldTime(trade.entryTime, trade.exitTime) : '-'}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {trade.checklists && trade.checklists.length > 0
                        ? `${trade.checklists.filter(c => c.response === 'yes').length}/${trade.checklists.length}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && data?.data.length === 0 && (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={9} className="py-12 text-center text-zinc-500">
                  No trades found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
