import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';
import { uploadToR2 } from '@/lib/r2';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params;

    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const imageType = (formData.get('imageType') as string) ?? 'other';
    const caption = (formData.get('caption') as string) ?? null;

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const created = [];

    for (const file of files) {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
      const fileName = randomUUID() + ext;
      const key = `trades/${tradeId}/${fileName}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadToR2(key, buffer, file.type || 'application/octet-stream');

      const image = await prisma.tradeImage.create({
        data: {
          tradeId,
          fileName,
          originalName: file.name,
          filePath: url,
          fileSize: buffer.length,
          mimeType: file.type || 'application/octet-stream',
          imageType,
          caption,
        },
      });

      created.push(image);
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/trades/[id]/images]', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params;

    const images = await prisma.tradeImage.findMany({
      where: { tradeId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: images });
  } catch (error) {
    console.error('[GET /api/trades/[id]/images]', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
