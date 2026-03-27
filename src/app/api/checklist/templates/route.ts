import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const templates = await prisma.checklistTemplate.findMany({
      where: { userId: user.id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('[GET /api/checklist/templates]', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const { name, phase, isActive, sortOrder, items } = body;

    const template = await prisma.checklistTemplate.create({
      data: {
        userId: user.id,
        name,
        phase: phase ?? 'pre',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        items: {
          create: (items ?? []).map(
            (item: { text: string; category?: string; sortOrder?: number; isActive?: boolean }, index: number) => ({
              text: item.text,
              category: item.category ?? 'General',
              sortOrder: item.sortOrder ?? index,
              isActive: item.isActive ?? true,
            })
          ),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('[POST /api/checklist/templates]', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
