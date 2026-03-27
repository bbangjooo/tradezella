'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LongShortChartProps {
  longCount: number;
  shortCount: number;
  longWinRate?: number;
  shortWinRate?: number;
}

const COLORS = ['#3b82f6', '#8b5cf6'];

export function LongShortChart({ longCount, shortCount, longWinRate, shortWinRate }: LongShortChartProps) {
  const total = longCount + shortCount;
  const data = [
    { name: 'Long', value: longCount },
    { name: 'Short', value: shortCount },
  ];

  const longPct = total > 0 ? ((longCount / total) * 100).toFixed(1) : '0.0';
  const shortPct = total > 0 ? ((shortCount / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            stroke="none"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              color: '#fafafa',
              fontSize: 13,
            }}
            formatter={(value, name) => [
              `${value} trades`,
              String(name),
            ]}
          />
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-50 text-2xl font-bold font-mono"
          >
            {total}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-400 text-xs"
          >
            trades
          </text>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-6 mt-2">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm text-zinc-400">
              Long {longPct}%
            </span>
          </div>
          {longWinRate != null && (
            <span className="text-xs font-mono text-zinc-500">
              Win {longWinRate.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-violet-500" />
            <span className="text-sm text-zinc-400">
              Short {shortPct}%
            </span>
          </div>
          {shortWinRate != null && (
            <span className="text-xs font-mono text-zinc-500">
              Win {shortWinRate.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
