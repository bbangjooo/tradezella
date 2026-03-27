import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { id } = await params;

    const trade = await prisma.trade.findFirst({
      where: { id, userId: user.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        checklists: {
          include: { checklistItem: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error('[GET /api/trades/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { notes, tags } = body;

    const existing = await prisma.trade.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (notes !== undefined) data.notes = notes;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags;

    const trade = await prisma.trade.update({
      where: { id },
      data,
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error('[PATCH /api/trades/[id]]', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { id } = await params;

    const existing = await prisma.trade.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    await prisma.trade.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/trades/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
