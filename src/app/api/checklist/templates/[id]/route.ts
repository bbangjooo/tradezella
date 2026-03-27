import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phase, isActive, sortOrder, items } = body;

    const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Replace all items: delete existing, create new ones
    await prisma.checklistItem.deleteMany({ where: { templateId: id } });

    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phase !== undefined && { phase }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
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

    return NextResponse.json(template);
  } catch (error) {
    console.error('[PUT /api/checklist/templates/[id]]', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.checklistTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/checklist/templates/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
