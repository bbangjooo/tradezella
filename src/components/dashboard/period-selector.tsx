'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useAppStore, type AppStore } from '@/lib/store';

const periods: { value: AppStore['period']; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
];

function toLocalDateString(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PeriodSelector() {
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const dateRange = useAppStore((s) => s.dateRange);
  const setDateRange = useAppStore((s) => s.setDateRange);

  const [fromStr, setFromStr] = useState(toLocalDateString(dateRange.from));
  const [toStr, setToStr] = useState(toLocalDateString(dateRange.to));

  function handleFromChange(value: string) {
    setFromStr(value);
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      setDateRange({ ...dateRange, from: new Date(y, m - 1, d, 0, 0, 0) });
    } else {
      setDateRange({ ...dateRange, from: null });
    }
  }

  function handleToChange(value: string) {
    setToStr(value);
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      setDateRange({ ...dateRange, to: new Date(y, m - 1, d, 23, 59, 59) });
    } else {
      setDateRange({ ...dateRange, to: null });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Tabs
        value={period}
        onValueChange={(value: string | number | null) =>
          setPeriod(value as AppStore['period'])
        }
      >
        <TabsList className="bg-zinc-800">
          {periods.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromStr}
            onChange={(e) => handleFromChange(e.target.value)}
            className="h-8 w-[140px] bg-zinc-800 border-zinc-700 text-sm"
          />
          <span className="text-zinc-500 text-sm">~</span>
          <Input
            type="date"
            value={toStr}
            onChange={(e) => handleToChange(e.target.value)}
            className="h-8 w-[140px] bg-zinc-800 border-zinc-700 text-sm"
          />
        </div>
      )}
    </div>
  );
}
