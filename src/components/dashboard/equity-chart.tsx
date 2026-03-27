'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EquityChartProps {
  data: { date: string; equity: number }[];
}

export function EquityChart({ data }: EquityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          formatter={(value: unknown) => [
            `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            'Cumulative P&L',
          ]}
          labelStyle={{ color: '#d4d4d8' }}
          itemStyle={{ color: '#fafafa' }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#equityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
