'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
} from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Scale,
  Activity,
  BarChart2,
  Wallet,
} from 'lucide-react';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/stat-card';
import { EquityChart } from '@/components/dashboard/equity-chart';
import { DailyPnlChart } from '@/components/dashboard/daily-pnl-chart';
import { LongShortChart } from '@/components/dashboard/long-short-chart';
import { RecentTrades, type RecentTrade } from '@/components/dashboard/recent-trades';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { TopSymbols, type SymbolStat } from '@/components/dashboard/top-symbols';
import { HourlyStats } from '@/components/dashboard/hourly-stats';

function getDateRange(
  period: string,
  customRange: { from: Date | null; to: Date | null }
): { from: string; to: string } {
  const now = new Date();
  const to = endOfDay(now).toISOString();

  switch (period) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to };
    case 'month':
      return { from: startOfMonth(now).toISOString(), to };
    case 'custom':
      return {
        from: customRange.from?.toISOString() ?? '',
        to: customRange.to?.toISOString() ?? to,
      };
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

interface DashboardStats {
  totalPnl: number;
  winRate: number;
  riskRewardRatio: number;
  totalTrades: number;
  maxDrawdown: { value: number; percentage: number };
  profitFactor: number;
  tradesBySide: {
    long: { count: number; pnl: number; winRate: number };
    short: { count: number; pnl: number; winRate: number };
  };
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgHoldTime: number;
  tradesBySymbol: { symbol: string; count: number; pnl: number; winRate: number }[];
  dailyPnl: { date: string; pnl: number; trades: number }[];
  equityCurve: { date: string; equity: number }[];
  hourlyStats: { hour: number; count: number; winRate: number }[];
}

async function fetchApi<T>(url: string, params: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const query = searchParams.toString();
  const fullUrl = query ? `${url}?${query}` : url;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${fullUrl}`);
  return res.json();
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <Skeleton className="h-4 w-24 bg-zinc-800" />
      <Skeleton className="mt-3 h-8 w-32 bg-zinc-800" />
      <Skeleton className="mt-2 h-4 w-16 bg-zinc-800" />
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Skeleton className={`w-full bg-zinc-800`} style={{ height }} />
  );
}

export default function DashboardPage() {
  const period = useAppStore((s) => s.period);
  const customRange = useAppStore((s) => s.dateRange);
  const dateRange = useMemo(() => getDateRange(period, customRange), [period, customRange]);

  const params = useMemo(
    () => ({
      ...(dateRange.from ? { from: dateRange.from, to: dateRange.to } : {}),
    }),
    [dateRange],
  );

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', params],
    queryFn: () => fetchApi<DashboardStats>('/api/dashboard/stats', params),
  });

  const balanceQuery = useQuery({
    queryKey: ['okx', 'balance'],
    queryFn: async () => {
      const res = await fetchApi<{ data: any[] }>('/api/okx/balance', {});
      const details = res.data?.[0]?.details ?? [];
      const totalEq = parseFloat(res.data?.[0]?.totalEq ?? '0');
      return { totalEq, details };
    },
    refetchInterval: 60000, // refresh every minute
  });

  const equityQuery = useQuery({
    queryKey: ['dashboard', 'equity', params],
    queryFn: async () => {
      const res = await fetchApi<{ data: { date: string; equity: number; assetValue?: number }[] }>(
        '/api/dashboard/equity',
        params,
      );
      return res.data;
    },
  });

  const dailyPnlQuery = useQuery({
    queryKey: ['dashboard', 'daily-pnl', params],
    queryFn: async () => {
      const res = await fetchApi<{ data: { date: string; pnl: number; trades: number }[] }>(
        '/api/dashboard/daily-pnl',
        params,
      );
      return res.data;
    },
  });

  const symbolsQuery = useQuery({
    queryKey: ['dashboard', 'symbols', params],
    queryFn: async () => {
      const res = await fetchApi<{ data: SymbolStat[] }>('/api/dashboard/symbols', params);
      return res.data;
    },
  });

  const tradesQuery = useQuery({
    queryKey: ['dashboard', 'recent-trades', params],
    queryFn: async () => {
      const res = await fetchApi<{ data: RecentTrade[] }>('/api/trades', {
        ...params,
        limit: '10',
        sort: 'entryTime',
        order: 'desc',
      });
      return res.data;
    },
  });

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-50">Dashboard</h1>
        <PeriodSelector />
      </div>

      {/* Asset Total Value */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Asset Total Value</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">
              {balanceQuery.isLoading ? (
                <Skeleton className="h-8 w-40 bg-zinc-800" />
              ) : (
                `$${(balanceQuery.data?.totalEq ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stat Cards */}
      {statsQuery.isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total P&L"
            value={stats.totalPnl}
            format="currency"
            icon={<TrendingUp className="h-4 w-4" />}
            info="선택 기간 내 모든 트레이드의 실현 손익 합계 (수수료, 펀딩비 포함)"
          />
          <StatCard
            label="Win Rate"
            value={stats.winRate}
            format="percentage"
            icon={<Target className="h-4 w-4" />}
            info="수익 트레이드 수 ÷ 전체 트레이드 수 × 100"
          />
          <StatCard
            label="R/R Ratio"
            value={`${stats.riskRewardRatio.toFixed(1)}:1`}
            icon={<Scale className="h-4 w-4" />}
            info="평균 수익 ÷ 평균 손실. 1:1 이상이면 수익 트레이드가 손실보다 큼"
          />
          <StatCard
            label="Trades"
            value={stats.totalTrades}
            format="number"
            icon={<Activity className="h-4 w-4" />}
            info="선택 기간 내 완료된 총 트레이드 수"
          />
          <StatCard
            label="Max Drawdown"
            value={stats.maxDrawdown.percentage}
            format="percentage"
            icon={<TrendingDown className="h-4 w-4" />}
            info="누적 자산 곡선에서 고점 대비 최대 하락률. 낮을수록 리스크 관리가 좋음"
          />
          <StatCard
            label="Profit Factor"
            value={!stats.profitFactor || stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            icon={<BarChart2 className="h-4 w-4" />}
            info="총 수익 ÷ 총 손실. 1 이상이면 수익이 손실보다 큼. 2 이상이면 우수"
          />
        </div>
      ) : null}

      {/* Equity Curve - Full width */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {equityQuery.isLoading ? (
            <ChartSkeleton />
          ) : equityQuery.data ? (
            <EquityChart data={equityQuery.data} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-zinc-500">
              No equity data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily P&L + Long/Short Donut - Two columns */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPnlQuery.isLoading ? (
              <ChartSkeleton />
            ) : dailyPnlQuery.data ? (
              <DailyPnlChart data={dailyPnlQuery.data} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-zinc-500">
                No daily P&L data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Long vs Short</CardTitle>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <ChartSkeleton height={260} />
            ) : stats ? (
              <LongShortChart
                longCount={stats.tradesBySide.long.count}
                shortCount={stats.tradesBySide.short.count}
                longWinRate={stats.tradesBySide.long.winRate}
                shortWinRate={stats.tradesBySide.short.winRate}
              />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-zinc-500">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Trading Activity */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Trading Activity by Hour (KST)</CardTitle>
        </CardHeader>
        <CardContent>
          {statsQuery.isLoading ? (
            <ChartSkeleton height={260} />
          ) : stats?.hourlyStats ? (
            <HourlyStats data={stats.hourlyStats} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-zinc-500">
              No data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Symbols + Recent Trades - Two columns */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Top Performing Symbols</CardTitle>
          </CardHeader>
          <CardContent>
            {symbolsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-zinc-800" />
                ))}
              </div>
            ) : symbolsQuery.data ? (
              <TopSymbols symbols={symbolsQuery.data} />
            ) : (
              <div className="py-8 text-center text-zinc-500">No symbol data</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-zinc-50">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-zinc-800" />
                ))}
              </div>
            ) : tradesQuery.data ? (
              <RecentTrades trades={tradesQuery.data} />
            ) : (
              <div className="py-8 text-center text-zinc-500">No trade data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
