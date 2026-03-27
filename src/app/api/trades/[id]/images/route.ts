import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trades', tradeId);
    await mkdir(uploadDir, { recursive: true });

    const created = [];

    for (const file of files) {
      const ext = path.extname(file.name) || '';
      const fileName = randomUUID() + ext;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const relativeFilePath = `/uploads/trades/${tradeId}/${fileName}`;

      const image = await prisma.tradeImage.create({
        data: {
          tradeId,
          fileName,
          originalName: file.name,
          filePath: relativeFilePath,
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
