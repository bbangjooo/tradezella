import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcAllStats, calcHourlyStats } from '@/lib/calculations';
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

    const stats = calcAllStats(trades);
    const hourlyStats = calcHourlyStats(trades);

    return NextResponse.json({ ...stats, hourlyStats });
  } catch (error) {
    console.error('[GET /api/dashboard/stats]', error);
    return NextResponse.json({ error: 'Failed to calculate stats' }, { status: 500 });
  }
}
