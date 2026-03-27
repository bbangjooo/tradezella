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

interface HourlyStatsProps {
  data: { hour: number; count: number; winRate: number }[];
}

function fillHours(data: HourlyStatsProps['data']) {
  return Array.from({ length: 24 }, (_, h) => {
    const found = data.find((d) => d.hour === h);
    return found ?? { hour: h, count: 0, winRate: 0 };
  });
}

const tooltipStyle = {
  backgroundColor: '#27272a',
  border: '1px solid #3f3f46',
  borderRadius: '8px',
  color: '#fafafa',
  fontSize: 13,
};

export function HourlyStats({ data }: HourlyStatsProps) {
  const filled = fillHours(data);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Trade Count by Hour */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Trades by Hour</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={filled} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tickFormatter={(h: number) => `${h}`}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(h) => `${h}:00 ~ ${Number(h) + 1}:00 KST`}
              labelStyle={{ color: '#d4d4d8' }}
              formatter={(value: unknown) => [`${value} trades`, 'Trades']}
              itemStyle={{ color: '#fafafa' }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {filled.map((entry, index) => (
                <Cell
                  key={`count-${index}`}
                  fill={entry.count > 0 ? '#3b82f6' : '#27272a'}
                  opacity={entry.count > 0 ? 0.8 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Win Rate by Hour */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-3">Win Rate by Hour</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={filled} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tickFormatter={(h: number) => `${h}`}
              interval={2}
            />
            <YAxis
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(h) => `${h}:00 ~ ${Number(h) + 1}:00 KST`}
              labelStyle={{ color: '#d4d4d8' }}
              formatter={(value: unknown) => [`${Number(value).toFixed(1)}%`, 'Win Rate']}
              itemStyle={{ color: '#fafafa' }}
            />
            <Bar dataKey="winRate" radius={[3, 3, 0, 0]}>
              {filled.map((entry, index) => (
                <Cell
                  key={`wr-${index}`}
                  fill={
                    entry.count === 0
                      ? '#27272a'
                      : entry.winRate >= 60
                        ? '#10b981'
                        : entry.winRate >= 50
                          ? '#eab308'
                          : '#ef4444'
                  }
                  opacity={entry.count > 0 ? 0.8 : 0.2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
