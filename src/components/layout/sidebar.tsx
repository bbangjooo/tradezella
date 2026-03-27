'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, LayoutDashboard, History, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/trades', label: 'Trades', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const isConnected = !!(settings?.okxApiKey);

  return (
    <aside className="flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-zinc-800">
        <TrendingUp className="w-6 h-6 text-emerald-400" />
        <span className="text-lg font-bold text-white">TradeZella</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* OKX Connection Status */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-zinc-400">
            {isConnected ? 'OKX Connected' : 'OKX Not Connected'}
          </span>
        </div>
      </div>
    </aside>
  );
}
