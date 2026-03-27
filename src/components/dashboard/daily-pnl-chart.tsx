'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DailyPnlChartProps {
  data: { date: string; pnl: number; trades: number }[];
}

export function DailyPnlChart({ data }: DailyPnlChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#27272a' }}
        />
        <YAxis
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#27272a',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            color: '#fafafa',
            fontSize: 13,
          }}
          formatter={(value, name) => {
            const num = Number(value);
            if (name === 'pnl') {
              const prefix = num >= 0 ? '+' : '-';
              return [
                `${prefix}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                'P&L',
              ];
            }
            return [value, name];
          }}
          labelStyle={{ color: '#d4d4d8' }}
          itemStyle={{ color: '#fafafa' }}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
