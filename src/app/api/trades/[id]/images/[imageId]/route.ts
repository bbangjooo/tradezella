import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteFromR2 } from '@/lib/r2';
import { getAuthUser, unauthorized } from '@/lib/get-user';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { id: tradeId, imageId } = await params;

    const image = await prisma.tradeImage.findFirst({
      where: { id: imageId, tradeId, trade: { userId: user.id } },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Extract R2 key from filePath URL or use stored fileName
    const key = `trades/${tradeId}/${image.fileName}`;
    try {
      await deleteFromR2(key);
    } catch (err) {
      console.warn('[DELETE image] Could not delete from R2:', err);
    }

    await prisma.tradeImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/trades/[id]/images/[imageId]]', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorized();

    const { id: tradeId, imageId } = await params;
    const body = await request.json();
    const { imageType, caption } = body;

    const existing = await prisma.tradeImage.findFirst({
      where: { id: imageId, tradeId, trade: { userId: user.id } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (imageType !== undefined) data.imageType = imageType;
    if (caption !== undefined) data.caption = caption;

    const image = await prisma.tradeImage.update({
      where: { id: imageId },
      data,
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error('[PATCH /api/trades/[id]/images/[imageId]]', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}
