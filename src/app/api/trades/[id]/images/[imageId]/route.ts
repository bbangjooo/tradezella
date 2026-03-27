import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: tradeId, imageId } = await params;

    const image = await prisma.tradeImage.findFirst({
      where: { id: imageId, tradeId },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete file from disk
    try {
      const absolutePath = path.join(process.cwd(), 'public', image.filePath);
      await unlink(absolutePath);
    } catch (fileError) {
      // File may already be missing — log but continue with DB deletion
      console.warn('[DELETE image] Could not delete file:', fileError);
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
    const { id: tradeId, imageId } = await params;
    const body = await request.json();
    const { imageType, caption } = body;

    const existing = await prisma.tradeImage.findFirst({
      where: { id: imageId, tradeId },
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
