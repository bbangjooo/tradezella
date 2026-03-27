import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params;

    const checklists = await prisma.tradeChecklist.findMany({
      where: { tradeId },
      include: {
        checklistItem: {
          select: { id: true, text: true, sortOrder: true, templateId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: checklists });
  } catch (error) {
    console.error('[GET /api/trades/[id]/checklist]', error);
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params;
    const body = await request.json();
    const responses: { checklistItemId: string; response: string }[] = body.responses ?? [];

    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const upserted = await Promise.all(
      responses.map(({ checklistItemId, response }) =>
        prisma.tradeChecklist.upsert({
          where: { tradeId_checklistItemId: { tradeId, checklistItemId } },
          update: { response },
          create: { tradeId, checklistItemId, response },
        })
      )
    );

    return NextResponse.json({ data: upserted });
  } catch (error) {
    console.error('[PUT /api/trades/[id]/checklist]', error);
    return NextResponse.json({ error: 'Failed to save checklist' }, { status: 500 });
  }
}
