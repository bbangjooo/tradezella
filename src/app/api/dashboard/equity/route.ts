import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcEquityCurve } from '@/lib/calculations';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.TradeWhereInput = {};

    if (from || to) {
      where.entryTime = {};
      if (from) where.entryTime.gte = new Date(from);
      if (to) where.entryTime.lte = new Date(to);
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { entryTime: 'asc' },
    });

    const equityCurve = calcEquityCurve(trades);

    // Fetch daily snapshots for asset value overlay
    const snapshotWhere: Prisma.DailySnapshotWhereInput = {};
    if (from || to) {
      snapshotWhere.date = {};
      if (from) snapshotWhere.date.gte = new Date(from);
      if (to) snapshotWhere.date.lte = new Date(to);
    }

    const snapshots = await prisma.dailySnapshot.findMany({
      where: snapshotWhere,
      orderBy: { date: 'asc' },
    });

    const snapshotMap = new Map<string, number>();
    for (const snap of snapshots) {
      const dateKey = snap.date.toISOString().split('T')[0];
      snapshotMap.set(dateKey, snap.totalBalance);
    }

    // Merge: add assetValue to equity curve data points
    const merged = equityCurve.map((point) => ({
      ...point,
      assetValue: snapshotMap.get(point.date) ?? undefined,
    }));

    // Add snapshot dates that don't have trades
    for (const [date, totalBalance] of snapshotMap) {
      if (!merged.find((m) => m.date === date)) {
        merged.push({ date, equity: 0, assetValue: totalBalance });
      }
    }

    merged.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ data: merged });
  } catch (error) {
    console.error('[GET /api/dashboard/equity]', error);
    return NextResponse.json({ error: 'Failed to fetch equity curve' }, { status: 500 });
  }
}
