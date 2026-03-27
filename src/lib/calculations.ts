import { format } from 'date-fns';

export interface Trade {
  realizedPnl: number;
  fee: number;
  fundingFee: number;
  netPnl: number;
  entryTime: Date | string;
  exitTime?: Date | string | null;
  holdDuration?: number | null; // seconds
  side: string;
  symbol: string;
  status: string;
}

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  riskRewardRatio: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: { value: number; percentage: number };
  maxWinStreak: number;
  maxLossStreak: number;
  avgHoldTime: number;
  tradesBySymbol: { symbol: string; count: number; pnl: number; winRate: number }[];
  tradesBySide: {
    long: { count: number; pnl: number; winRate: number };
    short: { count: number; pnl: number; winRate: number };
  };
  dailyPnl: { date: string; pnl: number; trades: number }[];
  equityCurve: { date: string; equity: number }[];
}

// Sort trades by entryTime ascending
function sortByEntryTime(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const aTime = new Date(a.entryTime).getTime();
    const bTime = new Date(b.entryTime).getTime();
    return aTime - bTime;
  });
}

function isWin(trade: Trade): boolean {
  return trade.netPnl > 0;
}

function isLoss(trade: Trade): boolean {
  return trade.netPnl < 0;
}

export function calcWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter(isWin).length;
  return (wins / trades.length) * 100;
}

export function calcTotalPnl(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + t.netPnl, 0);
}

export function calcAverageWin(trades: Trade[]): number {
  const wins = trades.filter(isWin);
  if (wins.length === 0) return 0;
  return wins.reduce((sum, t) => sum + t.netPnl, 0) / wins.length;
}

export function calcAverageLoss(trades: Trade[]): number {
  const losses = trades.filter(isLoss);
  if (losses.length === 0) return 0;
  // Return as positive value representing magnitude
  return Math.abs(losses.reduce((sum, t) => sum + t.netPnl, 0) / losses.length);
}

export function calcRiskRewardRatio(trades: Trade[]): number {
  const avgWin = calcAverageWin(trades);
  const avgLoss = calcAverageLoss(trades);
  if (avgLoss === 0) return 0;
  return avgWin / avgLoss;
}

export function calcExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winRate = calcWinRate(trades) / 100;
  const lossRate = 1 - winRate;
  const avgWin = calcAverageWin(trades);
  const avgLoss = calcAverageLoss(trades);
  return winRate * avgWin - lossRate * avgLoss;
}

export function calcProfitFactor(trades: Trade[]): number {
  const totalProfit = trades.filter(isWin).reduce((sum, t) => sum + t.netPnl, 0);
  const totalLoss = Math.abs(trades.filter(isLoss).reduce((sum, t) => sum + t.netPnl, 0));
  if (totalLoss === 0) return 0;
  return totalProfit / totalLoss;
}

export function calcMaxDrawdown(trades: Trade[]): { value: number; percentage: number } {
  const sorted = sortByEntryTime(trades);
  if (sorted.length === 0) return { value: 0, percentage: 0 };

  let equity = 0;
  let peak = 0;
  let maxDrawdownValue = 0;
  let maxDrawdownPct = 0;

  for (const trade of sorted) {
    equity += trade.netPnl;
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = peak - equity;
    if (drawdown > maxDrawdownValue) {
      maxDrawdownValue = drawdown;
      maxDrawdownPct = peak !== 0 ? (drawdown / peak) * 100 : 0;
    }
  }

  return { value: maxDrawdownValue, percentage: maxDrawdownPct };
}

export function calcMaxWinStreak(trades: Trade[]): number {
  const sorted = sortByEntryTime(trades);
  let maxStreak = 0;
  let current = 0;
  for (const trade of sorted) {
    if (isWin(trade)) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

export function calcMaxLossStreak(trades: Trade[]): number {
  const sorted = sortByEntryTime(trades);
  let maxStreak = 0;
  let current = 0;
  for (const trade of sorted) {
    if (isLoss(trade)) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

export function calcAvgHoldTime(trades: Trade[]): number {
  const withDuration = trades.filter(
    (t) => t.holdDuration != null && t.holdDuration > 0
  );
  if (withDuration.length === 0) return 0;
  const total = withDuration.reduce((sum, t) => sum + (t.holdDuration ?? 0), 0);
  return total / withDuration.length;
}

export function calcTradesBySymbol(
  trades: Trade[]
): { symbol: string; count: number; pnl: number; winRate: number }[] {
  const map = new Map<string, { count: number; pnl: number; wins: number }>();

  for (const trade of trades) {
    const entry = map.get(trade.symbol) ?? { count: 0, pnl: 0, wins: 0 };
    entry.count++;
    entry.pnl += trade.netPnl;
    if (isWin(trade)) entry.wins++;
    map.set(trade.symbol, entry);
  }

  return Array.from(map.entries())
    .map(([symbol, data]) => ({
      symbol,
      count: data.count,
      pnl: data.pnl,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function calcTradesBySide(trades: Trade[]): {
  long: { count: number; pnl: number; winRate: number };
  short: { count: number; pnl: number; winRate: number };
} {
  const longTrades = trades.filter((t) => t.side.toLowerCase() === 'long');
  const shortTrades = trades.filter((t) => t.side.toLowerCase() === 'short');

  const calcSide = (group: Trade[]) => ({
    count: group.length,
    pnl: group.reduce((sum, t) => sum + t.netPnl, 0),
    winRate: group.length > 0 ? (group.filter(isWin).length / group.length) * 100 : 0,
  });

  return {
    long: calcSide(longTrades),
    short: calcSide(shortTrades),
  };
}

export function calcDailyPnl(
  trades: Trade[]
): { date: string; pnl: number; trades: number }[] {
  const map = new Map<string, { pnl: number; trades: number }>();

  for (const trade of trades) {
    const date = format(new Date(trade.entryTime), 'yyyy-MM-dd');
    const entry = map.get(date) ?? { pnl: 0, trades: 0 };
    entry.pnl += trade.netPnl;
    entry.trades++;
    map.set(date, entry);
  }

  return Array.from(map.entries())
    .map(([date, data]) => ({ date, pnl: data.pnl, trades: data.trades }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calcEquityCurve(
  trades: Trade[]
): { date: string; equity: number }[] {
  const sorted = sortByEntryTime(trades);
  let equity = 0;
  const result: { date: string; equity: number }[] = [];

  for (const trade of sorted) {
    equity += trade.netPnl;
    const date = format(new Date(trade.entryTime), 'yyyy-MM-dd');
    result.push({ date, equity });
  }

  return result;
}

export function calcHourlyStats(
  trades: Trade[]
): { hour: number; count: number; winRate: number }[] {
  const map = new Map<number, { count: number; wins: number }>();
  for (const trade of trades) {
    const hour = new Date(trade.entryTime).getHours();
    const entry = map.get(hour) ?? { count: 0, wins: 0 };
    entry.count++;
    if (isWin(trade)) entry.wins++;
    map.set(hour, entry);
  }
  return Array.from(map.entries())
    .map(([hour, data]) => ({
      hour,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function calcAllStats(trades: Trade[]): DashboardStats {
  return {
    totalTrades: trades.length,
    winRate: calcWinRate(trades),
    totalPnl: calcTotalPnl(trades),
    averageWin: calcAverageWin(trades),
    averageLoss: calcAverageLoss(trades),
    riskRewardRatio: calcRiskRewardRatio(trades),
    expectancy: calcExpectancy(trades),
    profitFactor: calcProfitFactor(trades),
    maxDrawdown: calcMaxDrawdown(trades),
    maxWinStreak: calcMaxWinStreak(trades),
    maxLossStreak: calcMaxLossStreak(trades),
    avgHoldTime: calcAvgHoldTime(trades),
    tradesBySymbol: calcTradesBySymbol(trades),
    tradesBySide: calcTradesBySide(trades),
    dailyPnl: calcDailyPnl(trades),
    equityCurve: calcEquityCurve(trades),
  };
}
