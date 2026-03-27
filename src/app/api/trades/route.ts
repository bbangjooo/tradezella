import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const symbol = searchParams.get('symbol');
    const side = searchParams.get('side');
    const result = searchParams.get('result'); // "win" | "loss"
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sort = searchParams.get('sort') ?? 'entryTime';
    const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';

    const where: Prisma.TradeWhereInput = {};

    if (symbol) where.symbol = symbol;
    if (side) where.side = side;

    if (result === 'win') where.netPnl = { gt: 0 };
    else if (result === 'loss') where.netPnl = { lt: 0 };

    if (from || to) {
      where.entryTime = {};
      if (from) where.entryTime.gte = new Date(from);
      if (to) where.entryTime.lte = new Date(to);
    }

    const allowedSortFields = [
      'entryTime', 'exitTime', 'symbol', 'side', 'netPnl',
      'realizedPnl', 'quantity', 'leverage', 'createdAt',
    ];
    const sortField = allowedSortFields.includes(sort) ? sort : 'entryTime';
    const orderBy: Prisma.TradeOrderByWithRelationInput = { [sortField]: order };

    const skip = (page - 1) * limit;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          checklists: { select: { response: true } },
        },
      }),
      prisma.trade.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: trades,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[GET /api/trades]', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}
