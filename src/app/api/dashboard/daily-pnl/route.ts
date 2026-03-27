import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calcDailyPnl } from '@/lib/calculations';
import { Prisma } from '@prisma/client';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.TradeWhereInput = { userId: user.id };

    if (from || to) {
      where.entryTime = {};
      if (from) where.entryTime.gte = new Date(from);
      if (to) where.entryTime.lte = new Date(to);
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { entryTime: 'asc' },
    });

    const dailyPnl = calcDailyPnl(trades);

    return NextResponse.json({ data: dailyPnl });
  } catch (error) {
    console.error('[GET /api/dashboard/daily-pnl]', error);
    return NextResponse.json({ error: 'Failed to fetch daily P&L' }, { status: 500 });
  }
}
